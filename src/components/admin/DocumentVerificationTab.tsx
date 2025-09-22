import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, FileText, Clock, User, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  file_url: string;
  created_at: string;
  user_id: string;
  rejection_reason?: string;
  profiles: {
    full_name: string;
    email: string;
    company?: string;
  };
}

export function DocumentVerificationTab() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            company
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data as any || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching documents',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAction = async () => {
    if (!selectedDocument) return;

    try {
      const updateData: any = {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        updated_at: new Date().toISOString()
      };

      if (actionType === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', selectedDocument.id);

      if (error) throw error;

      toast({
        title: `Document ${actionType}`,
        description: `Document has been ${actionType} successfully.`
      });

      fetchDocuments();
      setActionDialogOpen(false);
      setRejectionReason('');
      setSelectedDocument(null);
    } catch (error: any) {
      toast({
        title: 'Error updating document',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (activeTab === 'all') return true;
    return doc.status === activeTab;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Document Verification</h2>
        <p className="text-muted-foreground">Review and verify uploaded documents</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({documents.filter(d => d.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({documents.filter(d => d.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({documents.filter(d => d.status === 'rejected').length})</TabsTrigger>
          <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Documents</h3>
                  <p className="text-muted-foreground">
                    No documents found for this status.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredDocuments.map((document) => (
                <Card key={document.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <h3 className="font-semibold">{document.name}</h3>
                          {getStatusBadge(document.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{document.profiles.full_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            <span>{document.profiles.company || 'N/A'}</span>
                          </div>
                          <span>Type: {document.type.replace('_', ' ').toUpperCase()}</span>
                          <span>Uploaded: {new Date(document.created_at).toLocaleDateString()}</span>
                        </div>

                        {document.status === 'rejected' && document.rejection_reason && (
                          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                            <p className="text-sm text-red-800">
                              <strong>Rejection Reason:</strong> {document.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(document);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>

                        {document.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(document);
                                setActionType('approve');
                                setActionDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(document);
                                setActionType('reject');
                                setActionDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Document View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>View Document: {selectedDocument?.name}</DialogTitle>
            <DialogDescription>
              Document uploaded by {selectedDocument?.profiles.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                {selectedDocument.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img 
                    src={selectedDocument.file_url} 
                    alt={selectedDocument.name}
                    className="w-full h-full object-contain"
                  />
                ) : selectedDocument.file_url.match(/\.pdf$/i) ? (
                  <iframe 
                    src={selectedDocument.file_url}
                    className="w-full h-full"
                    title={selectedDocument.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileText className="h-16 w-16 text-gray-400" />
                    <div className="ml-4">
                      <p className="font-medium">Document Preview</p>
                      <p className="text-sm text-gray-600">Preview not available for this file type</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => window.open(selectedDocument.file_url, '_blank')}
                      >
                        Download File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Document' : 'Reject Document'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} this document?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === 'reject' && (
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please provide a reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleDocumentAction}
                disabled={actionType === 'reject' && !rejectionReason.trim()}
              >
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}