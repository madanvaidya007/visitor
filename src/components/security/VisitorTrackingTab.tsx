import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MapPin, Clock, User, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VisitorLocation {
  id: string;
  visitor_name: string;
  company: string;
  check_in_time: string;
  current_zone: string;
  host_name: string;
  purpose: string;
  expected_duration: string;
  status: 'checked_in' | 'overdue' | 'normal';
}

export function VisitorTrackingTab() {
  const [visitors, setVisitors] = useState<VisitorLocation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchActiveVisitors();
  }, []);

  const fetchActiveVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          id,
          purpose,
          start_time,
          end_time,
          visitor:visitor_id(full_name, company),
          host:host_id(full_name)
        `)
        .eq('status', 'checked_in');

      if (error) throw error;

      // Transform data to match our interface
      const visitorData: VisitorLocation[] = (data || []).map(visit => {
        const now = new Date();
        const endTime = new Date(`${new Date().toDateString()} ${visit.end_time}`);
        const isOverdue = now > endTime;

        return {
          id: visit.id,
          visitor_name: (visit.visitor as any)?.full_name || 'Unknown',
          company: (visit.visitor as any)?.company || 'Unknown',
          check_in_time: visit.start_time,
          current_zone: 'Lobby', // Placeholder - would need actual zone tracking
          host_name: (visit.host as any)?.full_name || 'Unknown',
          purpose: visit.purpose,
          expected_duration: `${visit.start_time} - ${visit.end_time}`,
          status: isOverdue ? 'overdue' : 'normal'
        };
      });

      setVisitors(visitorData);
    } catch (error: any) {
      toast({
        title: 'Error fetching visitor data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'destructive';
      case 'checked_in': return 'default';
      default: return 'secondary';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredVisitors = visitors.filter(visitor =>
    visitor.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visitor.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visitor.current_zone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const overdueVisitors = visitors.filter(v => v.status === 'overdue');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitors.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently in building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Visitors</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueVisitors.length}</div>
            <p className="text-xs text-muted-foreground">
              Exceeded visit time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zones in Use</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(visitors.map(v => v.current_zone)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Active zones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Search and List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Visitor Tracking</CardTitle>
              <CardDescription>Real-time location and status of all checked-in visitors</CardDescription>
            </div>
            <Button onClick={fetchActiveVisitors} variant="outline">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search visitors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="space-y-4">
            {filteredVisitors.map((visitor) => (
              <Card key={visitor.id} className={`transition-all ${
                visitor.status === 'overdue' ? 'border-destructive/50' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(visitor.visitor_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{visitor.visitor_name}</h4>
                          <Badge variant={getStatusColor(visitor.status)}>
                            {visitor.status === 'overdue' ? 'OVERDUE' : 'ACTIVE'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{visitor.company}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>Host: {visitor.host_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>Zone: {visitor.current_zone}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Time: {visitor.expected_duration}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm mt-2">
                          <strong>Purpose:</strong> {visitor.purpose}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <Button size="sm" variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        Track
                      </Button>
                      {visitor.status === 'overdue' && (
                        <Button size="sm" variant="destructive">
                          <Clock className="h-3 w-3 mr-1" />
                          Alert
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredVisitors.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active visitors found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}