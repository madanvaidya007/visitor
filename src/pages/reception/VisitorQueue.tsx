import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  Building, 
  User, 
  CheckCircle, 
  QrCode, 
  Search, 
  Filter,
  UserCheck,
  UserX,
  AlertCircle,
  Calendar,
  Phone,
  Mail
} from 'lucide-react';
import { LegacyVisitRequest as VisitorRequest } from '@/types/visitTypes';

export default function VisitorQueue() {
  const [visitors, setVisitors] = useState<VisitorRequest[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<VisitorRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVisitors();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('visitor_queue')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'visit_requests' },
        () => {
          fetchVisitors();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterVisitors();
  }, [visitors, searchTerm, statusFilter]);

  const fetchVisitors = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          visitor:profiles!visit_requests_visitor_id_fkey(
            full_name,
            email,
            phone,
            company
          ),
          host:profiles!visit_requests_host_id_fkey(
            full_name
          )
        `)
        .eq('visit_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the data to match LegacyVisitRequest interface
      const mappedData = (data || []).map(request => ({
        id: request.id,
        visitor_name: request.visitor?.full_name || '',
        visitor_email: request.visitor?.email,
        visitor_phone: request.visitor?.phone,
        visitor_company: request.visitor?.company,
        purpose: request.purpose,
        visit_date: request.visit_date,
        start_time: request.start_time,
        end_time: request.end_time,
        status: request.status,
        host_name: request.host?.full_name || '',
        qr_code: request.qr_code,
        pass_generated: !!request.qr_code,
        created_at: request.created_at
      }));
      
      setVisitors(mappedData);
    } catch (error) {
      console.error('Error fetching visitors:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch visitor queue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterVisitors = () => {
    let filtered = visitors;

    if (searchTerm) {
      filtered = filtered.filter(visitor =>
        visitor.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.visitor_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.host_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(visitor => visitor.status === statusFilter);
    }

    setFilteredVisitors(filtered);
  };

  const updateVisitorStatus = async (visitorId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: newStatus })
        .eq('id', visitorId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Visitor status updated to ${newStatus}`,
      });

      fetchVisitors();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update visitor status',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'checked_out': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'Delivery': return 'bg-orange-100 text-orange-800';
      case 'Walk-in': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'NA';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'checked_in': return <UserCheck className="h-4 w-4" />;
      case 'checked_out': return <UserX className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getVisitorsByStatus = (status: string) => {
    return visitors.filter(visitor => visitor.status === status);
  };

  const VisitorCard = ({ visitor }: { visitor: VisitorRequest }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar>
              <AvatarFallback>{getInitials(visitor.visitor_name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{visitor.visitor_name}</h3>
                <Badge className={getStatusColor(visitor.status)}>
                  {getStatusIcon(visitor.status)}
                  <span className="ml-1 capitalize">{visitor.status}</span>
                </Badge>
                {visitor.priority && (
                  <Badge className={getPriorityColor(visitor.priority)}>
                    {visitor.priority}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                {visitor.visitor_company && (
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span>{visitor.visitor_company}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Visiting: {visitor.host_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{visitor.start_time} - {visitor.end_time}</span>
                </div>
                {visitor.visitor_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{visitor.visitor_phone}</span>
                  </div>
                )}
                {visitor.visitor_email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>{visitor.visitor_email}</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm mt-2 text-gray-600">{visitor.purpose}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            {visitor.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => updateVisitorStatus(visitor.id, 'approved')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateVisitorStatus(visitor.id, 'rejected')}
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            
            {visitor.status === 'approved' && (
              <Button
                size="sm"
                onClick={() => updateVisitorStatus(visitor.id, 'checked_in')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Check In
              </Button>
            )}
            
            {visitor.status === 'checked_in' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateVisitorStatus(visitor.id, 'checked_out')}
              >
                <UserX className="h-4 w-4 mr-1" />
                Check Out
              </Button>
            )}
            
            <Button size="sm" variant="outline">
              <QrCode className="h-4 w-4 mr-1" />
              Pass
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visitor Queue</h1>
          <p className="text-muted-foreground">
            Manage today's visitor arrivals and check-ins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date().toLocaleDateString()}
          </Badge>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search visitors, companies, or hosts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queue Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            All ({filteredVisitors.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({getVisitorsByStatus('pending').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({getVisitorsByStatus('approved').length})
          </TabsTrigger>
          <TabsTrigger value="checked_in">
            Checked In ({getVisitorsByStatus('checked_in').length})
          </TabsTrigger>
          <TabsTrigger value="checked_out">
            Checked Out ({getVisitorsByStatus('checked_out').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading visitors...</div>
          ) : filteredVisitors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-muted-foreground">No visitors found</p>
              </CardContent>
            </Card>
          ) : (
            filteredVisitors.map((visitor) => (
              <VisitorCard key={visitor.id} visitor={visitor} />
            ))
          )}
        </TabsContent>

        {['pending', 'approved', 'checked_in', 'checked_out'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {getVisitorsByStatus(status).length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <UserCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">
                    No {status} visitors found
                  </p>
                </CardContent>
              </Card>
            ) : (
              getVisitorsByStatus(status).map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}