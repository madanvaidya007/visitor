import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// SMTP Configuration
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport(smtpConfig);
};

// Validate SMTP configuration
const validateSMTPConfig = () => {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required SMTP environment variables: ${missing.join(', ')}`);
  }
  
  return true;
};

// Middleware
app.use(cors());
app.use(express.json());

// Validate SMTP configuration on startup
if (!validateSMTPConfig()) {
  console.error('❌ SMTP configuration is invalid. Please check your environment variables.');
  process.exit(1);
}

// Create email transporter
const transporter = createTransporter();

// Email API Routes
app.post('/api/email/test', async (req, res) => {
  try {
    // Verify SMTP connection
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'SMTP configuration is valid'
    });
  } catch (error) {
    console.error('SMTP test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/email/visitor-invitation', async (req, res) => {
  try {
    const { to, data } = req.body;
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: to,
      subject: `Visitor Invitation - ${data.purpose}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>🎫 Visitor Invitation</h1>
          </div>
          <div style="padding: 20px;">
            <h2>You're Invited!</h2>
            <p>Dear ${data.visitorName},</p>
            <p>You have been invited to visit our facility. Here are the details:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Visit Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>🏢 Company:</strong> ${data.company}</li>
                <li><strong>👤 Host:</strong> ${data.hostName}</li>
                <li><strong>📅 Date:</strong> ${data.visitDate}</li>
                <li><strong>⏰ Time:</strong> ${data.startTime} - ${data.endTime}</li>
                <li><strong>🎯 Purpose:</strong> ${data.purpose}</li>
                <li><strong>📍 Zone:</strong> ${data.zone}</li>
              </ul>
              ${data.notes ? `<p><strong>📝 Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            
            <p>Please confirm your attendance and bring a valid ID for security purposes.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666;">Thank you for visiting us!</p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Failed to send visitor invitation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/email/visit-approval', async (req, res) => {
  try {
    const { to, data } = req.body;
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: to,
      subject: `Visit Approved - ${data.purpose}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1>✅ Visit Approved</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Great News!</h2>
            <p>Dear ${data.visitorName},</p>
            <p>Your visit request has been approved. Here are your visit details:</p>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>Approved Visit Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>👤 Host:</strong> ${data.hostName}</li>
                <li><strong>📅 Date:</strong> ${data.visitDate}</li>
                <li><strong>⏰ Time:</strong> ${data.startTime} - ${data.endTime}</li>
                <li><strong>🎯 Purpose:</strong> ${data.purpose}</li>
                <li><strong>📍 Zone:</strong> ${data.zone}</li>
                <li><strong>✅ Approved by:</strong> ${data.approvedBy}</li>
              </ul>
            </div>
            
            ${data.qrCode ? `
            <div style="text-align: center; margin: 20px 0;">
              <p><strong>Your Digital Pass:</strong></p>
              <img src="${data.qrCode}" alt="QR Code" style="max-width: 200px;">
              <p style="font-size: 12px; color: #666;">Present this QR code at the entrance</p>
            </div>
            ` : ''}
            
            <p>Please arrive on time and bring a valid ID. Present your digital pass at the entrance.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Failed to send visit approval:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/email/host-notification', async (req, res) => {
  try {
    const { to, data } = req.body;
    
    let subject, actionText, actionColor;
    switch (data.action) {
      case 'request':
        subject = `New Visit Request from ${data.visitorName}`;
        actionText = 'New Visit Request';
        actionColor = '#2563eb';
        break;
      case 'checkin':
        subject = `${data.visitorName} has checked in`;
        actionText = 'Visitor Check-in';
        actionColor = '#16a34a';
        break;
      case 'checkout':
        subject = `${data.visitorName} has checked out`;
        actionText = 'Visitor Check-out';
        actionColor = '#dc2626';
        break;
    }
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${actionColor}; color: white; padding: 20px; text-align: center;">
            <h1>🔔 ${actionText}</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Host Notification</h2>
            <p>Dear ${data.hostName},</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Visitor Information:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>👤 Visitor:</strong> ${data.visitorName}</li>
                ${data.company ? `<li><strong>🏢 Company:</strong> ${data.company}</li>` : ''}
                <li><strong>📅 Date:</strong> ${data.visitDate}</li>
                <li><strong>⏰ Time:</strong> ${data.time}</li>
                <li><strong>📍 Zone:</strong> ${data.zone}</li>
                ${data.purpose ? `<li><strong>🎯 Purpose:</strong> ${data.purpose}</li>` : ''}
              </ul>
            </div>
            
            <p>This is an automated notification from the Access Manager System.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Failed to send host notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/email/admin-alert', async (req, res) => {
  try {
    const { to, data } = req.body;
    
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    
    let alertColor;
    switch (data.severity) {
      case 'critical': alertColor = '#dc2626'; break;
      case 'high': alertColor = '#ea580c'; break;
      case 'medium': alertColor = '#d97706'; break;
      case 'low': alertColor = '#16a34a'; break;
      default: alertColor = '#6b7280';
    }
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipients,
      subject: `[${data.severity.toUpperCase()}] ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${alertColor}; color: white; padding: 20px; text-align: center;">
            <h1>🚨 Admin Alert - ${data.alertType.toUpperCase()}</h1>
          </div>
          <div style="padding: 20px;">
            <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${alertColor};">
              <h2>${data.title}</h2>
              <p><strong>Severity:</strong> <span style="color: ${alertColor}; font-weight: bold;">${data.severity.toUpperCase()}</span></p>
              <p><strong>Type:</strong> ${data.alertType}</p>
              <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
              ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
            </div>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Alert Details:</h3>
              <p>${data.message}</p>
            </div>
            
            ${data.actionRequired ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p><strong>⚠️ Action Required:</strong> This alert requires immediate attention.</p>
            </div>
            ` : ''}
            
            <p style="color: #666; font-size: 12px;">
              This is an automated alert from the Access Manager System.<br>
              Alert ID: ${Math.random().toString(36).substr(2, 9)}
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Failed to send admin alert:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/email/digital-pass', async (req, res) => {
  try {
    const { to, passData } = req.body;
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: to,
      subject: `Your Digital Pass - ${passData.purpose}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7c3aed; color: white; padding: 20px; text-align: center;">
            <h1>🎫 Your Digital Pass</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Digital Visitor Pass</h2>
            <p>Dear ${passData.visitorName},</p>
            <p>Your digital visitor pass is ready. Please save this email and present the QR code at the entrance.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
              <h3>Pass Details</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
                <p><strong>Pass ID:</strong> ${passData.passId}</p>
                <p><strong>Visitor:</strong> ${passData.visitorName}</p>
                <p><strong>Host:</strong> ${passData.hostName}</p>
                <p><strong>Company:</strong> ${passData.company}</p>
                <p><strong>Date:</strong> ${passData.visitDate}</p>
                <p><strong>Time:</strong> ${passData.startTime} - ${passData.endTime}</p>
                <p><strong>Zone:</strong> ${passData.zone}</p>
                <p><strong>Valid Until:</strong> ${passData.validUntil}</p>
              </div>
              
              <div style="margin: 20px 0;">
                <img src="${passData.qrCode}" alt="Digital Pass QR Code" style="max-width: 250px; border: 2px solid #e5e7eb;">
                <p style="font-size: 12px; color: #666; margin-top: 10px;">Present this QR code at the entrance</p>
              </div>
            </div>
            
            ${passData.specialInstructions ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4>Special Instructions:</h4>
              <p>${passData.specialInstructions}</p>
            </div>
            ` : ''}
            
            <div style="background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4>Important Reminders:</h4>
              <ul>
                <li>Bring a valid government-issued ID</li>
                <li>Arrive on time for your scheduled visit</li>
                <li>Follow all security protocols</li>
                <li>This pass is valid only for the specified date and time</li>
              </ul>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Failed to send digital pass:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/email/pass-reminder', async (req, res) => {
  try {
    const { to, passData } = req.body;
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: to,
      subject: `Reminder: Your visit is scheduled for ${passData.visitDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
            <h1>⏰ Visit Reminder</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Don't Forget Your Visit!</h2>
            <p>Dear ${passData.visitorName},</p>
            <p>This is a friendly reminder about your upcoming visit:</p>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3>Visit Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>📅 Date:</strong> ${passData.visitDate}</li>
                <li><strong>⏰ Time:</strong> ${passData.startTime} - ${passData.endTime}</li>
                <li><strong>👤 Host:</strong> ${passData.hostName}</li>
                <li><strong>🏢 Company:</strong> ${passData.company}</li>
                <li><strong>📍 Zone:</strong> ${passData.zone}</li>
                <li><strong>🎯 Purpose:</strong> ${passData.purpose}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <p><strong>Your Digital Pass:</strong></p>
              <img src="${passData.qrCode}" alt="Digital Pass QR Code" style="max-width: 200px; border: 2px solid #e5e7eb;">
              <p style="font-size: 12px; color: #666;">Present this QR code at the entrance</p>
            </div>
            
            <div style="background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4>Checklist:</h4>
              <ul>
                <li>✅ Bring a valid government-issued ID</li>
                <li>✅ Save this email or screenshot the QR code</li>
                <li>✅ Arrive 10 minutes early</li>
                <li>✅ Contact your host if you need to reschedule</li>
              </ul>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Failed to send pass reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test email sending endpoint
app.post('/api/email/test-send', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email address is required'
      });
    }
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: to,
      subject: 'Email Service Test - Access Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>✅ Email Service Test</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Test Successful!</h2>
            <p>Dear User,</p>
            <p>This is a test email to verify that the Access Manager email service is working correctly.</p>
            
            <div style="background: #d1fae5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3>✅ Email Configuration Status:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>📧 SMTP Server:</strong> Connected</li>
                <li><strong>🔐 Authentication:</strong> Successful</li>
                <li><strong>📤 Email Delivery:</strong> Working</li>
                <li><strong>⏰ Timestamp:</strong> ${new Date().toISOString()}</li>
              </ul>
            </div>
            
            <p>If you receive this email, the email service configuration is working properly and you can expect to receive:</p>
            <ul>
              <li>Digital visitor passes</li>
              <li>Visit invitations and approvals</li>
              <li>Host notifications</li>
              <li>System alerts</li>
            </ul>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                This is an automated test email from Access Manager System
              </p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Failed to send test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Access Manager Email API',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email API Server running on port ${PORT}`);
  console.log(`📧 SMTP configured for: ${process.env.SMTP_FROM_EMAIL}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});