import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search,
  Filter,
  RefreshCw,
  Shield,
  Clock,
  User,
  Building,
  Calendar,
  Plus,
  Edit,
  Archive,
  Star,
  Paperclip
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DocumentUploadDialog } from '@/components/visitor/DocumentUploadDialog';

interface Document {
  id: string;
  name: string;
  type: 'id_proof' | 'nda' | 'photo' | 'other';
  category: 'required' | 'optional' | 'archived';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  file_url: string;
  file_size: number;
  uploaded_at: string;
  expires_at?: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  visit_request_id?: string;
}

interface DocumentRequirement {
  type: string;
  name: string;
  description: string;
  required: boolean;
  expires: boolean;
  max_size_mb: number;
  accepted_formats: string[];
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  const documentRequirements: DocumentRequirement[] = [
    {
      type: 'id_proof',
      name: 'Government ID',
      description: 'Valid government-issued identification document',
      required: true,
      expires: false,
      max_size_mb: 10,
      accepted_formats: ['PDF', 'JPG', 'PNG']
    },
    {
      type: 'photo',
      name: 'Profile Photo',
      description: 'Recent passport-style photograph',
      required: true,
      expires: false,
      max_size_mb: 5,
      accepted_formats: ['JPG', 'PNG']
    },
    {
      type: 'nda',
      name: 'Non-Disclosure Agreement',
      description: 'Signed NDA for sensitive area access',
      required: false,
      expires: true,
      max_size_mb: 10,
      accepted_formats: ['PDF']
    },
    {
      type: 'other',
      name: 'Additional Documents',
      description: 'Any other supporting documents',
      required: false,
      expires: false,
      max_size_mb: 10,
      accepted_formats: ['PDF', 'JPG', 'PNG', 'DOC', 'DOCX']
    }
  ];

  useEffect(() => {
    fetchDocuments();
  }, [profile]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, statusFilter, typeFilter]);

  const fetchDocuments = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Fetch real documents from Supabase
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          verified_by_profile:profiles!documents_verified_by_fkey(full_name)
        `)
        .eq('user_id', profile.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Document interface
      const transformedDocuments: Document[] = (data || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type as Document['type'],
        category: doc.category as Document['category'],
        status: doc.status as Document['status'],
        file_url: doc.file_url,
        file_size: doc.file_size,
        uploaded_at: doc.uploaded_at,
        expires_at: doc.expires_at,
        verified_by: doc.verified_by_profile?.full_name,
        verified_at: doc.verified_at,
        rejection_reason: doc.rejection_reason,
        visit_request_id: doc.visit_request_id
      }));

      setDocuments(transformedDocuments);
    } catch (error: any) {
      toast({
        title: 'Error loading documents',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    setFilteredDocuments(filtered);
  };

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: Document['type']) => {
    switch (type) {
      case 'id_proof': return <Shield className="h-4 w-4" />;
      case 'photo': return <User className="h-4 w-4" />;
      case 'nda': return <FileText className="h-4 w-4" />;
      default: return <Paperclip className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (document: Document) => {
    try {
      // Get signed URL for secure download
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_url.split('/').pop() || '', 3600); // 1 hour expiry

      if (error) throw error;

      // Create download link
      const link = window.document.createElement('a');
      link.href = data.signedUrl;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      toast({
        title: 'Download started',
        description: `Downloading ${document.name}...`
      });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      // Find the document to get file path
      const documentToDelete = documents.find(doc => doc.id === documentId);
      if (!documentToDelete) return;

      // Delete from database first
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([documentToDelete.file_url.split('/').slice(-3).join('/')]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
        // Don't throw here as the database record is already deleted
      }

      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      toast({
        title: 'Document deleted',
        description: 'Document has been successfully removed.'
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting document',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getCompletionPercentage = () => {
    const requiredDocs = documentRequirements.filter(req => req.required);
    const approvedRequiredDocs = documents.filter(doc => 
      requiredDocs.some(req => req.type === doc.type) && doc.status === 'approved'
    );
    return Math.round((approvedRequiredDocs.length / requiredDocs.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Documents</h1>
          <p className="text-muted-foreground">Manage your uploaded documents and requirements</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Document Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Document Completion Status
          </CardTitle>
          <CardDescription>
            Track your progress on required document uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{getCompletionPercentage()}%</span>
            </div>
            <Progress value={getCompletionPercentage()} className="w-full" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {documentRequirements.map((req) => {
                const userDoc = documents.find(doc => doc.type === req.type && doc.status === 'approved');
                const isComplete = !!userDoc;
                
                return (
                  <div key={req.type} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-lg ${isComplete ? 'bg-green-100' : req.required ? 'bg-red-100' : 'bg-gray-100'}`}>
                      {getTypeIcon(req.type as Document['type'])}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{req.name}</span>
                        {req.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{req.description}</p>
                    </div>
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : req.required ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="id_proof">ID Proof</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="nda">NDA</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchDocuments}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid" className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {documents.length === 0 
                    ? "You haven't uploaded any documents yet. Start by uploading your required documents."
                    : "No documents match your current filters. Try adjusting your search criteria."
                  }
                </p>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((document) => (
                <Card key={document.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(document.type)}
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm truncate">{document.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {formatFileSize(document.file_size)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(document.status)}`}>
                        {getStatusIcon(document.status)}
                        <span className="ml-1 capitalize">{document.status}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="h-3 w-3" />
                          Uploaded {format(new Date(document.uploaded_at), 'MMM dd, yyyy')}
                        </div>
                        {document.verified_at && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified by {document.verified_by}
                          </div>
                        )}
                        {document.expires_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires {format(new Date(document.expires_at), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>

                      {document.rejection_reason && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {document.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(document)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredDocuments.map((document) => (
                  <div key={document.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getTypeIcon(document.type)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{document.name}</h3>
                            <Badge className={`text-xs ${getStatusColor(document.status)}`}>
                              {getStatusIcon(document.status)}
                              <span className="ml-1 capitalize">{document.status}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatFileSize(document.file_size)}</span>
                            <span>Uploaded {format(new Date(document.uploaded_at), 'MMM dd, yyyy')}</span>
                            {document.verified_at && (
                              <span>Verified by {document.verified_by}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(document)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {document.rejection_reason && (
                      <Alert className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {document.rejection_reason}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Requirements Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Document Requirements
          </CardTitle>
          <CardDescription>
            Important information about document uploads and requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Upload Guidelines</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Maximum file size: 10MB per document</li>
                <li>• Accepted formats: PDF, JPG, PNG, DOC, DOCX</li>
                <li>• Ensure documents are clear and readable</li>
                <li>• All required documents must be approved for visit access</li>
                <li>• Documents are securely stored and encrypted</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Verification Process</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Documents are reviewed within 24-48 hours</li>
                <li>• You'll receive notifications about approval status</li>
                <li>• Rejected documents include feedback for resubmission</li>
                <li>• Some documents may require periodic renewal</li>
                <li>• Contact support for verification questions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <DocumentUploadDialog 
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={() => {
          fetchDocuments();
        }}
      />
    </div>
  );
}