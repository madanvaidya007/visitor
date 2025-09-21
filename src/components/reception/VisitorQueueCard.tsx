import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Building, User, CheckCircle, QrCode } from 'lucide-react';

interface VisitorRequest {
  id: string;
  visitor_name: string;
  company: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: string;
  host_name: string;
  priority: 'VIP' | 'Scheduled' | 'Walk-in' | 'Delivery';
}

interface VisitorQueueCardProps {
  visitor: VisitorRequest;
  onApprove: (visitId: string) => void;
  onGeneratePass: () => void;
}

export function VisitorQueueCard({ visitor, onApprove, onGeneratePass }: VisitorQueueCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'checked_in': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'VIP': return 'destructive';
      case 'Delivery': return 'default';
      case 'Walk-in': return 'secondary';
      default: return 'outline';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(visitor.visitor_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{visitor.visitor_name}</h4>
                <Badge variant={getPriorityColor(visitor.priority)} className="text-xs">
                  {visitor.priority}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  <span className="truncate">{visitor.company || 'Individual'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">Host: {visitor.host_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{visitor.start_time} - {visitor.end_time}</span>
                </div>
              </div>
              
              <p className="text-sm mt-2 text-foreground line-clamp-2">
                {visitor.purpose}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2 ml-4">
            <Badge variant={getStatusColor(visitor.status)}>
              {visitor.status.charAt(0).toUpperCase() + visitor.status.slice(1)}
            </Badge>
            
            <div className="flex space-x-2">
              {visitor.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => onApprove(visitor.id)}
                  className="h-8"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              )}
              
              {visitor.status === 'approved' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onGeneratePass}
                  className="h-8"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  Pass
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}