import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  User, 
  Building, 
  Calendar,
  Printer,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { LegacyVisitRequest as VisitRequest, GeneratedPass } from '@/types/visitTypes';

export default function GeneratePass() {
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [generatedPasses, setGeneratedPasses] = useState<GeneratedPass[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VisitRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('approved');
  const [selectedRequest, setSelectedRequest] = useState<VisitRequest | null>(null);
  const [showPassDialog, setShowPassDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVisitRequests();
    fetchGeneratedPasses();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [visitRequests, searchTerm, statusFilter]);

  const fetchVisitRequests = async () => {
    try {
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
        .in('status', ['approved', 'checked_in'])
        .order('visit_date', { ascending: true });

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
      
      setVisitRequests(mappedData);
    } catch (error) {
      console.error('Error fetching visit requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch visit requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGeneratedPasses = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          *,
          visitor:profiles!visit_requests_visitor_id_fkey(
            full_name,
            company
          ),
          host:profiles!visit_requests_host_id_fkey(
            full_name
          )
        `)
        .not('qr_code', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const passes: GeneratedPass[] = (data || []).map(request => ({
        id: request.id,
        visitor_name: request.visitor?.full_name || '',
        visitor_company: request.visitor?.company,
        host_name: request.host?.full_name || '',
        visit_date: request.visit_date,
        start_time: request.start_time,
        end_time: request.end_time,
        qr_code: request.qr_code || '',
        pass_number: `PASS-${request.id.slice(-8).toUpperCase()}`,
        status: request.status
      }));
      
      setGeneratedPasses(passes);
    } catch (error) {
      console.error('Error fetching generated passes:', error);
    }
  };

  const filterRequests = () => {
    let filtered = visitRequests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.visitor_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.host_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    setFilteredRequests(filtered);
  };

  const generateQRCode = (data: string): string => {
    try {
      // Simple QR code generation - in production, use a proper QR code library
      const qr = require('qrcode-generator')(4, 'L');
      qr.addData(data);
      qr.make();
      return qr.createDataURL(4);
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const generatePass = async (request: VisitRequest) => {
    setIsGenerating(true);
    try {
      const passData = {
        visitor_name: request.visitor_name,
        visitor_company: request.visitor_company,
        host_name: request.host_name,
        visit_date: request.visit_date,
        start_time: request.start_time,
        end_time: request.end_time,
        purpose: request.purpose,
        pass_id: `PASS-${request.id.slice(-8).toUpperCase()}`,
        generated_at: new Date().toISOString()
      };

      const qrCodeData = generateQRCode(JSON.stringify(passData));

      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          qr_code: qrCodeData,
          pass_generated: true
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Pass Generated',
        description: `Digital pass generated for ${request.visitor_name}`,
      });

      fetchVisitRequests();
      fetchGeneratedPasses();
      setSelectedRequest({ ...request, qr_code: qrCodeData, pass_generated: true });
      setShowPassDialog(true);
    } catch (error) {
      console.error('Error generating pass:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate pass',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPass = (pass: GeneratedPass) => {
    // Create a simple pass design
    const passHtml = `
      <div style="width: 400px; padding: 20px; border: 2px solid #333; font-family: Arial, sans-serif;">
        <h2 style="text-align: center; margin-bottom: 20px;">VISITOR PASS</h2>
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${pass.qr_code}" alt="QR Code" style="width: 150px; height: 150px;" />
        </div>
        <div style="margin-bottom: 10px;"><strong>Pass #:</strong> ${pass.pass_number}</div>
        <div style="margin-bottom: 10px;"><strong>Visitor:</strong> ${pass.visitor_name}</div>
        ${pass.visitor_company ? `<div style="margin-bottom: 10px;"><strong>Company:</strong> ${pass.visitor_company}</div>` : ''}
        <div style="margin-bottom: 10px;"><strong>Host:</strong> ${pass.host_name}</div>
        <div style="margin-bottom: 10px;"><strong>Date:</strong> ${new Date(pass.visit_date).toLocaleDateString()}</div>
        <div style="margin-bottom: 10px;"><strong>Time:</strong> ${pass.start_time} - ${pass.end_time}</div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
          Please present this pass at reception
        </div>
      </div>
    `;

    const blob = new Blob([passHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-pass-${pass.pass_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printPass = (pass: GeneratedPass) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Visitor Pass - ${pass.pass_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .pass { width: 400px; padding: 20px; border: 2px solid #333; }
              .qr-code { text-align: center; margin: 20px 0; }
              .qr-code img { width: 150px; height: 150px; }
              .info { margin-bottom: 10px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="pass">
              <h2 style="text-align: center;">VISITOR PASS</h2>
              <div class="qr-code">
                <img src="${pass.qr_code}" alt="QR Code" />
              </div>
              <div class="info"><strong>Pass #:</strong> ${pass.pass_number}</div>
              <div class="info"><strong>Visitor:</strong> ${pass.visitor_name}</div>
              ${pass.visitor_company ? `<div class="info"><strong>Company:</strong> ${pass.visitor_company}</div>` : ''}
              <div class="info"><strong>Host:</strong> ${pass.host_name}</div>
              <div class="info"><strong>Date:</strong> ${new Date(pass.visit_date).toLocaleDateString()}</div>
              <div class="info"><strong>Time:</strong> ${pass.start_time} - ${pass.end_time}</div>
              <div class="footer">Please present this pass at reception</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'checked_out': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'NA';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const RequestCard = ({ request }: { request: VisitRequest }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar>
              <AvatarFallback>{getInitials(request.visitor_name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{request.visitor_name}</h3>
                <Badge className={getStatusColor(request.status)}>
                  <span className="capitalize">{request.status}</span>
                </Badge>
                {request.pass_generated && (
                  <Badge className="bg-purple-100 text-purple-800">
                    <QrCode className="h-3 w-3 mr-1" />
                    Pass Generated
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                {request.visitor_company && (
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span>{request.visitor_company}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Visiting: {request.host_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(request.visit_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{request.start_time} - {request.end_time}</span>
                </div>
              </div>
              
              <p className="text-sm mt-2 text-gray-600">{request.purpose}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            {!request.pass_generated ? (
              <Button
                onClick={() => generatePass(request)}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4 mr-1" />
                )}
                Generate Pass
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSelectedRequest(request);
                  setShowPassDialog(true);
                }}
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Pass
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PassCard = ({ pass }: { pass: GeneratedPass }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar>
              <AvatarFallback>{getInitials(pass.visitor_name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{pass.visitor_name}</h3>
                <Badge className="bg-purple-100 text-purple-800">
                  {pass.pass_number}
                </Badge>
                <Badge className={getStatusColor(pass.status)}>
                  <span className="capitalize">{pass.status}</span>
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                {pass.visitor_company && (
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span>{pass.visitor_company}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Host: {pass.host_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(pass.visit_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{pass.start_time} - {pass.end_time}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadPass(pass)}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => printPass(pass)}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
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
          <h1 className="text-3xl font-bold tracking-tight">Generate Pass</h1>
          <p className="text-muted-foreground">
            Generate and manage digital visitor passes
          </p>
        </div>
        <Button onClick={fetchVisitRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">
            Generate Passes ({filteredRequests.length})
          </TabsTrigger>
          <TabsTrigger value="generated">
            Generated Passes ({generatedPasses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading visit requests...</div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-muted-foreground">No approved visits found</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>

        <TabsContent value="generated" className="space-y-4">
          {generatedPasses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <QrCode className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-muted-foreground">No passes generated yet</p>
              </CardContent>
            </Card>
          ) : (
            generatedPasses.map((pass) => (
              <PassCard key={pass.id} pass={pass} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Pass Preview Dialog */}
      <Dialog open={showPassDialog} onOpenChange={setShowPassDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Visitor Pass</DialogTitle>
            <DialogDescription>
              Digital pass for {selectedRequest?.visitor_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="text-center">
                {selectedRequest.qr_code && (
                  <img 
                    src={selectedRequest.qr_code} 
                    alt="QR Code" 
                    className="w-48 h-48 mx-auto border rounded"
                  />
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div><strong>Pass #:</strong> PASS-{selectedRequest.id.slice(-8).toUpperCase()}</div>
                <div><strong>Visitor:</strong> {selectedRequest.visitor_name}</div>
                {selectedRequest.visitor_company && (
                  <div><strong>Company:</strong> {selectedRequest.visitor_company}</div>
                )}
                <div><strong>Host:</strong> {selectedRequest.host_name}</div>
                <div><strong>Date:</strong> {new Date(selectedRequest.visit_date).toLocaleDateString()}</div>
                <div><strong>Time:</strong> {selectedRequest.start_time} - {selectedRequest.end_time}</div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    const pass: GeneratedPass = {
                      id: selectedRequest.id,
                      visitor_name: selectedRequest.visitor_name,
                      visitor_company: selectedRequest.visitor_company,
                      host_name: selectedRequest.host_name,
                      visit_date: selectedRequest.visit_date,
                      start_time: selectedRequest.start_time,
                      end_time: selectedRequest.end_time,
                      qr_code: selectedRequest.qr_code || '',
                      pass_number: `PASS-${selectedRequest.id.slice(-8).toUpperCase()}`,
                      status: selectedRequest.status
                    };
                    downloadPass(pass);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    const pass: GeneratedPass = {
                      id: selectedRequest.id,
                      visitor_name: selectedRequest.visitor_name,
                      visitor_company: selectedRequest.visitor_company,
                      host_name: selectedRequest.host_name,
                      visit_date: selectedRequest.visit_date,
                      start_time: selectedRequest.start_time,
                      end_time: selectedRequest.end_time,
                      qr_code: selectedRequest.qr_code || '',
                      pass_number: `PASS-${selectedRequest.id.slice(-8).toUpperCase()}`,
                      status: selectedRequest.status
                    };
                    printPass(pass);
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}