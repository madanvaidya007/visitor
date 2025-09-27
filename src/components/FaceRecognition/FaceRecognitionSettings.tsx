import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  Camera,
  Database,
  Shield
} from 'lucide-react';
import { FaceDatabaseService, FaceRecognitionSettings as SettingsType } from '@/services/faceDatabase';

interface FaceRecognitionSettingsProps {
  onSettingsChange: () => void;
}

export const FaceRecognitionSettings: React.FC<FaceRecognitionSettingsProps> = ({ 
  onSettingsChange 
}) => {
  const [settings, setSettings] = useState<SettingsType>({
    id: '1',
    detection_threshold: 0.5,
    recognition_threshold: 0.6,
    tracking_max_distance: 100,
    tracking_max_age: 3000,
    min_detections_for_track: 3,
    enable_logging: true,
    log_retention_days: 30,
    enable_frame_capture: false,
    encryption_key_id: 'default',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  const [originalSettings, setOriginalSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = await FaceDatabaseService.getSettings();
      setSettings(currentSettings);
      setOriginalSettings(currentSettings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await FaceDatabaseService.updateSettings(settings);
      setOriginalSettings({ ...settings });
      setSuccess('Settings saved successfully');
      onSettingsChange();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
    }
  };

  const handleResetToDefaults = () => {
    const defaultSettings: SettingsType = {
      id: '1',
      detection_threshold: 0.5,
      recognition_threshold: 0.6,
      tracking_max_distance: 100,
      tracking_max_age: 3000,
      min_detections_for_track: 3,
      enable_logging: true,
      log_retention_days: 30,
      enable_frame_capture: false,
      encryption_key_id: 'default',
      created_at: settings.created_at,
      updated_at: new Date().toISOString()
    };
    setSettings(defaultSettings);
  };

  const updateSetting = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString()
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Face Recognition Settings</h2>
          <p className="text-gray-600 mt-1">Configure recognition thresholds and system parameters</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="detection" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="detection">Detection</TabsTrigger>
          <TabsTrigger value="recognition">Recognition</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="logging">Logging</TabsTrigger>
        </TabsList>

        {/* Detection Settings */}
        <TabsContent value="detection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Face Detection Settings</span>
              </CardTitle>
              <CardDescription>
                Configure how faces are detected in video streams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="detectionThreshold">Detection Threshold</Label>
                <div className="mt-2 space-y-2">
                  <Slider
                    id="detectionThreshold"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={[settings.detection_threshold]}
                    onValueChange={([value]) => updateSetting('detection_threshold', value)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Low Sensitivity (0.1)</span>
                    <span className="font-medium">{(settings.detection_threshold * 100).toFixed(0)}%</span>
                    <span>High Sensitivity (0.9)</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Lower values detect more faces but may include false positives. 
                  Higher values are more selective but may miss some faces.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recognition Settings */}
        <TabsContent value="recognition" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>Face Recognition Settings</span>
              </CardTitle>
              <CardDescription>
                Configure how detected faces are matched against known profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="recognitionThreshold">Recognition Threshold</Label>
                <div className="mt-2 space-y-2">
                  <Slider
                    id="recognitionThreshold"
                    min={0.3}
                    max={0.9}
                    step={0.05}
                    value={[settings.recognition_threshold]}
                    onValueChange={([value]) => updateSetting('recognition_threshold', value)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Permissive (0.3)</span>
                    <span className="font-medium">{(settings.recognition_threshold * 100).toFixed(0)}%</span>
                    <span>Strict (0.9)</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Lower values allow more matches but may include false identifications. 
                  Higher values require closer matches but may miss valid identifications.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Settings */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Face Tracking Settings</span>
              </CardTitle>
              <CardDescription>
                Configure how faces are tracked across video frames
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="trackingMaxDistance">Maximum Tracking Distance (pixels)</Label>
                <Input
                  id="trackingMaxDistance"
                  type="number"
                  min={10}
                  max={500}
                  value={settings.tracking_max_distance}
                  onChange={(e) => updateSetting('tracking_max_distance', parseInt(e.target.value))}
                  className="mt-2"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Maximum distance a face can move between frames to be considered the same person.
                </p>
              </div>

              <div>
                <Label htmlFor="trackingMaxAge">Maximum Tracking Age (milliseconds)</Label>
                <Input
                  id="trackingMaxAge"
                  type="number"
                  min={500}
                  max={10000}
                  value={settings.tracking_max_age}
                  onChange={(e) => updateSetting('tracking_max_age', parseInt(e.target.value))}
                  className="mt-2"
                />
                <p className="text-sm text-gray-600 mt-2">
                  How long to keep tracking a face after it disappears from view.
                </p>
              </div>

              <div>
                <Label htmlFor="minDetectionsForTrack">Minimum Detections for Track</Label>
                <Input
                  id="minDetectionsForTrack"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.min_detections_for_track}
                  onChange={(e) => updateSetting('min_detections_for_track', parseInt(e.target.value))}
                  className="mt-2"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Number of consecutive detections required before starting to track a face.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logging Settings */}
        <TabsContent value="logging" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Logging & Data Retention</span>
                </CardTitle>
                <CardDescription>
                  Configure logging behavior and data retention policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableLogging">Enable Activity Logging</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Log all face detection and recognition events
                    </p>
                  </div>
                  <Switch
                    id="enableLogging"
                    checked={settings.enable_logging}
                    onCheckedChange={(checked) => updateSetting('enable_logging', checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="logRetentionDays">Log Retention Period (days)</Label>
                  <Input
                    id="logRetentionDays"
                    type="number"
                    min={1}
                    max={365}
                    value={settings.log_retention_days}
                    onChange={(e) => updateSetting('log_retention_days', parseInt(e.target.value))}
                    className="mt-2"
                    disabled={!settings.enable_logging}
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    How long to keep activity logs before automatic deletion.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableFrameCapture">Enable Frame Capture</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Save video frames when faces are detected (requires more storage)
                    </p>
                  </div>
                  <Switch
                    id="enableFrameCapture"
                    checked={settings.enable_frame_capture}
                    onCheckedChange={(checked) => updateSetting('enable_frame_capture', checked)}
                    disabled={!settings.enable_logging}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security & Encryption</span>
                </CardTitle>
                <CardDescription>
                  Configure security and encryption settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="encryptionKeyId">Encryption Key ID</Label>
                  <Input
                    id="encryptionKeyId"
                    value={settings.encryption_key_id}
                    onChange={(e) => updateSetting('encryption_key_id', e.target.value)}
                    className="mt-2"
                    placeholder="default"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Identifier for the encryption key used to secure face data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reset to Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Reset all settings to their default values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleResetToDefaults}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset to Defaults</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};