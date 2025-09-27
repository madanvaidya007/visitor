import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Camera, 
  Search,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { FaceDatabaseService, FaceProfile } from '@/services/faceDatabase';
import { FaceRecognitionService } from '@/services/faceRecognition';

interface FaceProfileManagerProps {
  onProfilesChange: () => void;
}

interface NewProfile {
  personId: string;
  personName: string;
  confidenceThreshold: number;
  imageFile?: File;
  faceEncoding?: string;
}

export const FaceProfileManager: React.FC<FaceProfileManagerProps> = ({ 
  onProfilesChange 
}) => {
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<FaceProfile | null>(null);
  const [newProfile, setNewProfile] = useState<NewProfile>({
    personId: '',
    personName: '',
    confidenceThreshold: 0.6
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const profileList = await FaceDatabaseService.getAllProfiles();
      setProfiles(profileList);
    } catch (err) {
      console.error('Failed to load profiles:', err);
      setError('Failed to load face profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewProfile(prev => ({ ...prev, imageFile: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Convert to blob and create file
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-face.jpg', { type: 'image/jpeg' });
            setNewProfile(prev => ({ ...prev, imageFile: file }));
            setPreviewImage(canvas.toDataURL());
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const processFaceImage = async (imageFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Get image data for face detection
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const detections = await FaceRecognitionService.detectFaces(imageData);
          
          if (detections.length === 0) {
            throw new Error('No face detected in the image');
          }
          
          if (detections.length > 1) {
            throw new Error('Multiple faces detected. Please use an image with a single face');
          }
          
          // Generate face encoding from image data
          const encoding = await FaceRecognitionService.generateFaceEncoding(imageData);
          resolve(JSON.stringify(encoding));
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  };

  const handleAddProfile = async () => {
    if (!newProfile.personId || !newProfile.personName || !newProfile.imageFile) {
      setError('Please fill in all required fields and upload an image');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Process face image to generate encoding
      const faceEncoding = await processFaceImage(newProfile.imageFile);
      
      // Create profile
      await FaceDatabaseService.addProfile({
        personId: newProfile.personId,
        personName: newProfile.personName,
        faceEncoding,
        confidenceThreshold: newProfile.confidenceThreshold
      });
      
      // Reset form and reload profiles
      setNewProfile({
        personId: '',
        personName: '',
        confidenceThreshold: 0.6
      });
      setPreviewImage(null);
      setIsAddDialogOpen(false);
      
      await loadProfiles();
      onProfilesChange();
      
    } catch (err) {
      console.error('Failed to add profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to add profile');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading face profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Face Profiles</h2>
          <p className="text-gray-600 mt-1">Manage known individuals for face recognition</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Profile</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Face Profile</DialogTitle>
              <DialogDescription>
                Add a new person to the face recognition database
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="personId">Person ID</Label>
                  <Input
                    id="personId"
                    value={newProfile.personId}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, personId: e.target.value }))}
                    placeholder="e.g., EMP001"
                  />
                </div>
                <div>
                  <Label htmlFor="personName">Full Name</Label>
                  <Input
                    id="personName"
                    value={newProfile.personName}
                    onChange={(e) => setNewProfile(prev => ({ ...prev, personName: e.target.value }))}
                    placeholder="e.g., John Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="threshold">Recognition Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newProfile.confidenceThreshold}
                  onChange={(e) => setNewProfile(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                />
              </div>
              
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload Photo</TabsTrigger>
                  <TabsTrigger value="camera">Take Photo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-4">
                  <div>
                    <Label>Face Photo</Label>
                    <div className="mt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        aria-label="Upload face photo for profile"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Photo
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="camera" className="space-y-4">
                  <div>
                    <Label>Camera Capture</Label>
                    <div className="mt-2 space-y-4">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          className="w-full h-48 bg-gray-100 rounded object-cover"
                          autoPlay
                          muted
                          playsInline
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex space-x-2">
                        {!isCameraActive ? (
                          <Button onClick={startCamera} className="flex-1">
                            <Camera className="h-4 w-4 mr-2" />
                            Start Camera
                          </Button>
                        ) : (
                          <>
                            <Button onClick={capturePhoto} className="flex-1">
                              <Camera className="h-4 w-4 mr-2" />
                              Capture
                            </Button>
                            <Button onClick={stopCamera} variant="outline">
                              Stop
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              {previewImage && (
                <div>
                  <Label>Preview</Label>
                  <img
                    src={previewImage}
                    alt="Face preview"
                    className="mt-2 w-32 h-32 object-cover rounded border"
                  />
                </div>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter>
              <Button
                onClick={handleAddProfile}
                disabled={isProcessing || !newProfile.personId || !newProfile.personName || !newProfile.imageFile}
              >
                {isProcessing ? 'Processing...' : 'Add Profile'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Profiles List */}
      <Card>
        <CardHeader>
          <CardTitle>Profiles</CardTitle>
          <CardDescription>Manage face recognition profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Face recognition profiles will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
};