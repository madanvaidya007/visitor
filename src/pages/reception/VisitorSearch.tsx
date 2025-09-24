import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  User, 
  Building, 
  Clock, 
  Phone, 
  Mail, 
  MapPin,
  Eye,
  Download,
  RefreshCw,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  History,
  FileText,
  QrCode
} from 'lucide-react';

interface VisitorRecord {
  id: string;
  visitor_name: string;
  visitor_email?: string;
  visitor_phone?: string;
  visitor_company?: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out';
  host_name: string;
  created_at: string;
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
}

interface SearchFilters {
  searchTerm: string;
  status: string;
  dateFrom?: Date;
  dateTo?: Date;
  company: string;
  host: string;
}

export default function VisitorSearch() {
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<VisitorRecord[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    status: 'all',
    company: 'all',
    host: 'all'
  });

  const [companies, setCompanies] = useState<string[]>([]);
  const [hosts, setHosts] = useState<string[]>([]);

  useEffect(() => {
    fetchVisitors();
  }, []);

  useEffect(() => {
    filterVisitors();
  }, [visitors, filters]);

  const fetchVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const visitorRecords: VisitorRecord[] = (data || []).map(record => ({
        id: record.id,
        visitor_name: record.visitor_name,
        visitor_email: record.visitor_email,
        visitor_phone: record.visitor_phone,
        visitor_company: record.visitor_company,
        purpose: record.purpose,
        visit_date: record.visit_date,
        start_time: record.start_time,
        end_time: record.end_time,
        status: record.status,
        host_name: record.host_name,
        created_at: record.created_at,
        check_in_time: record.check_in_time,
        check_out_time: record.check_out_time,
        notes: record.notes
      }));

      setVisitors(visitorRecords);

      // Extract unique companies and hosts for filters
      const uniqueCompanies = [...new Set(visitorRecords
        .map(v => v.visitor_company)
        .filter(Boolean))] as string[];
      const uniqueHosts = [...new Set(visitorRecords.map(v => v.host_name))];

      setCompanies(uniqueCompanies);
      setHosts(uniqueHosts);
    } catch (error) {
      console.error('Error fetching visitors:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch visitor records',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterVisitors = () => {
    setIsSearching(true);
    
    let filtered = visitors;

    // Text search
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(visitor =>
        visitor.visitor_name.toLowerCase().includes(searchLower) ||
        visitor.visitor_email?.toLowerCase().includes(searchLower) ||
        visitor.visitor_phone?.includes(filters.searchTerm) ||
        visitor.visitor_company?.toLowerCase().includes(searchLower) ||
        visitor.host_name.toLowerCase().includes(searchLower) ||
        visitor.purpose.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(visitor => visitor.status === filters.status);
    }

    // Company filter
    if (filters.company !== 'all') {
      filtered = filtered.filter(visitor => visitor.visitor_company === filters.company);
    }

    // Host filter
    if (filters.host !== 'all') {
      filtered = filtered.filter(visitor => visitor.host_name === filters.host);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(visitor => 
        new Date(visitor.visit_date) >= filters.dateFrom!
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(visitor => 
        new Date(visitor.visit_date) <= filters.dateTo!
      );
    }

    setFilteredVisitors(filtered);
    setTimeout(() => setIsSearching(false), 300);
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'all',
      company: 'all',
      host: 'all'
    });
  };

  const exportResults = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Company', 'Host', 'Purpose', 'Visit Date', 'Time', 'Status', 'Check In', 'Check Out'].join(','),
      ...filteredVisitors.map(visitor => [
        visitor.visitor_name,
        visitor.visitor_email || '',
        visitor.visitor_phone || '',
        visitor.visitor_company || '',
        visitor.host_name,
        visitor.purpose,
        visitor.visit_date,
        `${visitor.start_time} - ${visitor.end_time}`,
        visitor.status,
        visitor.check_in_time || '',
        visitor.check_out_time || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-search-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Visitor search results have been exported to CSV',
    });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <UserX className="h-4 w-4" />;
      case 'checked_in': return <UserCheck className="h-4 w-4" />;
      case 'checked_out': return <UserX className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'NA';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDuration = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return 'N/A';
    
    const inTime = new Date(`2000-01-01T${checkIn}`);
    const outTime = new Date(`2000-01-01T${checkOut}`);
    const diffMs = outTime.getTime() - inTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const VisitorCard = ({ visitor }: { visitor: VisitorRecord }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => {
            setSelectedVisitor(visitor);
            setShowDetailsDialog(true);
          }}>
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
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="space-y-1">
                  {visitor.visitor_company && (
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      <span>{visitor.visitor_company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Host: {visitor.host_name}</span>
                  </div>
                  {visitor.visitor_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{visitor.visitor_phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{new Date(visitor.visit_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{visitor.start_time} - {visitor.end_time}</span>
                  </div>
                  {visitor.visitor_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{visitor.visitor_email}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-sm mt-2 text-gray-600 line-clamp-2">{visitor.purpose}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" />
              View Details
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
          <h1 className="text-3xl font-bold tracking-tight">Visitor Search</h1>
          <p className="text-muted-foreground">
            Search and filter visitor records and history
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportResults} disabled={filteredVisitors.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button onClick={fetchVisitors}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, email, phone, company, host, or purpose..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.company} 
              onValueChange={(value) => setFilters({ ...filters, company: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.host} 
              onValueChange={(value) => setFilters({ ...filters, host: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Hosts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hosts</SelectItem>
                {hosts.map(host => (
                  <SelectItem key={host} value={host}>{host}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>

          {/* Date range */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Search Results ({filteredVisitors.length})</span>
            {isSearching && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading visitor records...</div>
          ) : filteredVisitors.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">
                {filters.searchTerm || filters.status !== 'all' || filters.company !== 'all' || filters.host !== 'all' || filters.dateFrom || filters.dateTo
                  ? 'No visitors found matching your search criteria'
                  : 'No visitor records found'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVisitors.map((visitor) => (
                <VisitorCard key={visitor.id} visitor={visitor} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visitor Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Visitor Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedVisitor?.visitor_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVisitor && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Visitor Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {selectedVisitor.visitor_name}</div>
                      {selectedVisitor.visitor_email && (
                        <div><strong>Email:</strong> {selectedVisitor.visitor_email}</div>
                      )}
                      {selectedVisitor.visitor_phone && (
                        <div><strong>Phone:</strong> {selectedVisitor.visitor_phone}</div>
                      )}
                      {selectedVisitor.visitor_company && (
                        <div><strong>Company:</strong> {selectedVisitor.visitor_company}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Visit Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Host:</strong> {selectedVisitor.host_name}</div>
                      <div><strong>Date:</strong> {new Date(selectedVisitor.visit_date).toLocaleDateString()}</div>
                      <div><strong>Scheduled Time:</strong> {selectedVisitor.start_time} - {selectedVisitor.end_time}</div>
                      <div className="flex items-center gap-2">
                        <strong>Status:</strong>
                        <Badge className={getStatusColor(selectedVisitor.status)}>
                          {getStatusIcon(selectedVisitor.status)}
                          <span className="ml-1 capitalize">{selectedVisitor.status}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <h4 className="font-semibold mb-2">Purpose of Visit</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedVisitor.purpose}
                </p>
              </div>

              {/* Check-in/out times */}
              {(selectedVisitor.check_in_time || selectedVisitor.check_out_time) && (
                <div>
                  <h4 className="font-semibold mb-2">Actual Visit Times</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {selectedVisitor.check_in_time && (
                      <div>
                        <strong>Check In:</strong><br />
                        {selectedVisitor.check_in_time}
                      </div>
                    )}
                    {selectedVisitor.check_out_time && (
                      <div>
                        <strong>Check Out:</strong><br />
                        {selectedVisitor.check_out_time}
                      </div>
                    )}
                    <div>
                      <strong>Duration:</strong><br />
                      {formatDuration(selectedVisitor.check_in_time, selectedVisitor.check_out_time)}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedVisitor.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedVisitor.notes}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Record Information</h4>
                <div className="text-xs text-gray-500">
                  <div>Created: {new Date(selectedVisitor.created_at).toLocaleString()}</div>
                  <div>Record ID: {selectedVisitor.id}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}