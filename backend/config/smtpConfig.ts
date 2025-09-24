import nodemailer from 'nodemailer';

// SMTP Configuration interface
export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

// Load SMTP configuration from environment variables
export const smtpConfig: SMTPConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: {
    name: process.env.SMTP_FROM_NAME || 'Access Manager System',
    email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
  },
};

// Create and configure the transporter
export const createTransporter = () => {
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: smtpConfig.auth,
      tls: {
        // Do not fail on invalid certs for development
        rejectUnauthorized: false,
      },
      // Connection timeout
      connectionTimeout: 60000,
      // Socket timeout
      socketTimeout: 60000,
      // Greeting timeout
      greetingTimeout: 30000,
    });

    // Verify connection configuration
    transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP Configuration Error:', error);
      } else {
        console.log('SMTP Server is ready to take our messages');
      }
    });

    return transporter;
  } catch (error) {
    console.error('Failed to create SMTP transporter:', error);
    throw error;
  }
};

// Validate SMTP configuration
export const validateSMTPConfig = (): boolean => {
  const requiredFields = [
    smtpConfig.host,
    smtpConfig.auth.user,
    smtpConfig.auth.pass,
    smtpConfig.from.email,
  ];

  const isValid = requiredFields.every(field => field && field.trim() !== '');
  
  if (!isValid) {
    console.error('SMTP Configuration is incomplete. Please check environment variables.');
    return false;
  }

  return true;
};