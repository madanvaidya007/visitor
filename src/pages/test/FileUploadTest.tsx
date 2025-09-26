import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileManager } from '@/components/ui/FileManager';
import { useAuth } from '@/hooks/useAuth';
import { 
  Upload, 
  HardDrive, 
  Cloud, 
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function FileUploadTest() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to test the file upload functionality.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">File Upload Test</h1>
        <p className="text-muted-foreground">
          Test the complete file upload functionality including local storage and database sync.
        </p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Test Environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">User</p>
              <p className="text-sm text-muted-foreground">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Role</p>
              <Badge variant="outline">{profile.role}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">User ID</p>
              <p className="text-sm text-muted-foreground font-mono">{profile.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              File Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Drag & drop support</li>
              <li>• Multiple file types</li>
              <li>• File size validation</li>
              <li>• Image preview</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="h-5 w-5" />
              Local Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Offline file storage</li>
              <li>• Base64 encoding</li>
              <li>• Persistent across sessions</li>
              <li>• Sync status tracking</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cloud className="h-5 w-5" />
              Database Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Supabase storage</li>
              <li>• Metadata tracking</li>
              <li>• File categorization</li>
              <li>• Auto-retry on failure</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>How to test:</strong>
          <ol className="mt-2 space-y-1 text-sm">
            <li>1. Select a document type from the dropdown</li>
            <li>2. Upload files by dragging & dropping or clicking the upload area</li>
            <li>3. Files will be saved to local storage automatically</li>
            <li>4. Click "Sync" to upload files to the database</li>
            <li>5. Switch between "Local Files" and "Database Files" tabs to see the results</li>
            <li>6. Use the preview feature to view uploaded images</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* File Manager Component */}
      <FileManager
        allowedTypes={['image', 'document', 'pdf']}
        maxFiles={10}
        maxSize={10}
        autoSync={false}
        showStats={true}
        className="w-full"
      />

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>
            Details about the file upload system architecture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Components</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <code>FileUpload</code> - Drag & drop upload component</li>
                <li>• <code>FileManager</code> - Complete file management UI</li>
                <li>• <code>useFileManager</code> - File operations hook</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Storage</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Local: Browser localStorage (base64)</li>
                <li>• Remote: Supabase Storage bucket</li>
                <li>• Database: documents table metadata</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}