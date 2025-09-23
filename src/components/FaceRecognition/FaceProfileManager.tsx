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
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera');
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
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Detect faces
          const detections = await FaceRecognitionService.detectFaces(imageData);
          
          if (detections.length === 0) {
            throw new Error('No face detected in the image');
          }
          
          if (detections.length > 1) {
            throw new Error('Multiple faces detected. Please use an image with a single face');
          }
          
          // Extract face region
          const detection = detections[0];
          const faceImageData = ctx.getImageData(
            detection.boundingBox.x,
            detection.boundingBox.y,
            detection.boundingBox.width,
            detection.boundingBox.height
          );
          
          // Generate face encoding
          const encoding = await FaceRecognitionService.generateFaceEncoding(faceImageData);
          resolve(encoding);
          
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

  const handleEditProfile = async () => {
    if (!selectedProfile) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      let updateData: Partial<FaceProfile> = {
        personName: newProfile.personName,
        confidenceThreshold: newProfile.confidenceThreshold
      };
      
      // If new image is provided, process it
      if (newProfile.imageFile) {
        const faceEncoding = await processFaceImage(newProfile.imageFile);
        updateData.faceEncoding = faceEncoding;
      }
      
      await FaceDatabaseService.updateProfile(selectedProfile.id, updateData);
      
      setIsEditDialogOpen(false);
      setSelectedProfile(null);
      await loadProfiles();
      onProfilesChange();
      
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      await FaceDatabaseService.deleteProfile(profileId);
      await loadProfiles();
      onProfilesChange();
    } catch (err) {
      console.error('Failed to delete profile:', err);
      setError('Failed to delete profile');
    }
  };

  const handleToggleActive = async (profile: FaceProfile) => {
    try {
      await FaceDatabaseService.updateProfile(profile.id, {
        isActive: !profile.isActive
      });
      await loadProfiles();
      onProfilesChange();
    } catch (err) {
      console.error('Failed to toggle profile status:', err);
      setError('Failed to update profile status');
    }
  };

  const openEditDialog = (profile: FaceProfile) => {
    setSelectedProfile(profile);
    setNewProfile({
      personId: profile.personId,
      personName: profile.personName,
      confidenceThreshold: profile.confidenceThreshold
    });
    setPreviewImage(null);
    setIsEditDialogOpen(true);
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.personId.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Choose Image</span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="camera" className="space-y-4">
                  <div className="text-center">
                    {!isCameraActive ? (
                      <Button onClick={startCamera} className="flex items-center space-x-2">
                        <Camera className="h-4 w-4" />
                        <span>Start Camera</span>
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full max-w-md mx-auto rounded-lg"
                        />
                        <div className="flex justify-center space-x-2">
                          <Button onClick={capturePhoto}>Capture</Button>
                          <Button variant="outline" onClick={stopCamera}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              {previewImage && (
                <div className="text-center">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="max-w-xs mx-auto rounded-lg border"
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setNewProfile({ personId: '', personName: '', confidenceThreshold: 0.6 });
                  setPreviewImage(null);
                  stopCamera();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProfile}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Add Profile'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search profiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredProfiles.length} of {profiles.length} profiles
        </div>
      </div>

      {/* Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Face Profiles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.personId}</TableCell>
                  <TableCell>{profile.personName}</TableCell>
                  <TableCell>{(profile.confidenceThreshold * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Badge variant={profile.isActive ? "default" : "secondary"}>
                      {profile.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(profile)}
                      >
                        {profile.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(profile)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProfile(profile.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Face Profile</DialogTitle>
            <DialogDescription>
              Update profile information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editPersonName">Full Name</Label>
              <Input
                id="editPersonName"
                value={newProfile.personName}
                onChange={(e) => setNewProfile(prev => ({ ...prev, personName: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="editThreshold">Recognition Threshold</Label>
              <Input
                id="editThreshold"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={newProfile.confidenceThreshold}
                onChange={(e) => setNewProfile(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
              />
            </div>
            
            <div>
              <Label>Update Photo (Optional)</Label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="mt-2"
                aria-label="Update face photo for existing profile"
              />
            </div>
            
            {previewImage && (
              <div className="text-center">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-w-xs mx-auto rounded-lg border"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedProfile(null);
                setPreviewImage(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditProfile}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Update Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};