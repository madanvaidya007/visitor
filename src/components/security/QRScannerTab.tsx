import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { QrCode, Scan, UserCheck, Clock, CheckCircle, XCircle, Camera, History, TrendingUp, AlertTriangle } from 'lucide-react';
import { useQRCode } from '@/hooks/useQRCode';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface QRScannerTabProps {
  onScanSuccess: () => void;
}

interface ScanHistory {
  id: string;
  qr_code: string;
  scan_time: string;
  result_type: 'success' | 'error' | 'warning';
  visitor_name?: string;
  zone_name?: string;
  action: string;
}

interface ScanAnalytics {
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  success_rate: number;
  recent_activity: number;
}

export function QRScannerTab({ onScanSuccess }: QRScannerTabProps) {
  const [qrCode, setQrCode] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [analytics, setAnalytics] = useState<ScanAnalytics>({
    total_scans: 0,
    successful_scans: 0,
    failed_scans: 0,
    success_rate: 0,
    recent_activity: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  const { scanQRCode } = useQRCode();
  const { toast } = useToast();

  useEffect(() => {
    fetchScanHistory();
    fetchAnalytics();
    
    // Set up real-time subscription for scan events
    const scanSubscription = supabase
      .channel('scan_events')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'qr_scan_logs' },
        () => {
          fetchScanHistory();
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      scanSubscription.unsubscribe();
    };
  }, []);

  const fetchScanHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_scan_logs')
        .select(`
          id,
          qr_code,
          scan_time,
          result_type,
          action,
          visitor_name,
          zone_name
        `)
        .order('scan_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      setScanHistory(data || []);
    } catch (error) {
      console.error('Error fetching scan history:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_scan_logs')
        .select('result_type, scan_time')
        .gte('scan_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const total = data?.length || 0;
      const successful = data?.filter(scan => scan.result_type === 'success').length || 0;
      const failed = data?.filter(scan => scan.result_type === 'error').length || 0;
      const recentHour = data?.filter(scan => 
        new Date(scan.scan_time) > new Date(Date.now() - 60 * 60 * 1000)
      ).length || 0;

      setAnalytics({
        total_scans: total,
        successful_scans: successful,
        failed_scans: failed,
        success_rate: total > 0 ? Math.round((successful / total) * 100) : 0,
        recent_activity: recentHour
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleScan = async (action: 'check_in' | 'check_out') => {
    if (!qrCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a QR code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await scanQRCode(qrCode, action);
      setScanResult(result);
      
      // Log the scan event
      await logScanEvent(qrCode, result.success ? 'success' : 'error', action, result);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `${action === 'check_in' ? 'Check-in' : 'Check-out'} successful`,
        });
        onScanSuccess?.(result);
        setQrCode('');
      } else {
        toast({
          title: "Error",
          description: result.message || "Scan failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      await logScanEvent(qrCode, 'error', action, { error: error.message });
      toast({
        title: "Error",
        description: "An error occurred during scanning",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logScanEvent = async (qrCode: string, resultType: 'success' | 'error' | 'warning', action: string, result: any) => {
    try {
      await supabase
        .from('qr_scan_logs')
        .insert({
          qr_code: qrCode,
          result_type: resultType,
          action: action,
          visitor_name: result.visitor?.name || null,
          zone_name: result.zone?.name || null,
          scan_time: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging scan event:', error);
    }
  };

  const toggleCamera = () => {
    setCameraActive(!cameraActive);
    if (!cameraActive) {
      toast({
        title: "Camera Activated",
        description: "Point your camera at a QR code to scan",
      });
    }
  };

  const simulateQRScan = () => {
    // Simulate scanning a QR code for demo purposes
    const demoQRCode = `VMS-demo-${Date.now()}`;
    setQrCode(demoQRCode);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Scans (24h)</p>
                <p className="text-2xl font-bold">{analytics.total_scans}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{analytics.success_rate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={analytics.success_rate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed Scans</p>
                <p className="text-2xl font-bold text-red-600">{analytics.failed_scans}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
                <p className="text-2xl font-bold">{analytics.recent_activity}</p>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status Alert */}
      {analytics.recent_activity > 10 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            High scan activity detected: {analytics.recent_activity} scans in the last hour
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>
              Scan visitor QR codes for check-in/check-out
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qr-input">QR Code</Label>
              <Input
                id="qr-input"
                placeholder="Enter QR code or use camera scanner"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleScan('check_in')}
                disabled={!qrCode.trim() || isLoading}
                className="flex-1"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {isLoading ? 'Processing...' : 'Check In'}
              </Button>
              <Button
                onClick={() => handleScan('check_out')}
                disabled={!qrCode.trim() || isLoading}
                variant="outline"
                className="flex-1"
              >
                <Clock className="h-4 w-4 mr-2" />
                {isLoading ? 'Processing...' : 'Check Out'}
              </Button>
            </div>

            {/* Camera Scanner */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-500 mb-4">
                {cameraActive ? 'Camera is active - point at QR code' : 'Use camera to scan QR codes'}
              </p>
              <Button 
                onClick={toggleCamera}
                variant={cameraActive ? "destructive" : "secondary"}
                size="sm"
              >
                <Camera className="h-4 w-4 mr-2" />
                {cameraActive ? 'Stop Camera' : 'Start Camera'}
              </Button>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {scanResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {scanResult.success ? 'Scan Successful' : 'Scan Failed'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{scanResult.message}</p>
                {scanResult.visitor && (
                  <div className="mt-2 text-sm">
                    <p><strong>Visitor:</strong> {scanResult.visitor.name}</p>
                    {scanResult.zone && <p><strong>Zone:</strong> {scanResult.zone.name}</p>}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scan History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Scans
            </CardTitle>
            <CardDescription>
              Latest QR code scan activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanHistory.length > 0 ? (
                scanHistory.map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {scan.result_type === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : scan.result_type === 'error' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {scan.visitor_name || 'Unknown Visitor'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scan.action} • {scan.zone_name || 'No zone'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={scan.result_type === 'success' ? 'default' : 'destructive'}>
                        {scan.result_type}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(parseISO(scan.scan_time), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent scans</p>
                  <p className="text-sm">Scan history will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}