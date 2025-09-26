import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Calendar, 
  Users, 
  MapPin, 
  FileText, 
  BarChart3, 
  Settings,
  UserCheck,
  QrCode,
  AlertTriangle,
  Building,
  Eye,
  Key,
  Home,
  Building2,
  Scan
} from 'lucide-react';
import { CustomLogo } from '@/components/ui/CustomLogo';
import { UserRole } from '@/hooks/useAuth';

interface DashboardSidebarProps {
  userRole: UserRole;
}

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  // Define navigation items for each role
  const getNavigationItems = (role: UserRole) => {
    const commonItems = [
      { href: '/', icon: BarChart3, label: 'Dashboard' }
    ];

    switch (role) {
      case 'visitor':
        return [
          ...commonItems,
          { href: '/profile', icon: Users, label: 'My Profile' },
          { href: '/visit-requests', icon: Calendar, label: 'Visit Requests' },
          { href: '/my-visits', icon: FileText, label: 'My Visits' },
          { href: '/documents', icon: FileText, label: 'Documents' }
        ];

      case 'host':
        return [
          ...commonItems,
          { href: '/profile', icon: Users, label: 'My Profile' },
          { href: '/visitor-requests', icon: UserCheck, label: 'Visitor Requests' },
          { href: '/my-visitors', icon: Users, label: 'My Visitors' },
          { href: '/invite-visitor', icon: Calendar, label: 'Invite Visitor' },
          { href: '/zones', icon: MapPin, label: 'Zone Access' }
        ];

      case 'reception':
        return [
          ...commonItems,
          { href: '/quick-registration', icon: UserCheck, label: 'Quick Registration' },
          { href: '/visitor-queue', icon: Users, label: 'Visitor Queue' },
          { href: '/generate-pass', icon: QrCode, label: 'Generate Pass' },
          { href: '/zone-management', icon: MapPin, label: 'Zone Management' },
          { href: '/visitor-search', icon: Users, label: 'Visitor Search' }
        ];

      case 'admin':
        return [
          ...commonItems,
          { href: '/users', icon: Users, label: 'User Management' },
          { href: '/zones', icon: MapPin, label: 'Zone Management' },
          { href: '/face-recognition', icon: Eye, label: 'Face Recognition' },
          { href: '/reports', icon: BarChart3, label: 'Reports' },
          { href: '/settings', icon: Settings, label: 'System Settings' },
          { href: '/blacklist', icon: AlertTriangle, label: 'Blacklist' },
          { href: '/analytics', icon: BarChart3, label: 'Analytics' }
        ];

      case 'security':
        return [
          ...commonItems,
          { href: '/scan-qr', icon: QrCode, label: 'Scan QR Code' },
          { href: '/zone-monitoring', icon: Eye, label: 'Zone Monitoring' },
          { href: '/alerts', icon: AlertTriangle, label: 'Security Alerts' },
          { href: '/evacuation', icon: AlertTriangle, label: 'Evacuation' },
          { href: '/visitor-tracking', icon: Users, label: 'Visitor Tracking' }
        ];

      default:
        return commonItems;
    }
  };

  const navigationItems = getNavigationItems(userRole);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'visitor': return <Users className="h-5 w-5" />;
      case 'host': return <Building className="h-5 w-5" />;
      case 'reception': return <Key className="h-5 w-5" />;
      case 'admin': return <CustomLogo className="h-5 w-5" />;
      case 'security': return <Eye className="h-5 w-5" />;
      default: return <CustomLogo className="h-5 w-5" />;
    }
  };

  return (
    <div className="w-64 border-r bg-muted/30 h-screen">
      <div className="p-6">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <CustomLogo className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Access Manager</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getRoleIcon(userRole)}
              <span className="capitalize">{userRole} Panel</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}