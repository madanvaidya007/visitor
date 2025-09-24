-- Create email system tables directly
-- This migration creates the necessary tables for the email notification system

-- Create email_settings table
CREATE TABLE IF NOT EXISTS public.email_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_username VARCHAR(255) NOT NULL,
    smtp_password VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL DEFAULT 'Access Manager',
    use_tls BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_type)
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    template_type VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create email_queue table
CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    template_type VARCHAR(50),
    priority INTEGER DEFAULT 5,
    max_attempts INTEGER DEFAULT 3,
    attempts INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_for ON public.email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON public.email_queue(priority);

-- Insert default email templates
INSERT INTO public.email_templates (template_type, name, subject, html_content, variables) VALUES
('visitor_invitation', 'Visitor Invitation', 'Welcome to {{company_name}} - Your Visit Details', 
'<html><body><h2>Welcome to {{company_name}}</h2><p>Dear {{visitor_name}},</p><p>You have been invited to visit our facility. Here are your visit details:</p><ul><li><strong>Host:</strong> {{host_name}}</li><li><strong>Date:</strong> {{visit_date}}</li><li><strong>Time:</strong> {{visit_time}}</li></ul><p>Please arrive at the main reception and mention your host''s name.</p><p>Best regards,<br>{{company_name}} Team</p></body></html>',
'["visitor_name", "host_name", "company_name", "visit_date", "visit_time"]'),

('host_notification', 'Host Notification', 'New Visitor Arrival - {{visitor_name}}',
'<html><body><h2>Visitor Notification</h2><p>Dear {{host_name}},</p><p>Your visitor has arrived:</p><ul><li><strong>Visitor:</strong> {{visitor_name}}</li><li><strong>Company:</strong> {{visitor_company}}</li><li><strong>Arrival Time:</strong> {{arrival_time}}</li></ul><p>Please proceed to the reception area to meet your visitor.</p><p>Best regards,<br>Security Team</p></body></html>',
'["host_name", "visitor_name", "visitor_company", "arrival_time"]'),

('admin_alert', 'Admin Alert', 'System Alert - {{alert_type}}',
'<html><body><h2>System Alert</h2><p>Dear Administrator,</p><p>A system alert has been triggered:</p><ul><li><strong>Alert Type:</strong> {{alert_type}}</li><li><strong>Severity:</strong> {{severity}}</li><li><strong>Message:</strong> {{message}}</li><li><strong>Time:</strong> {{timestamp}}</li></ul><p>Please review and take appropriate action if necessary.</p><p>Best regards,<br>Access Manager System</p></body></html>',
'["alert_type", "severity", "message", "timestamp"]')
ON CONFLICT (template_type) DO NOTHING;

-- Enable RLS (Row Level Security) if needed
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_settings' AND policyname = 'Allow authenticated users to read email settings') THEN
        CREATE POLICY "Allow authenticated users to read email settings" ON public.email_settings FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_settings' AND policyname = 'Allow authenticated users to update email settings') THEN
        CREATE POLICY "Allow authenticated users to update email settings" ON public.email_settings FOR UPDATE TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_templates' AND policyname = 'Allow authenticated users to read email templates') THEN
        CREATE POLICY "Allow authenticated users to read email templates" ON public.email_templates FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Allow authenticated users to read email logs') THEN
        CREATE POLICY "Allow authenticated users to read email logs" ON public.email_logs FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Allow authenticated users to insert email logs') THEN
        CREATE POLICY "Allow authenticated users to insert email logs" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_queue' AND policyname = 'Allow authenticated users to read email queue') THEN
        CREATE POLICY "Allow authenticated users to read email queue" ON public.email_queue FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_queue' AND policyname = 'Allow authenticated users to insert email queue') THEN
        CREATE POLICY "Allow authenticated users to insert email queue" ON public.email_queue FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_queue' AND policyname = 'Allow authenticated users to update email queue') THEN
        CREATE POLICY "Allow authenticated users to update email queue" ON public.email_queue FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;