import QRCode from 'qrcode';
import { createCanvas } from 'canvas';

export interface VisitorPassData {
  id: string;
  visitorName: string;
  visitorEmail: string;
  hostName: string;
  visitDate: string;
  visitTime: string;
  purpose: string;
  validUntil: string;
  qrData: string;
  companyName?: string;
  department?: string;
  phoneNumber?: string;
}

export interface DigitalPassOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

class DigitalPassService {
  private defaultOptions: DigitalPassOptions = {
    width: 600,
    height: 800,
    backgroundColor: '#ffffff',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
  };

  /**
   * Generate QR code data URL for visitor pass
   */
  async generateQRCode(passData: VisitorPassData): Promise<string> {
    try {
      const qrData = JSON.stringify({
        id: passData.id,
        visitor: passData.visitorName,
        email: passData.visitorEmail,
        host: passData.hostName,
        date: passData.visitDate,
        time: passData.visitTime,
        validUntil: passData.validUntil,
        purpose: passData.purpose,
        timestamp: new Date().toISOString()
      });

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate digital pass as base64 image
   */
  async generateDigitalPass(
    passData: VisitorPassData, 
    options: DigitalPassOptions = {}
  ): Promise<string> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const canvas = createCanvas(opts.width!, opts.height!);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = opts.backgroundColor!;
      ctx.fillRect(0, 0, opts.width!, opts.height!);

      // Header background
      ctx.fillStyle = opts.primaryColor!;
      ctx.fillRect(0, 0, opts.width!, 120);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VISITOR PASS', opts.width! / 2, 50);

      // Subtitle
      ctx.font = '18px Arial';
      ctx.fillText('Access Manager System', opts.width! / 2, 80);

      // Pass ID
      ctx.fillStyle = opts.secondaryColor!;
      ctx.font = '14px Arial';
      ctx.fillText(`Pass ID: ${passData.id}`, opts.width! / 2, 105);

      // Visitor Information
      let yPos = 160;
      const leftMargin = 50;
      const lineHeight = 35;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Visitor Information', leftMargin, yPos);

      yPos += 40;
      ctx.font = '18px Arial';
      
      // Visitor details
      const details = [
        { label: 'Name:', value: passData.visitorName },
        { label: 'Email:', value: passData.visitorEmail },
        { label: 'Host:', value: passData.hostName },
        { label: 'Date:', value: passData.visitDate },
        { label: 'Time:', value: passData.visitTime },
        { label: 'Purpose:', value: passData.purpose },
        { label: 'Valid Until:', value: passData.validUntil }
      ];

      if (passData.companyName) {
        details.splice(2, 0, { label: 'Company:', value: passData.companyName });
      }

      if (passData.phoneNumber) {
        details.splice(-2, 0, { label: 'Phone:', value: passData.phoneNumber });
      }

      details.forEach(detail => {
        ctx.fillStyle = opts.secondaryColor!;
        ctx.font = 'bold 16px Arial';
        ctx.fillText(detail.label, leftMargin, yPos);
        
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText(detail.value, leftMargin + 100, yPos);
        
        yPos += lineHeight;
      });

      // QR Code section
      yPos += 20;
      ctx.fillStyle = opts.primaryColor!;
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Scan QR Code for Verification', opts.width! / 2, yPos);

      // Generate and draw QR code
      const qrCodeDataURL = await this.generateQRCode(passData);
      const qrImage = await this.loadImage(qrCodeDataURL);
      
      const qrSize = 180;
      const qrX = (opts.width! - qrSize) / 2;
      const qrY = yPos + 20;
      
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // Footer
      const footerY = opts.height! - 60;
      ctx.fillStyle = opts.secondaryColor!;
      ctx.font = '12px Arial';
      ctx.fillText('This pass is valid only for the specified date and time', opts.width! / 2, footerY);
      ctx.fillText('Please present this pass at reception', opts.width! / 2, footerY + 20);
      ctx.fillText(`Generated on: ${new Date().toLocaleString()}`, opts.width! / 2, footerY + 40);

      // Convert to base64
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating digital pass:', error);
      throw new Error('Failed to generate digital pass');
    }
  }

  /**
   * Generate digital pass as HTML for email
   */
  generatePassHTML(passData: VisitorPassData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Digital Visitor Pass</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
          }
          .pass-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
          }
          .pass-header { 
            background: linear-gradient(135deg, #2563eb, #1d4ed8); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .pass-title { 
            font-size: 28px; 
            font-weight: bold; 
            margin: 0; 
          }
          .pass-subtitle { 
            font-size: 16px; 
            margin: 5px 0 0 0; 
            opacity: 0.9; 
          }
          .pass-id { 
            font-size: 12px; 
            margin: 10px 0 0 0; 
            opacity: 0.8; 
          }
          .pass-body { 
            padding: 30px; 
          }
          .section-title { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1f2937; 
            margin: 0 0 20px 0; 
          }
          .detail-row { 
            display: flex; 
            margin-bottom: 12px; 
            padding: 8px 0; 
            border-bottom: 1px solid #e5e7eb; 
          }
          .detail-label { 
            font-weight: bold; 
            color: #64748b; 
            width: 120px; 
            flex-shrink: 0; 
          }
          .detail-value { 
            color: #1f2937; 
            flex: 1; 
          }
          .qr-section { 
            text-align: center; 
            margin: 30px 0; 
            padding: 20px; 
            background: #f8fafc; 
            border-radius: 8px; 
          }
          .qr-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #2563eb; 
            margin-bottom: 15px; 
          }
          .pass-footer { 
            background: #f8fafc; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #64748b; 
            border-top: 1px solid #e5e7eb; 
          }
          .footer-line { 
            margin: 5px 0; 
          }
          .important-note { 
            background: #fef3c7; 
            border: 1px solid #f59e0b; 
            border-radius: 6px; 
            padding: 15px; 
            margin: 20px 0; 
            color: #92400e; 
          }
        </style>
      </head>
      <body>
        <div class="pass-container">
          <div class="pass-header">
            <h1 class="pass-title">VISITOR PASS</h1>
            <p class="pass-subtitle">Access Manager System</p>
            <p class="pass-id">Pass ID: ${passData.id}</p>
          </div>
          
          <div class="pass-body">
            <h2 class="section-title">Visitor Information</h2>
            
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              <span class="detail-value">${passData.visitorName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${passData.visitorEmail}</span>
            </div>
            
            ${passData.companyName ? `
            <div class="detail-row">
              <span class="detail-label">Company:</span>
              <span class="detail-value">${passData.companyName}</span>
            </div>
            ` : ''}
            
            ${passData.phoneNumber ? `
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              <span class="detail-value">${passData.phoneNumber}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
              <span class="detail-label">Host:</span>
              <span class="detail-value">${passData.hostName}</span>
            </div>
            
            ${passData.department ? `
            <div class="detail-row">
              <span class="detail-label">Department:</span>
              <span class="detail-value">${passData.department}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
              <span class="detail-label">Visit Date:</span>
              <span class="detail-value">${passData.visitDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Visit Time:</span>
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
            
            <div class="important-note">
              <strong>Important:</strong> This digital pass is valid only for the specified date and time. 
              Please present this pass at reception and be prepared to show a valid ID.
            </div>
            
            <div class="qr-section">
              <div class="qr-title">Scan for Verification</div>
              <p>Present the QR code below at the security checkpoint</p>
              <div id="qr-code-placeholder" style="margin: 20px 0;">
                [QR Code will be embedded here]
              </div>
            </div>
          </div>
          
          <div class="pass-footer">
            <div class="footer-line">This pass is generated electronically and is valid without signature</div>
            <div class="footer-line">Generated on: ${new Date().toLocaleString()}</div>
            <div class="footer-line">Access Manager System - Secure Visitor Management</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Validate visitor pass data
   */
  validatePassData(passData: Partial<VisitorPassData>): string[] {
    const errors: string[] = [];
    
    if (!passData.id) errors.push('Pass ID is required');
    if (!passData.visitorName) errors.push('Visitor name is required');
    if (!passData.visitorEmail) errors.push('Visitor email is required');
    if (!passData.hostName) errors.push('Host name is required');
    if (!passData.visitDate) errors.push('Visit date is required');
    if (!passData.visitTime) errors.push('Visit time is required');
    if (!passData.purpose) errors.push('Visit purpose is required');
    if (!passData.validUntil) errors.push('Valid until time is required');
    
    // Validate email format
    if (passData.visitorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passData.visitorEmail)) {
      errors.push('Invalid email format');
    }
    
    // Validate dates
    if (passData.visitDate) {
      const visitDate = new Date(passData.visitDate);
      if (isNaN(visitDate.getTime())) {
        errors.push('Invalid visit date format');
      }
    }
    
    if (passData.validUntil) {
      const validUntil = new Date(passData.validUntil);
      if (isNaN(validUntil.getTime())) {
        errors.push('Invalid valid until date format');
      }
    }
    
    return errors;
  }

  /**
   * Helper method to load image from data URL
   */
  private loadImage(dataURL: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataURL;
    });
  }
}

export const digitalPassService = new DigitalPassService();