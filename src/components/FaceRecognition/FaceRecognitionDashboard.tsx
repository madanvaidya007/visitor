import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Users, 
  Activity, 
  Settings, 
  Play, 
  Pause, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { FaceRecognitionService } from '@/services/faceRecognition';
import { CCTVIntegrationService } from '@/services/cctvIntegration';
import { FaceDatabaseService } from '@/services/faceDatabase';
import { FaceProfileManager } from './FaceProfileManager';
import { FaceRecognitionSettings } from './FaceRecognitionSettings';
import { FaceRecognitionLogs } from './FaceRecognitionLogs';
import { LiveCameraFeed } from './LiveCameraFeed';

interface FaceRecognitionStats {
  totalProfiles: number;
  activeProfiles: number;
  totalLogs: number;
  logsToday: number;
  recognitionAccuracy: number;
  topRecognizedPersons: Array<{
    person_name: string;
    recognition_count: number;
  }>;
}

interface CameraStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  faceCount: number;
}

export const FaceRecognitionDashboard: React.FC = () => {
  const [isSystemActive, setIsSystemActive] = useState(false);
  const [stats, setStats] = useState<FaceRecognitionStats>({
    totalProfiles: 0,
    activeProfiles: 0,
    totalLogs: 0,
    logsToday: 0,
    recognitionAccuracy: 0,
    topRecognizedPersons: []
  });
  const [cameras, setCameras] = useState<CameraStatus[]>([]);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      console.log('🚀 Initializing Face Recognition Dashboard...');
      setIsSystemActive(false);
      
      try {
        console.log('🔧 Starting Face Recognition Service initialization...');
        await FaceRecognitionService.initialize();
        console.log('✅ Face Recognition Service initialized successfully');

        console.log('📊 Loading face database statistics...');
        const stats = await FaceDatabaseService.getStatistics();
        console.log('📈 Statistics loaded:', stats);
        setStats(stats);

        console.log('📹 Loading camera status...');
        const cameraList = await CCTVIntegrationService.getCameras();
        console.log('🎥 Cameras loaded:', cameraList.length, 'cameras found');
        const statusPromises = cameraList.map(async (camera) => {
          const status = await CCTVIntegrationService.getCameraStatus(camera.id);
          return {
            id: camera.id,
            name: camera.name,
            status: status.isOnline ? 'online' : 'offline',
            lastSeen: new Date(status.lastSeen),
            faceCount: status.activeFaceCount || 0
          } as CameraStatus;
        });
        
        const cameraStatuses = await Promise.all(statusPromises);
        setCameras(cameraStatuses);

        setIsSystemActive(true);
        console.log('🎉 Face Recognition Dashboard initialized successfully');
        
      } catch (error: any) {
        console.error('❌ Dashboard initialization failed:', error);
        setIsSystemActive(false);
        
        // Log specific error details
        if (error.message?.includes('FaceRecognitionService.initialize')) {
          console.error('🔴 Face Recognition Service Error:', error.message);
        }
        if (error.message?.includes('FaceDatabaseService.getStatistics')) {
          console.error('🔴 Face Database Service Error:', error.message);
        }
        if (error.message?.includes('CCTVIntegrationService.getCameras')) {
          console.error('🔴 CCTV Integration Service Error:', error.message);
        }
      }
    };

    initializeServices();
    
    // Set up real-time updates
    const statsInterval = setInterval(loadStats, 30000); // Update every 30 seconds
    const cameraInterval = setInterval(loadCameraStatus, 10000); // Update every 10 seconds
    
    return () => {
      clearInterval(statsInterval);
      clearInterval(cameraInterval);
    };
  }, []);

  const initializeFaceRecognition = async () => {
    try {
      setLoading(true);
      await FaceRecognitionService.initialize();
      await CCTVIntegrationService.initialize();
      // Initialize face database - method exists in service
      setSystemHealth('healthy');
    } catch (err) {
      console.error('Failed to initialize face recognition system:', err);
      setError('Failed to initialize face recognition system');
      setSystemHealth('error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('🔄 Refreshing face recognition statistics...');
      const statistics = await FaceDatabaseService.getStatistics();
      console.log('📊 Statistics refreshed:', {
        totalProfiles: statistics.totalProfiles,
        activeProfiles: statistics.activeProfiles,
        recognitionAccuracy: statistics.recognitionAccuracy
      });
      setStats(statistics);
    } catch (err) {
      console.error('❌ Failed to load statistics:', err);
    }
  };

  const loadCameraStatus = async () => {
    try {
      console.log('📹 Refreshing camera status...');
      const cameraList = await CCTVIntegrationService.getCameras();
      console.log('🎥 Found', cameraList.length, 'cameras to check');
      
      const statusPromises = cameraList.map(async (camera) => {
        console.log('🔍 Checking status for camera:', camera.name);
        const status = await CCTVIntegrationService.getCameraStatus(camera.id);
        return {
          id: camera.id,
          name: camera.name,
          status: status.isOnline ? 'online' : 'offline',
          lastSeen: new Date(status.lastSeen),
          faceCount: status.activeFaceCount || 0
        } as CameraStatus;
      });
      
      const cameraStatuses = await Promise.all(statusPromises);
      setCameras(cameraStatuses);
      
      // Log camera status summary
      const onlineCameras = cameraStatuses.filter(c => c.status === 'online').length;
      const offlineCameras = cameraStatuses.filter(c => c.status === 'offline').length;
      console.log('📊 Camera Status Summary:', {
        total: cameraStatuses.length,
        online: onlineCameras,
        offline: offlineCameras
      });
      
      // Update system health based on camera status
      if (offlineCameras === cameraStatuses.length && cameraStatuses.length > 0) {
        setSystemHealth('error');
        console.log('🔴 System Health: ERROR - All cameras offline');
      } else if (offlineCameras > 0) {
        setSystemHealth('warning');
        console.log('🟡 System Health: WARNING - Some cameras offline');
      } else {
        setSystemHealth('healthy');
        console.log('🟢 System Health: HEALTHY - All cameras online');
      }
    } catch (err) {
      console.error('❌ Failed to load camera status:', err);
    }
  };

  const toggleSystem = async () => {
    try {
      console.log('🔄 Toggling face recognition system...');
      if (isSystemActive) {
        console.log('⏹️ Stopping face recognition system...');
        await CCTVIntegrationService.stopAllStreams();
        setIsSystemActive(false);
        console.log('✅ Face recognition system stopped');
      } else {
        console.log('▶️ Starting face recognition system...');
        await CCTVIntegrationService.startAllStreams();
        setIsSystemActive(true);
        console.log('✅ Face recognition system started');
      }
    } catch (err) {
      console.error('❌ Failed to toggle system:', err);
      setError('Failed to toggle system state');
    }
  };

  const getSystemHealthColor = () => {
    switch (systemHealth) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSystemHealthIcon = () => {
    switch (systemHealth) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Face Recognition System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Face Recognition System</h1>
          <p className="text-gray-600 mt-1">Real-time face detection and recognition monitoring</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${getSystemHealthColor()}`}>
            {getSystemHealthIcon()}
            <span className="font-medium capitalize">{systemHealth}</span>
          </div>
          <Button
            onClick={toggleSystem}
            variant={isSystemActive ? "destructive" : "default"}
            className="flex items-center space-x-2"
          >
            {isSystemActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isSystemActive ? 'Stop System' : 'Start System'}</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cameras</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cameras.filter(c => c.status === 'online').length}/{cameras.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {cameras.filter(c => c.status === 'offline').length} offline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Face Profiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProfiles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProfiles} total profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Detections</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.logsToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLogs} total logs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recognition Accuracy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.recognitionAccuracy * 100).toFixed(1)}%</div>
            <Progress value={stats.recognitionAccuracy * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Camera Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Camera Status</CardTitle>
          <CardDescription>Real-time status of all connected cameras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameras.map((camera) => (
              <div key={camera.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{camera.name}</h4>
                  <p className="text-sm text-gray-600">
                    {camera.faceCount} faces detected
                  </p>
                </div>
                <Badge 
                  variant={camera.status === 'online' ? 'default' : 'destructive'}
                >
                  {camera.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live Feed</TabsTrigger>
          <TabsTrigger value="profiles">Face Profiles</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <LiveCameraFeed 
            cameras={cameras.filter(c => c.status === 'online')}
            isSystemActive={isSystemActive}
          />
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <FaceProfileManager onProfilesChange={loadStats} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <FaceRecognitionLogs />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <FaceRecognitionSettings onSettingsChange={loadStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};