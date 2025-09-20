import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <div className="w-64 border-r bg-muted/30">
            <div className="p-6">
              <Skeleton className="h-8 w-32 mb-6" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="border-b">
              <div className="flex h-16 items-center px-6">
                <Skeleton className="h-8 w-48" />
                <div className="ml-auto">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
            <div className="p-6">
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium">Setting up your profile...</div>
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <DashboardSidebar userRole={profile.role} />
        <div className="flex-1">
          <DashboardHeader profile={profile} />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}