import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface DocumentFile {
  file: File;
  type: 'id_proof' | 'nda' | 'other';
  uploaded: boolean;
  url?: string;
  uploading?: boolean;
}

export function DocumentUploadDialog() {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newDocuments: DocumentFile[] = files.map(file => ({
      file,
      type: 'other',
      uploaded: false,
      uploading: false
    }));
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const setDocumentType = (index: number, type: DocumentFile['type']) => {
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, type } : doc
    ));
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocument = async (document: DocumentFile, index: number) => {
    if (!profile) return;

    // Mark as uploading
    setDocuments(prev => prev.map((doc, i) => 
      i === index ? { ...doc, uploading: true } : doc
    ));

    try {
      const fileExt = document.file.name.split('.').pop();
      const fileName = `${profile.id}/${document.type}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, document.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Update profile with document URL
      const updateField = document.type === 'id_proof' ? 'id_proof_url' : null;
      if (updateField) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ [updateField]: publicUrl })
          .eq('id', profile.id);

        if (updateError) throw updateError;
      }

      // Mark as uploaded
      setDocuments(prev => prev.map((doc, i) => 
        i === index ? { ...doc, uploaded: true, url: publicUrl, uploading: false } : doc
      ));

      toast({
        title: 'Document uploaded',
        description: `${document.type.replace('_', ' ')} uploaded successfully.`
      });

    } catch (error: any) {
      setDocuments(prev => prev.map((doc, i) => 
        i === index ? { ...doc, uploading: false } : doc
      ));
      
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const uploadAllDocuments = async () => {
    const pendingDocs = documents.filter(doc => !doc.uploaded && !doc.uploading);
    
    for (let i = 0; i < pendingDocs.length; i++) {
      const docIndex = documents.findIndex(d => d === pendingDocs[i]);
      await uploadDocument(pendingDocs[i], docIndex);
      setUploadProgress(((i + 1) / pendingDocs.length) * 100);
    }
    
    setUploadProgress(0);
  };

  const getDocumentTypeColor = (type: DocumentFile['type']) => {
    switch (type) {
      case 'id_proof': return 'bg-primary text-primary-foreground';
      case 'nda': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FileText className="h-4 w-4 mr-2" />
          Upload Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload required documents for your visit requests
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Click to upload or drag and drop files
            </p>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Files
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              PDF, JPG, PNG, DOC up to 10MB
            </p>
          </div>

          {/* Document List */}
          {documents.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Selected Documents</h4>
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  
                  {/* Document Type */}
                  <select
                    value={doc.type}
                    onChange={(e) => setDocumentType(index, e.target.value as DocumentFile['type'])}
                    className="text-xs border rounded px-2 py-1"
                    disabled={doc.uploaded || doc.uploading}
                  >
                    <option value="other">Other</option>
                    <option value="id_proof">ID Proof</option>
                    <option value="nda">NDA</option>
                  </select>

                  {/* Status */}
                  {doc.uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : doc.uploaded ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDocument(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading documents...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
            {documents.some(doc => !doc.uploaded) && (
              <Button 
                onClick={uploadAllDocuments}
                disabled={documents.some(doc => doc.uploading)}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload All
              </Button>
            )}
          </div>

          {/* Document Requirements */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h5 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Document Requirements
            </h5>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• ID Proof: Government issued ID (required for all visits)</p>
              <p>• NDA: Non-disclosure agreement (required for sensitive areas)</p>
              <p>• Maximum file size: 10MB per document</p>
              <p>• Accepted formats: PDF, JPG, PNG, DOC, DOCX</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}