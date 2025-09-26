import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UploadedFile } from '@/components/ui/FileUpload';

interface FileManagerOptions {
  autoSync?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface LocalStorageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64 encoded
  uploadedAt: string;
  synced: boolean;
  databaseId?: string;
}

interface DatabaseDocument {
  id: string;
  user_id: string;
  visit_request_id?: string;
  name: string;
  type: 'id_proof' | 'photo' | 'nda' | 'insurance' | 'other';
  category: 'required' | 'optional' | 'archived';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  file_url: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  uploaded_at: string;
  metadata?: any;
}

export function useFileManager(options: FileManagerOptions = {}) {
  const { autoSync = true, maxRetries = 3, retryDelay = 1000 } = options;
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [localFiles, setLocalFiles] = useState<LocalStorageFile[]>([]);
  const [databaseFiles, setDatabaseFiles] = useState<DatabaseDocument[]>([]);

  // Local Storage Keys
  const LOCAL_STORAGE_KEY = 'fileManager_files';
  const SYNC_QUEUE_KEY = 'fileManager_syncQueue';

  // Load files from localStorage on mount
  useEffect(() => {
    loadLocalFiles();
    if (profile) {
      loadDatabaseFiles();
    }
  }, [profile]);

  // Auto-process files if enabled
  useEffect(() => {
    if (autoSync && profile) {
      processAllFiles();
    }
  }, [autoSync, profile, processAllFiles]);

  const loadLocalFiles = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const files = JSON.parse(stored) as LocalStorageFile[];
        setLocalFiles(files);
      }
    } catch (error) {
      console.error('Failed to load local files:', error);
    }
  }, []);

  const saveLocalFiles = useCallback((files: LocalStorageFile[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(files));
      setLocalFiles(files);
    } catch (error) {
      console.error('Failed to save local files:', error);
      toast({
        title: 'Storage Error',
        description: 'Failed to save files to local storage',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const loadDatabaseFiles = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', profile.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDatabaseFiles(data || []);
    } catch (error) {
      console.error('Failed to load database files:', error);
    }
  }, [profile]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const arr = base64.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mimeType });
  };

  const saveToLocalStorage = useCallback(async (files: UploadedFile[]): Promise<void> => {
    try {
      const newLocalFiles: LocalStorageFile[] = [];

      for (const uploadedFile of files) {
        const base64Data = await fileToBase64(uploadedFile.file);
        
        const localFile: LocalStorageFile = {
          id: uploadedFile.id,
          name: uploadedFile.file.name,
          size: uploadedFile.file.size,
          type: uploadedFile.file.type,
          data: base64Data,
          uploadedAt: new Date().toISOString(),
          synced: false
        };

        newLocalFiles.push(localFile);
      }

      const updatedFiles = [...localFiles, ...newLocalFiles];
      saveLocalFiles(updatedFiles);

      toast({
        title: 'Files Saved Locally',
        description: `${newLocalFiles.length} file(s) saved to local storage`
      });

    } catch (error) {
      console.error('Failed to save files to local storage:', error);
      toast({
        title: 'Storage Error',
        description: 'Failed to save files to local storage',
        variant: 'destructive'
      });
    }
  }, [localFiles, saveLocalFiles, toast]);

  const uploadToLocalStorage = useCallback(async (
    localFile: LocalStorageFile,
    visitRequestId?: string,
    documentType: 'id_proof' | 'photo' | 'nda' | 'insurance' | 'other' = 'other'
  ): Promise<string | null> => {
    if (!profile) {
      throw new Error('User not authenticated');
    }

    try {
      setUploadProgress(prev => ({ ...prev, [localFile.id]: 0 }));

      // Mark file as processed and add metadata
      const updatedFile = {
        ...localFile,
        synced: true, // Mark as "synced" to local storage
        metadata: {
          ...localFile.metadata,
          visitRequestId,
          documentType,
          processedAt: new Date().toISOString(),
          userId: profile.id,
          status: 'stored_locally'
        }
      };

      setUploadProgress(prev => ({ ...prev, [localFile.id]: 50 }));

      // Update local storage with the processed file
      const updatedLocalFiles = localFiles.map(f => 
        f.id === localFile.id ? updatedFile : f
      );
      saveLocalFiles(updatedLocalFiles);

      setUploadProgress(prev => ({ ...prev, [localFile.id]: 100 }));

      toast({
        title: 'File Stored',
        description: `${localFile.name} has been stored locally`,
        variant: 'default'
      });

      return localFile.id;
    } catch (error) {
      console.error('Failed to store file locally:', error);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[localFile.id];
        return newProgress;
      });
      
      toast({
        title: 'Storage Failed',
        description: `Failed to store ${localFile.name} locally`,
        variant: 'destructive'
      });
      
      throw error;
    }
  }, [profile, localFiles, saveLocalFiles, toast]);

  const processAllFiles = useCallback(async (): Promise<void> => {
    if (!profile || isUploading) return;

    const unprocessedFiles = localFiles.filter(f => !f.synced);
    if (unprocessedFiles.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of unprocessedFiles) {
        let retries = 0;
        let success = false;

        while (retries < maxRetries && !success) {
          try {
            await uploadToLocalStorage(file);
            success = true;
            
            toast({
              title: 'File Processed',
              description: `${file.name} stored locally`
            });

          } catch (error) {
            retries++;
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
            } else {
              console.error(`Failed to process ${file.name} after ${maxRetries} retries:`, error);
              toast({
                title: 'Processing Failed',
                description: `Failed to process ${file.name}`,
                variant: 'destructive'
              });
            }
          }
        }
      }
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }, [profile, localFiles, isUploading, maxRetries, retryDelay, uploadToLocalStorage, toast]);

  const deleteLocalFile = useCallback((fileId: string) => {
    const updatedFiles = localFiles.filter(f => f.id !== fileId);
    saveLocalFiles(updatedFiles);
  }, [localFiles, saveLocalFiles]);

  const deleteDatabaseFile = useCallback(async (documentId: string): Promise<void> => {
    try {
      const document = databaseFiles.find(d => d.id === documentId);
      if (!document) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) {
        console.error('Failed to delete from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Refresh database files
      await loadDatabaseFiles();

      toast({
        title: 'File Deleted',
        description: 'File removed from database and storage'
      });

    } catch (error) {
      console.error('Failed to delete database file:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete file',
        variant: 'destructive'
      });
    }
  }, [databaseFiles, loadDatabaseFiles, toast]);

  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
    setLocalFiles([]);
    setUploadProgress({});
  }, []);

  const getStorageStats = useCallback(() => {
    const totalLocalFiles = localFiles.length;
    const syncedFiles = localFiles.filter(f => f.synced).length;
    const pendingFiles = totalLocalFiles - syncedFiles;
    const totalLocalSize = localFiles.reduce((sum, f) => sum + f.size, 0);
    const totalDatabaseSize = databaseFiles.reduce((sum, f) => sum + f.file_size, 0);

    return {
      totalLocalFiles,
      syncedFiles,
      pendingFiles,
      totalLocalSize,
      totalDatabaseSize,
      totalDatabaseFiles: databaseFiles.length
    };
  }, [localFiles, databaseFiles]);

  return {
    // State
    isUploading,
    uploadProgress,
    localFiles,
    databaseFiles,

    // Actions
    saveToLocalStorage,
    uploadToLocalStorage,
    processAllFiles,
    deleteLocalFile,
    deleteDatabaseFile,
    clearLocalStorage,
    loadDatabaseFiles,

    // Utils
    getStorageStats,
    fileToBase64,
    base64ToFile
  };
}

export default useFileManager;