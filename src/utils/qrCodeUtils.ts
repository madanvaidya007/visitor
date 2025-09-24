import qrcode from 'qrcode-generator';

/**
 * Generates a QR code image as a base64 data URL from a QR code string
 * @param qrCodeData - The QR code string data
 * @param size - The size of each module in pixels (default: 8)
 * @param margin - The margin around the QR code in pixels (default: 16)
 * @returns Base64 data URL of the QR code image
 */
export function generateQRCodeImage(qrCodeData: string, size: number = 8, margin: number = 16): string {
  try {
    console.log('Generating QR code image:', { dataLength: qrCodeData.length, size, margin });
    
    const qr = qrcode(0, 'M');
    qr.addData(qrCodeData);
    qr.make();
    
    // Create canvas and draw QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const moduleCount = qr.getModuleCount();
    
    console.log('QR code module count:', moduleCount);
    
    canvas.width = canvas.height = moduleCount * size + margin * 2;
    
    if (ctx) {
      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.fillStyle = '#000000';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(
              col * size + margin,
              row * size + margin,
              size,
              size
            );
          }
        }
      }
      
      console.log('QR code image generated successfully:', { width: canvas.width, height: canvas.height });
      return canvas.toDataURL();
    }
    
    throw new Error('Failed to get canvas context');
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw error;
  }
}

/**
 * Converts a QR code string to a base64 encoded image for email attachments
 * @param qrCodeData - The QR code string data
 * @returns Base64 encoded image data (without data URL prefix)
 */
export function qrCodeToBase64(qrCodeData: string): string {
  console.log('Converting QR code to base64 for email attachment');
  const dataUrl = generateQRCodeImage(qrCodeData, 10, 20);
  // Remove the data URL prefix to get just the base64 data
  const base64Data = dataUrl.split(',')[1];
  console.log('QR code base64 conversion completed:', { base64Length: base64Data.length });
  return base64Data;
}