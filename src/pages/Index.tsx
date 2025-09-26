import { useAuth } from '@/hooks/useAuth';
import { VisitorDashboard } from '@/components/dashboard/VisitorDashboard';
import { HostDashboard } from '@/components/dashboard/HostDashboard';
import { ReceptionDashboard } from '@/components/dashboard/ReceptionDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { SecurityDashboard } from '@/components/dashboard/SecurityDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomLogo } from '@/components/ui/CustomLogo';

const Index = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <CustomLogo className="h-16 w-16 mx-auto" alt="Access Manager Logo" />
          <div>
            <h1 className="text-2xl font-bold mb-2">Access Manager</h1>
            <p className="text-muted-foreground mb-4">
              Professional visitor management system
            </p>
            <p className="text-center text-muted-foreground">
              Setting up your profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  switch (profile.role) {
    case 'visitor':
      return <VisitorDashboard />;
    
    case 'host':
      return <HostDashboard />;
    
    case 'reception':
      return <ReceptionDashboard />;
    
    case 'admin':
      return <AdminDashboard />;
    
    case 'security':
      return <SecurityDashboard />;
    
    default:
      return (
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Welcome to Access Manager</h1>
          <p className="text-muted-foreground">
            Your role-specific dashboard will appear here.
          </p>
        </div>
      );
  }
};

export default Index;
