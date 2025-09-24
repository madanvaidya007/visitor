import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { useToast } from '@/hooks/use-toast';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface SystemError {
  message: string;
  stack?: string;
  code?: string;
  context?: ErrorContext;
  timestamp: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private adminNotifications: ReturnType<typeof useAdminNotifications> | null = null;
  private toast: ReturnType<typeof useToast>['toast'] | null = null;
  private adminEmails: string[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  initialize(adminEmails: string[]) {
    this.adminEmails = adminEmails;
  }

  setNotificationServices(
    adminNotifications: ReturnType<typeof useAdminNotifications>,
    toast: ReturnType<typeof useToast>['toast']
  ) {
    this.adminNotifications = adminNotifications;
    this.toast = toast;
  }

  async handleError(error: Error, context?: ErrorContext, showToast = true): Promise<void> {
    const systemError: SystemError = {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      context,
      timestamp: new Date().toISOString()
    };

    // Show user-friendly toast notification
    if (showToast && this.toast) {
      this.toast({
        title: 'System Error',
        description: this.getUserFriendlyMessage(error.message),
        variant: 'destructive'
      });
    }

    // Send admin notification for critical errors
    if (this.shouldNotifyAdmin(error, context)) {
      await this.sendAdminErrorNotification(systemError);
    }

    // Store error in local storage for debugging
    this.storeErrorLocally(systemError);
  }

  private getUserFriendlyMessage(errorMessage: string): string {
    // Convert technical error messages to user-friendly ones
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return 'You do not have permission to perform this action.';
    }
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'Please check your input and try again.';
    }
    if (errorMessage.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    return 'An unexpected error occurred. Please try again or contact support.';
  }

  private shouldNotifyAdmin(error: Error, context?: ErrorContext): boolean {
    // Notify admin for critical system errors
    const criticalKeywords = [
      'database',
      'authentication',
      'security',
      'payment',
      'data loss',
      'corruption',
      'breach'
    ];

    const errorMessage = error.message.toLowerCase();
    return criticalKeywords.some(keyword => errorMessage.includes(keyword)) ||
           context?.component === 'security' ||
           (error as any).code === 'CRITICAL_SYSTEM_ERROR';
  }

  private async sendAdminErrorNotification(systemError: SystemError): Promise<void> {
    if (!this.adminNotifications || this.adminEmails.length === 0) {
      return;
    }

    try {
      await this.adminNotifications.sendSystemAlert(this.adminEmails, {
        title: 'System Error Detected',
        message: `A system error has occurred: ${systemError.message}`,
        severity: this.getErrorSeverity(systemError),
        location: systemError.context?.component || 'Unknown',
        actionRequired: true,
        metadata: {
          timestamp: systemError.timestamp,
          userId: systemError.context?.userId,
          action: systemError.context?.action,
          stack: systemError.stack?.substring(0, 500) // Truncate stack trace
        }
      });
    } catch (notificationError) {
      console.error('Failed to send admin error notification:', notificationError);
    }
  }

  private getErrorSeverity(systemError: SystemError): 'low' | 'medium' | 'high' | 'critical' {
    const message = systemError.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('security') || message.includes('breach')) {
      return 'critical';
    }
    if (message.includes('database') || message.includes('authentication')) {
      return 'high';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'medium';
    }
    return 'low';
  }

  private storeErrorLocally(systemError: SystemError): void {
    try {
      const errors = JSON.parse(localStorage.getItem('system_errors') || '[]');
      errors.push(systemError);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('system_errors', JSON.stringify(errors));
    } catch (storageError) {
      console.error('Failed to store error locally:', storageError);
    }
  }

  getStoredErrors(): SystemError[] {
    try {
      return JSON.parse(localStorage.getItem('system_errors') || '[]');
    } catch {
      return [];
    }
  }

  clearStoredErrors(): void {
    localStorage.removeItem('system_errors');
  }
}

export const errorHandler = ErrorHandler.getInstance();

// React hook for using error handler
export function useErrorHandler() {
  const adminNotifications = useAdminNotifications();
  const { toast } = useToast();

  // Initialize error handler with notification services
  errorHandler.setNotificationServices(adminNotifications, toast);

  return {
    handleError: errorHandler.handleError.bind(errorHandler),
    getStoredErrors: errorHandler.getStoredErrors.bind(errorHandler),
    clearStoredErrors: errorHandler.clearStoredErrors.bind(errorHandler)
  };
}