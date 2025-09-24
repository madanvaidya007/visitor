import { createTransporter, validateSMTPConfig, smtpConfig } from '../config/smtpConfig';
import type { Transporter } from 'nodemailer';
import { digitalPassService, type VisitorPassData } from './digitalPassService';

// Email configuration interface
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

// Email template types
export type EmailTemplate = 
  | 'visitor_invitation'
  | 'visit_approved'
  | 'visit_rejected'
  | 'visit_reminder'
  | 'host_notification'
  | 'admin_alert'
  | 'emergency_notification'
  | 'visitor_checkin'
  | 'visitor_checkout'
  | 'digital_pass'
  | 'pass_reminder';

// Email data interfaces
export interface VisitorInvitationData {
  visitorName: string;
  hostName: string;
  company: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  zone: string;
  qrCode?: string;
  notes?: string;
}

export interface VisitApprovalData {
  visitorName: string;
  hostName: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  zone: string;
  qrCode: string;
  approvedBy: string;
}

export interface HostNotificationData {
  hostName: string;
  visitorName: string;
  company?: string;
  action: 'request' | 'checkin' | 'checkout';
  visitDate: string;
  time: string;
  zone: string;
  purpose?: string;
}

export interface AdminAlertData {
  alertType: 'security' | 'system' | 'emergency';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  location?: string;
  actionRequired?: boolean;
}

// Email service class
class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  // Initialize the email service with SMTP configuration
  initialize(config?: EmailConfig): void {
    try {
      if (!validateSMTPConfig()) {
        console.error('EmailService: Invalid SMTP configuration');
        return;
      }

      this.transporter = createTransporter();
      this.config = config || {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        user: smtpConfig.auth.user,
        pass: smtpConfig.auth.pass,
        fromEmail: smtpConfig.from.email,
        fromName: smtpConfig.from.name,
      };
      
      console.log('EmailService: Successfully initialized with SMTP');
    } catch (error) {
      console.error('EmailService: Failed to initialize:', error);
    }
  }

  // Check if service is initialized
  private ensureInitialized(): void {
    if (!this.transporter || !this.config) {
      this.initialize();
    }
  }

  // Send visitor invitation email
  async sendVisitorInvitation(
    to: string,
    data: VisitorInvitationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.ensureInitialized();
    
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not properly initialized' };
    }

    try {
      const subject = `Invitation to Visit ${data.company} - ${data.visitDate}`;
      const html = this.generateVisitorInvitationTemplate(data);

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        subject,
        html,
        replyTo: this.config.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('EmailService: Visitor invitation sent successfully:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('EmailService: Failed to send visitor invitation:', error);
      return { success: false, error: error.message };
    }
  }

  // Send visit approval notification
  async sendVisitApproval(
    to: string,
    data: VisitApprovalData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.ensureInitialized();
    
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not properly initialized' };
    }

    try {
      const subject = `Visit Approved - ${data.visitDate}`;
      const html = this.generateVisitApprovalTemplate(data);

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        subject,
        html,
        replyTo: this.config.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('EmailService: Visit approval sent successfully:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('EmailService: Failed to send visit approval:', error);
      return { success: false, error: error.message };
    }
  }

  // Send host notification
  async sendHostNotification(
    to: string,
    data: HostNotificationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.ensureInitialized();
    
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not properly initialized' };
    }

    try {
      const subject = this.getHostNotificationSubject(data);
      const html = this.generateHostNotificationTemplate(data);

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        subject,
        html,
        replyTo: this.config.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('EmailService: Host notification sent successfully:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('EmailService: Failed to send host notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send admin alert
  async sendAdminAlert(
    to: string | string[],
    data: AdminAlertData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.ensureInitialized();
    
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not properly initialized' };
    }

    try {
      const subject = `${data.severity.toUpperCase()}: ${data.title}`;
      const html = this.generateAdminAlertTemplate(data);
      const recipients = Array.isArray(to) ? to.join(', ') : to;

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: recipients,
        subject,
        html,
        replyTo: this.config.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('EmailService: Admin alert sent successfully:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('EmailService: Failed to send admin alert:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate visitor invitation email template
  private generateVisitorInvitationTemplate(data: VisitorInvitationData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visit Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .qr-section { text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎫 Visit Invitation</h1>
            <p>You're invited to visit ${data.company}</p>
          </div>
          
          <div class="content">
            <div class="card">
              <h2>Hello ${data.visitorName},</h2>
              <p>You have been invited by <strong>${data.hostName}</strong> to visit <strong>${data.company}</strong>.</p>
              
              <h3>📅 Visit Details</h3>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${data.visitDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${data.startTime} - ${data.endTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Purpose:</span>
                <span class="detail-value">${data.purpose}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Zone/Location:</span>
                <span class="detail-value">${data.zone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Host:</span>
                <span class="detail-value">${data.hostName}</span>
              </div>
              ${data.notes ? `
              <div class="detail-row">
                <span class="detail-label">Notes:</span>
                <span class="detail-value">${data.notes}</span>
              </div>
              ` : ''}
            </div>

            ${data.qrCode ? `
            <div class="card qr-section">
              <h3>🔗 Your Access Pass</h3>
              <p>Present this QR code at the reception for quick check-in:</p>
              <img src="${data.qrCode}" alt="QR Code" style="max-width: 200px; margin: 10px 0;">
              <p><small>Save this email or take a screenshot for easy access</small></p>
            </div>
            ` : ''}

            <div class="card">
              <h3>📋 What to Bring</h3>
              <ul>
                <li>Valid government-issued photo ID</li>
                <li>This email confirmation</li>
                <li>Any required documents mentioned by your host</li>
              </ul>
            </div>

            <div class="card">
              <h3>🚗 Arrival Instructions</h3>
              <p>Please arrive at the main reception and present your ID along with this invitation. Our security team will guide you to the designated zone.</p>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated message from the Visitor Management System.</p>
            <p>If you have any questions, please contact your host directly.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Generate visit approval email template
  private generateVisitApprovalTemplate(data: VisitApprovalData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visit Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .qr-section { text-align: center; margin: 20px 0; background: #f8fafc; padding: 20px; border-radius: 8px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Visit Approved!</h1>
            <p>Your visit request has been approved</p>
          </div>
          
          <div class="content">
            <div class="card">
              <div class="success-badge">APPROVED</div>
              <h2>Hello ${data.visitorName},</h2>
              <p>Great news! Your visit request to <strong>${data.company}</strong> has been approved by <strong>${data.approvedBy}</strong>.</p>
              
              <h3>📅 Confirmed Visit Details</h3>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${data.visitDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${data.startTime} - ${data.endTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Purpose:</span>
                <span class="detail-value">${data.purpose}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Zone/Location:</span>
                <span class="detail-value">${data.zone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Host:</span>
                <span class="detail-value">${data.hostName}</span>
              </div>
            </div>

            <div class="card qr-section">
              <h3>🎫 Your Digital Pass</h3>
              <p><strong>Present this QR code at reception for instant check-in:</strong></p>
              <img src="${data.qrCode}" alt="Approved Visit QR Code" style="max-width: 200px; margin: 15px 0;">
              <p><small>💡 Tip: Save this to your phone's photos for quick access</small></p>
            </div>

            <div class="card">
              <h3>⚡ Quick Check-in Process</h3>
              <ol>
                <li>Arrive at the main reception</li>
                <li>Show your government-issued photo ID</li>
                <li>Present this QR code</li>
                <li>Receive your visitor badge and directions</li>
              </ol>
            </div>

            <div class="card">
              <h3>📱 Need Help?</h3>
              <p>If you have any questions or need to modify your visit, please contact your host <strong>${data.hostName}</strong> directly.</p>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated confirmation from the Visitor Management System.</p>
            <p>Please keep this email for your records.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Generate host notification email template
  private generateHostNotificationTemplate(data: HostNotificationData): string {
    const actionText = {
      request: 'has requested a visit',
      checkin: 'has checked in',
      checkout: 'has checked out'
    };

    const actionIcon = {
      request: '📝',
      checkin: '✅',
      checkout: '👋'
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Visitor ${data.action.charAt(0).toUpperCase() + data.action.slice(1)} Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .action-badge { padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
            .request { background: #fef3c7; color: #92400e; }
            .checkin { background: #d1fae5; color: #065f46; }
            .checkout { background: #fee2e2; color: #991b1b; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${actionIcon[data.action]} Visitor ${data.action.charAt(0).toUpperCase() + data.action.slice(1)}</h1>
            <p>Notification for ${data.hostName}</p>
          </div>
          
          <div class="content">
            <div class="card">
              <div class="action-badge ${data.action}">
                ${data.action.toUpperCase()}
              </div>
              <h2>Hello ${data.hostName},</h2>
              <p><strong>${data.visitorName}</strong> ${actionText[data.action]}.</p>
              
              <h3>📋 Details</h3>
              <div class="detail-row">
                <span class="detail-label">Visitor:</span>
                <span class="detail-value">${data.visitorName}</span>
              </div>
              ${data.company ? `
              <div class="detail-row">
                <span class="detail-label">Company:</span>
                <span class="detail-value">${data.company}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${data.visitDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${data.time}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Zone:</span>
                <span class="detail-value">${data.zone}</span>
              </div>
              ${data.purpose ? `
              <div class="detail-row">
                <span class="detail-label">Purpose:</span>
                <span class="detail-value">${data.purpose}</span>
              </div>
              ` : ''}
            </div>

            ${data.action === 'request' ? `
            <div class="card">
              <h3>⏰ Action Required</h3>
              <p>Please review and approve/reject this visit request in your dashboard.</p>
            </div>
            ` : ''}

            ${data.action === 'checkin' ? `
            <div class="card">
              <h3>🎯 Next Steps</h3>
              <p>Your visitor has successfully checked in. You may want to meet them at the reception or designated meeting area.</p>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>This is an automated notification from the Visitor Management System.</p>
            <p>Log in to your dashboard for more details and actions.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Generate admin alert email template
  private generateAdminAlertTemplate(data: AdminAlertData): string {
    const severityColors = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    };

    const severityIcons = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴'
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>System Alert - ${data.severity.toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${severityColors[data.severity]}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .severity-badge { background: ${severityColors[data.severity]}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .message-box { background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${severityColors[data.severity]}; }
            .action-required { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${severityIcons[data.severity]} System Alert</h1>
            <p>${data.severity.toUpperCase()} Priority</p>
          </div>
          
          <div class="content">
            <div class="card">
              <div class="severity-badge">
                ${data.severity.toUpperCase()} SEVERITY
              </div>
              <h2>${data.title}</h2>
              
              <div class="message-box">
                <p><strong>Alert Message:</strong></p>
                <p>${data.message}</p>
              </div>
              
              <h3>📋 Alert Details</h3>
              <div class="detail-row">
                <span class="detail-label">Alert Type:</span>
                <span class="detail-value">${data.alertType.charAt(0).toUpperCase() + data.alertType.slice(1)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Severity:</span>
                <span class="detail-value">${data.severity.toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Timestamp:</span>
                <span class="detail-value">${data.timestamp}</span>
              </div>
              ${data.location ? `
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${data.location}</span>
              </div>
              ` : ''}
            </div>

            ${data.actionRequired ? `
            <div class="action-required">
              <h3>⚡ Immediate Action Required</h3>
              <p>This alert requires immediate attention from the administrative team. Please log in to the admin dashboard to review and take appropriate action.</p>
            </div>
            ` : ''}

            <div class="card">
              <h3>🔧 Recommended Actions</h3>
              <ul>
                <li>Log in to the admin dashboard immediately</li>
                <li>Review the full alert details and context</li>
                <li>Take appropriate corrective measures</li>
                <li>Document the resolution for future reference</li>
                ${data.alertType === 'security' ? '<li>Consider notifying security personnel if necessary</li>' : ''}
                ${data.alertType === 'emergency' ? '<li>Follow emergency response protocols</li>' : ''}
              </ul>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated alert from the Visitor Management System.</p>
            <p>Please do not reply to this email. Use the admin dashboard for all actions.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Get appropriate subject for host notifications
  private getHostNotificationSubject(data: HostNotificationData): string {
    switch (data.action) {
      case 'request':
        return `New Visit Request from ${data.visitorName}`;
      case 'checkin':
        return `${data.visitorName} has checked in`;
      case 'checkout':
        return `${data.visitorName} has checked out`;
      default:
        return `Visitor Update: ${data.visitorName}`;
    }
  }

  // Test email configuration
  async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();
    
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not properly initialized' };
    }

    try {
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: this.config.fromEmail, // Send to self for testing
        subject: 'Email Service Test - Configuration Verified',
        html: `
          <h2>Email Service Test</h2>
          <p>This is a test email to verify your SMTP configuration is working correctly.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>Host: ${this.config.host}:${this.config.port}</li>
            <li>From Email: ${this.config.fromEmail}</li>
            <li>From Name: ${this.config.fromName}</li>
            <li>Reply To: ${this.config.replyTo || 'Not set'}</li>
          </ul>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `,
        replyTo: this.config.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('EmailService: Test email sent successfully:', info.messageId);
      
      return { success: true };
    } catch (error: any) {
      console.error('EmailService: Email configuration test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send digital pass to visitor
  async sendDigitalPass(
    to: string,
    passData: VisitorPassData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.ensureInitialized();
    
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not properly initialized' };
    }

    try {
      // Validate pass data
      const validationErrors = digitalPassService.validatePassData(passData);
      if (validationErrors.length > 0) {
        return { success: false, error: `Invalid pass data: ${validationErrors.join(', ')}` };
      }

      // Generate QR code
      const qrCodeDataURL = await digitalPassService.generateQRCode(passData);
      
      // Generate digital pass HTML
      const passHTML = digitalPassService.generatePassHTML(passData);
      
      // Generate digital pass image as attachment
      const passImageBase64 = await digitalPassService.generateDigitalPass(passData);
      const passImageBuffer = Buffer.from(passImageBase64.split(',')[1], 'base64');

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: to,
        subject: `Your Digital Visitor Pass - ${passData.visitDate}`,
        html: passHTML.replace('[QR Code will be embedded here]', `<img src="cid:qrcode" alt="QR Code" style="max-width: 200px; height: auto;">`),
        attachments: [
          {
            filename: `visitor-pass-${passData.id}.png`,
            content: passImageBuffer,
            contentType: 'image/png',
            disposition: 'attachment'
          },
          {
            filename: 'qr-code.png',
            content: qrCodeDataURL.split(',')[1],
            encoding: 'base64',
            cid: 'qrcode',
            contentType: 'image/png',
            disposition: 'inline'
          }
        ],
        replyTo: this.config.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('EmailService: Digital pass sent successfully to:', to, 'MessageID:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('EmailService: Failed to send digital pass:', error);
      return { success: false, error: error.message };
    }
  }

  // Send pass reminder
  async sendPassReminder(
    to: string,
    passData: VisitorPassData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.ensureInitialized();
    
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not properly initialized' };
    }

    try {
      const reminderHTML = this.generatePassReminderTemplate(passData);
      const qrCodeDataURL = await digitalPassService.generateQRCode(passData);

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: to,
        subject: `Visit Reminder - ${passData.visitDate}`,
        html: reminderHTML,
        attachments: [
          {
            filename: 'qr-code.png',
            content: qrCodeDataURL.split(',')[1],
            encoding: 'base64',
            cid: 'qrcode',
            contentType: 'image/png',
            disposition: 'inline'
          }
        ],
        replyTo: this.config.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('EmailService: Pass reminder sent successfully to:', to, 'MessageID:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('EmailService: Failed to send pass reminder:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate pass reminder template
  private generatePassReminderTemplate(passData: VisitorPassData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visit Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
          .title { font-size: 28px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 16px; margin: 5px 0 0 0; opacity: 0.9; }
          .body { padding: 30px; }
          .reminder-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .reminder-title { font-size: 20px; font-weight: bold; color: #92400e; margin: 0 0 10px 0; }
          .detail-row { display: flex; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: bold; color: #64748b; width: 120px; flex-shrink: 0; }
          .detail-value { color: #1f2937; flex: 1; }
          .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
          .qr-title { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 15px; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">VISIT REMINDER</h1>
            <p class="subtitle">Don't forget your upcoming visit</p>
          </div>
          
          <div class="body">
            <div class="reminder-box">
              <div class="reminder-title">🔔 Your visit is coming up!</div>
              <p>This is a friendly reminder about your scheduled visit. Please make sure to arrive on time and bring a valid ID.</p>
            </div>
            
            <h2 style="color: #1f2937; margin-bottom: 20px;">Visit Details</h2>
            
            <div class="detail-row">
              <span class="detail-label">Visitor:</span>
              <span class="detail-value">${passData.visitorName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Host:</span>
              <span class="detail-value">${passData.hostName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${passData.visitDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${passData.visitTime}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Purpose:</span>
              <span class="detail-value">${passData.purpose}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Valid Until:</span>
              <span class="detail-value">${passData.validUntil}</span>
            </div>
            
            <div class="qr-section">
              <div class="qr-title">Your QR Code</div>
              <p>Present this QR code at reception</p>
              <img src="cid:qrcode" alt="QR Code" style="max-width: 200px; height: auto;">
            </div>
            
            <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 15px; margin: 20px 0; color: #1e40af;">
              <strong>Important Reminders:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Arrive 10-15 minutes early for check-in</li>
                <li>Bring a valid government-issued ID</li>
                <li>Present this QR code at the reception desk</li>
                <li>Contact your host if you need to reschedule</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <div>Access Manager System - Secure Visitor Management</div>
            <div>Generated on: ${new Date().toLocaleString()}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Create and export singleton instance
export const emailService = new EmailService();

// Export types for use in other modules
export type { EmailConfig, VisitorInvitationData, VisitApprovalData, HostNotificationData, AdminAlertData, VisitorPassData };