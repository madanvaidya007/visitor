import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserCheck, 
  QrCode, 
  Clock, 
  AlertTriangle, 
  Search,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QuickRegistrationDialog } from '@/components/reception/QuickRegistrationDialog';
import { GeneratePassDialog } from '@/components/reception/GeneratePassDialog';
import { VisitorQueueCard } from '@/components/reception/VisitorQueueCard';

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

export function ReceptionDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [visitorQueue, setVisitorQueue] = useState<VisitorRequest[]>([]);
  const [todayStats, setTodayStats] = useState({
    checked_in: 0,
    pending: 0,
    total_today: 0
  });
  const [showQuickReg, setShowQuickReg] = useState(false);
  const [showGeneratePass, setShowGeneratePass] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodayStats();
    fetchVisitorQueue();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('visit_requests')
        .select('status')
        .eq('visit_date', today);

      if (error) throw error;

      const stats = {
        checked_in: data.filter(v => v.status === 'checked_in').length,
        pending: data.filter(v => v.status === 'pending').length,
        total_today: data.length
      };

      setTodayStats(stats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchVisitorQueue = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          id,
          purpose,
          visit_date,
          start_time,
          end_time,
          status,
          visitor_id,
          host_id
        `)
        .eq('visit_date', today)
        .in('status', ['pending', 'approved'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedData = data.map(item => ({
        id: item.id,
        visitor_name: 'Visitor',
        company: 'Company',
        purpose: item.purpose,
        visit_date: item.visit_date,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status,
        host_name: 'Host',
        priority: 'Scheduled' as const
      }));

      setVisitorQueue(formattedData);
    } catch (error: any) {
      console.error('Error fetching visitor queue:', error);
    }
  };

  const handleApproveVisitor = async (visitId: string) => {
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: 'approved' })
        .eq('id', visitId);

      if (error) throw error;

      toast({
        title: 'Visitor approved',
        description: 'Visitor has been approved and can now check in.'
      });

      fetchVisitorQueue();
      fetchTodayStats();
    } catch (error: any) {
      toast({
        title: 'Error approving visitor',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredQueue = visitorQueue.filter(visitor =>
    visitor.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visitor.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visitor.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="gradient-hero rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Reception Dashboard</h1>
        <p className="text-white/90">Manage visitor registration and check-ins</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.total_today}</div>
            <p className="text-xs text-muted-foreground">
              Total scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{todayStats.checked_in}</div>
            <p className="text-xs text-muted-foreground">
              Currently in building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-pending" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pending">{todayStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
          onClick={() => setShowQuickReg(true)}
          className="h-16 text-base"
        >
          <UserCheck className="mr-2 h-5 w-5" />
          Quick Registration
        </Button>
        <Button 
          onClick={() => setShowGeneratePass(true)}
          variant="outline"
          className="h-16 text-base"
        >
          <QrCode className="mr-2 h-5 w-5" />
          Generate Pass
        </Button>
      </div>

      {/* Visitor Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Visitor Queue</CardTitle>
              <CardDescription>Manage today's visitor check-ins</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search visitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredQueue.map(visitor => (
                <VisitorQueueCard
                  key={visitor.id}
                  visitor={visitor}
                  onApprove={handleApproveVisitor}
                  onGeneratePass={() => {
                    setSelectedVisitor(visitor.id);
                    setShowGeneratePass(true);
                  }}
                />
              ))}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {filteredQueue.filter(v => v.status === 'pending').map(visitor => (
                <VisitorQueueCard
                  key={visitor.id}
                  visitor={visitor}
                  onApprove={handleApproveVisitor}
                  onGeneratePass={() => {
                    setSelectedVisitor(visitor.id);
                    setShowGeneratePass(true);
                  }}
                />
              ))}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {filteredQueue.filter(v => v.status === 'approved').map(visitor => (
                <VisitorQueueCard
                  key={visitor.id}
                  visitor={visitor}
                  onApprove={handleApproveVisitor}
                  onGeneratePass={() => {
                    setSelectedVisitor(visitor.id);
                    setShowGeneratePass(true);
                  }}
                />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <QuickRegistrationDialog 
        open={showQuickReg}
        onOpenChange={setShowQuickReg}
        onSuccess={() => {
          fetchVisitorQueue();
          fetchTodayStats();
        }}
      />
      
      <GeneratePassDialog
        open={showGeneratePass}
        onOpenChange={setShowGeneratePass}
        visitRequestId={selectedVisitor}
        onSuccess={() => {
          fetchVisitorQueue();
        }}
      />
    </div>
  );
}