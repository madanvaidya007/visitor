import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFileManager } from '@/hooks/useFileManager';
import { FileUpload, UploadedFile } from '@/components/ui/FileUpload';
import { 
  Upload, 
  Download, 
  Trash2, 
  RefreshCw, 
  HardDrive, 
  Cloud, 
  Eye, 
  FileText, 
  Image, 
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

interface FileManagerProps {
  visitRequestId?: string;
  allowedTypes?: ('image' | 'document' | 'pdf')[];
  maxFiles?: number;
  maxSize?: number;
  autoSync?: boolean;
  showStats?: boolean;
  className?: string;
}

export function FileManager({
  visitRequestId,
  allowedTypes = ['image', 'document', 'pdf'],
  maxFiles = 10,
  maxSize = 10,
  autoSync = true,
  showStats = true,
  className
}: FileManagerProps) {
  const { toast } = useToast();
  const [selectedDocumentType, setSelectedDocumentType] = useState<'id_proof' | 'photo' | 'nda' | 'insurance' | 'other'>('other');
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const {
    isUploading,
    uploadProgress,
    localFiles,
    saveToLocalStorage,
    uploadToLocalStorage,
    processAllFiles,
    deleteLocalFile,
    clearLocalStorage,
    getStorageStats
  } = useFileManager({ autoSync });

  const stats = getStorageStats();

  const handleFilesChange = async (files: UploadedFile[]) => {
    if (files.length > 0) {
      await saveToLocalStorage(files);
    }
  };

  const handleSyncFile = async (fileId: string) => {
    const localFile = localFiles.find(f => f.id === fileId);
    if (!localFile) return;

    try {
      await uploadToLocalStorage(localFile, visitRequestId, selectedDocumentType);
      toast({
        title: 'File Processed',
        description: `${localFile.name} processed and stored locally`
      });
    } catch (error) {
      toast({
        title: 'Processing Failed',
        description: 'Failed to process file',
        variant: 'destructive'
      });
    }
  };

  const handleSyncAll = async () => {
    try {
      await processAllFiles();
    } catch (error) {
      toast({
        title: 'Processing Failed',
        description: 'Failed to process some files',
        variant: 'destructive'
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Manager
              </CardTitle>
              <CardDescription>
                Upload and manage your documents and photos
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {stats.pendingFiles > 0 && (
                <Button
                  onClick={handleSyncAll}
                  disabled={isUploading}
                  size="sm"
                  variant="outline"
                >
                  {isUploading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Process All ({stats.pendingFiles})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Type</label>
            <Select value={selectedDocumentType} onValueChange={(value: any) => setSelectedDocumentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="id_proof">ID Proof</SelectItem>
                <SelectItem value="nda">NDA Document</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Component */}
          <FileUpload
            allowedTypes={allowedTypes}
            maxFiles={maxFiles}
            maxSize={maxSize}
            onFilesChange={handleFilesChange}
            showPreview={true}
            autoUpload={false}
          />

          {/* Storage Statistics */}
          {showStats && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{stats.totalLocalFiles}</div>
                    <div className="text-xs text-muted-foreground">Local Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{stats.pendingFiles}</div>
                    <div className="text-xs text-muted-foreground">Pending Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{formatFileSize(stats.totalLocalSize)}</div>
                    <div className="text-xs text-muted-foreground">Total Size</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* File Management Tabs */}
          <Tabs defaultValue="local" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="local" className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Local Files ({stats.totalLocalFiles})
              </TabsTrigger>
            </TabsList>

            {/* Local Files Tab */}
            <TabsContent value="local" className="space-y-4">
              {localFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No local files found. Upload some files to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {localFiles.map((file) => (
                    <Card key={file.id} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)} • {format(new Date(file.uploadedAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                          
                          {uploadProgress[file.id] !== undefined && (
                            <Progress value={uploadProgress[file.id]} className="mt-2 h-1" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {file.synced ? (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Synced
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Local
                            </Badge>
                          )}

                          {!file.synced && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncFile(file.id)}
                              disabled={isUploading}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Sync
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteLocalFile(file.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Clear Storage Button */}
          {localFiles.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={clearLocalStorage}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Local Storage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FileManager;