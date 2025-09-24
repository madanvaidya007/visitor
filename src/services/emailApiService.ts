// Frontend API service for email functionality
// This service communicates with backend email endpoints without importing nodemailer

export interface EmailApiResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

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

export interface VisitorPassData {
  visitorId: string;
  visitorName: string;
  hostName: string;
  company: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  zone: string;
  qrCode: string;
  passId: string;
  validUntil: string;
  specialInstructions?: string;
}

class EmailApiService {
  private baseUrl: string;

  constructor() {
    // Point to the backend server for email API
    this.baseUrl = 'http://localhost:3001/api/email';
  }

  // Simplified initialization - backend handles all configuration
  initialize(config?: EmailConfig): void {
    // No longer needed - backend is pre-configured
    console.log('Email service initialized - using backend configuration');
  }

  async testConfiguration(): Promise<EmailApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendVisitorInvitation(
    to: string,
    data: VisitorInvitationData
  ): Promise<EmailApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/visitor-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, data }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendVisitApproval(
    to: string,
    data: VisitApprovalData
  ): Promise<EmailApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/visit-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, data }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendHostNotification(
    to: string,
    data: HostNotificationData
  ): Promise<EmailApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/host-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, data }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendAdminAlert(
    to: string | string[],
    data: AdminAlertData
  ): Promise<EmailApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/admin-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, data }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendDigitalPass(
    to: string,
    passData: VisitorPassData
  ): Promise<EmailApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/digital-pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, passData }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendTestEmail(to: string): Promise<EmailApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/test-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export singleton instance
export const emailApiService = new EmailApiService();