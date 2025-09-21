import { useAuth } from '@/hooks/useAuth';
import { VisitorDashboard } from '@/components/dashboard/VisitorDashboard';
import { HostDashboard } from '@/components/dashboard/HostDashboard';
import { ReceptionDashboard } from '@/components/dashboard/ReceptionDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { SecurityDashboard } from '@/components/dashboard/SecurityDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Building, Key, Eye } from 'lucide-react';

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
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Access Manager</CardTitle>
            <CardDescription>
              Professional visitor management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Setting up your profile...
            </p>
          </CardContent>
        </Card>
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
