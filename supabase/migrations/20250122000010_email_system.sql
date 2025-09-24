-- Email Settings Table
CREATE TABLE IF NOT EXISTS public.email_settings (
    id TEXT PRIMARY KEY DEFAULT '1',
    api_key TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT NOT NULL DEFAULT 'Visitor Management System',
    reply_to TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Email Logs Table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Optional foreign key relationships
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    visit_request_id UUID REFERENCES public.visit_requests(id) ON DELETE SET NULL,
    
    -- Metadata for additional context
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Email Templates Table for customizable templates
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names used in template
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Email Queue Table for reliable email delivery
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1 = highest, 10 = lowest
    max_attempts INTEGER NOT NULL DEFAULT 3,
    attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'cancelled')),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Optional relationships
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    visit_request_id UUID REFERENCES public.visit_requests(id) ON DELETE SET NULL,
    
    -- Metadata for additional context
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_visit_request ON public.email_logs(visit_request_id);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON public.email_queue(priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON public.email_queue(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(is_active);

-- RLS Policies
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Email Settings Policies (Admin only)
CREATE POLICY "Admin can manage email settings" ON public.email_settings
    FOR ALL USING (true);

-- Email Logs Policies
CREATE POLICY "Admin can view all email logs" ON public.email_logs
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own email logs" ON public.email_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert email logs" ON public.email_logs
    FOR INSERT WITH CHECK (true);

-- Email Templates Policies
CREATE POLICY "Admin can manage email templates" ON public.email_templates
    FOR ALL USING (true);

CREATE POLICY "All users can view active templates" ON public.email_templates
    FOR SELECT USING (is_active = true);

-- Email Queue Policies
CREATE POLICY "Admin can manage email queue" ON public.email_queue
    FOR ALL USING (true);

CREATE POLICY "System can manage email queue" ON public.email_queue
    FOR ALL WITH CHECK (true);

-- Insert default email templates
INSERT INTO public.email_templates (template_type, name, subject, html_content, variables) VALUES
('visitor_invitation', 'Visitor Invitation', 'Invitation to Visit {{company}} - {{visitDate}}', 
'<h1>You are invited to visit {{company}}</h1><p>Hello {{visitorName}}, you have been invited by {{hostName}} to visit on {{visitDate}} from {{startTime}} to {{endTime}}.</p>', 
'["visitorName", "hostName", "company", "visitDate", "startTime", "endTime", "purpose", "zone"]'),

('visit_approved', 'Visit Approved', 'Visit Approved - {{company}} on {{visitDate}}', 
'<h1>Your visit has been approved!</h1><p>Hello {{visitorName}}, your visit to {{company}} has been approved by {{approvedBy}}.</p>', 
'["visitorName", "company", "visitDate", "startTime", "endTime", "approvedBy", "qrCode"]'),

('host_notification', 'Host Notification', 'Visitor Update: {{visitorName}}', 
'<h1>Visitor {{action}}</h1><p>{{visitorName}} has {{action}} for their visit on {{visitDate}}.</p>', 
'["hostName", "visitorName", "action", "visitDate", "time", "zone"]'),

('admin_alert', 'Admin Alert', '{{severity}}: {{title}}', 
'<h1>System Alert</h1><p><strong>{{title}}</strong></p><p>{{message}}</p><p>Severity: {{severity}}</p>', 
'["alertType", "title", "message", "severity", "timestamp", "location"]')

ON CONFLICT (template_type) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    variables = EXCLUDED.variables,
    updated_at = timezone('utc'::text, now());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_email_settings_updated_at 
    BEFORE UPDATE ON public.email_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON public.email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_queue_updated_at 
    BEFORE UPDATE ON public.email_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log email sends
CREATE OR REPLACE FUNCTION log_email_send(
    p_template_type TEXT,
    p_recipient_email TEXT,
    p_recipient_name TEXT DEFAULT NULL,
    p_subject TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'sent',
    p_message_id TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_visit_request_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.email_logs (
        template_type,
        recipient_email,
        recipient_name,
        subject,
        status,
        message_id,
        error_message,
        sent_at,
        user_id,
        visit_request_id,
        metadata
    ) VALUES (
        p_template_type,
        p_recipient_email,
        p_recipient_name,
        p_subject,
        p_status,
        p_message_id,
        p_error_message,
        CASE WHEN p_status = 'sent' THEN timezone('utc'::text, now()) ELSE NULL END,
        p_user_id,
        p_visit_request_id,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue email for sending
CREATE OR REPLACE FUNCTION queue_email(
    p_template_type TEXT,
    p_recipient_email TEXT,
    p_recipient_name TEXT DEFAULT NULL,
    p_subject TEXT DEFAULT NULL,
    p_html_content TEXT DEFAULT NULL,
    p_priority INTEGER DEFAULT 5,
    p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_visit_request_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    queue_id UUID;
BEGIN
    INSERT INTO public.email_queue (
        template_type,
        recipient_email,
        recipient_name,
        subject,
        html_content,
        priority,
        scheduled_for,
        user_id,
        visit_request_id,
        metadata
    ) VALUES (
        p_template_type,
        p_recipient_email,
        p_recipient_name,
        p_subject,
        p_html_content,
        p_priority,
        COALESCE(p_scheduled_for, timezone('utc'::text, now())),
        p_user_id,
        p_visit_request_id,
        p_metadata
    ) RETURNING id INTO queue_id;
    
    RETURN queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;