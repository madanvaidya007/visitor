import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  Clock,
  User,
  Camera,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { FaceDatabaseService, FaceRecognitionLog } from '@/services/faceDatabase';
import '../../styles/progress-bars.css';

interface LogFilters {
  cameraId?: string;
  personId?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  minConfidence?: number;
}

interface LogStats {
  totalLogs: number;
  logsToday: number;
  uniquePersons: number;
  averageConfidence: number;
  eventTypeCounts: Record<string, number>;
}

export const FaceRecognitionLogs: React.FC = () => {
  const [logs, setLogs] = useState<FaceRecognitionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<FaceRecognitionLog[]>([]);
  const [stats, setStats] = useState<LogStats>({
    totalLogs: 0,
    logsToday: 0,
    uniquePersons: 0,
    averageConfidence: 0,
    eventTypeCounts: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<LogFilters>({});
  const [selectedLog, setSelectedLog] = useState<FaceRecognitionLog | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [cameras, setCameras] = useState<string[]>([]);
  const [persons, setPersons] = useState<string[]>([]);

  const eventTypes = [
    'face_detected',
    'person_recognized',
    'person_entered',
    'person_left'
  ];

  useEffect(() => {
    loadLogs();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const logData = await FaceDatabaseService.getLogs();
      setLogs(logData);
      calculateStats(logData);
    } catch (err) {
      console.error('Failed to load logs:', err);
      setError('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      // Get unique cameras and persons from logs
      const logData = await FaceDatabaseService.getLogs();
      const uniqueCameras = [...new Set(logData.map(log => log.camera_id))];
      const uniquePersons = [...new Set(logData.map(log => log.person_id).filter(Boolean))];
      
      setCameras(uniqueCameras);
      setPersons(uniquePersons);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const calculateStats = (logData: FaceRecognitionLog[]) => {
    const today = new Date().toDateString();
    const logsToday = logData.filter(log => 
      new Date(log.timestamp).toDateString() === today
    ).length;
    
    const uniquePersons = new Set(
      logData.map(log => log.person_id).filter(Boolean)
    ).size;
    
    const recognitionLogs = logData.filter(log => 
      log.event_type === 'person_recognized' && log.confidence
    );
    
    const averageConfidence = recognitionLogs.length > 0
      ? recognitionLogs.reduce((sum, log) => sum + log.confidence, 0) / recognitionLogs.length
      : 0;
    
    const eventTypeCounts = logData.reduce((counts, log) => {
      counts[log.event_type] = (counts[log.event_type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    setStats({
      totalLogs: logData.length,
      logsToday,
      uniquePersons,
      averageConfidence,
      eventTypeCounts
    });
  };

  const applyFilters = () => {
    let filtered = [...logs];
    
    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.person_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.person_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.camera_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply filters
    if (filters.cameraId) {
      filtered = filtered.filter(log => log.camera_id === filters.cameraId);
    }
    
    if (filters.personId) {
      filtered = filtered.filter(log => log.person_id === filters.personId);
    }
    
    if (filters.eventType) {
      filtered = filtered.filter(log => log.event_type === filters.eventType);
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }
    
    if (filters.minConfidence !== undefined) {
      filtered = filtered.filter(log => 
        log.confidence >= filters.minConfidence!
      );
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Camera ID', 'Person ID', 'Person Name', 'Event Type', 'Confidence'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.camera_id,
        log.person_id || '',
        log.person_name || '',
        log.event_type,
        log.confidence?.toFixed(3) || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `face-recognition-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'person_recognized': return 'default';
      case 'face_detected': return 'secondary';
      case 'person_entered': return 'default';
      case 'person_left': return 'destructive';
      default: return 'secondary';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'person_recognized': return <CheckCircle className="h-4 w-4" />;
      case 'face_detected': return <Eye className="h-4 w-4" />;
      case 'person_entered': return <User className="h-4 w-4" />;
      case 'person_left': return <User className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Logs</h2>
          <p className="text-gray-600 mt-1">Face recognition and detection activity monitoring</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadLogs}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            onClick={exportLogs}
            disabled={filteredLogs.length === 0}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.logsToday} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Persons</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniquePersons}</div>
            <p className="text-xs text-muted-foreground">
              Recognized individuals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.averageConfidence * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Recognition accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recognitions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.eventTypeCounts.person_recognized || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Successful matches
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.cameraId || ''}
              onValueChange={(value) => setFilters(prev => ({ ...prev, cameraId: value === 'all-cameras' ? undefined : value || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Cameras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-cameras">All Cameras</SelectItem>
                {cameras.map(camera => (
                  <SelectItem key={camera} value={camera}>{camera}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.personId || ''}
              onValueChange={(value) => setFilters(prev => ({ ...prev, personId: value === 'all-persons' ? undefined : value || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Persons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-persons">All Persons</SelectItem>
                {persons.map(person => (
                  <SelectItem key={person} value={person}>{person}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.eventType || ''}
              onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value === 'all-events' ? undefined : value || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-events">All Events</SelectItem>
                {eventTypes.map(type => (
                  <SelectItem key={type} value={type}>{formatEventType(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
            />
            
            <Input
              type="date"
              placeholder="To Date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
            />
          </div>
          
          {(searchTerm || Object.keys(filters).some(key => filters[key as keyof LogFilters])) && (
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activity Logs ({filteredLogs.length})</span>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Camera</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Camera className="h-4 w-4 text-gray-400" />
                      <span>{log.camera_id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getEventTypeColor(log.event_type)}
                      className="flex items-center space-x-1 w-fit"
                    >
                      {getEventTypeIcon(log.event_type)}
                      <span>{formatEventType(log.event_type)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.person_name ? (
                      <div>
                        <div className="font-medium">{log.person_name}</div>
                        <div className="text-sm text-gray-600">{log.person_id}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.confidence ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="confidence-bar bg-blue-600 h-2 rounded-full"
                            style={{ width: `${log.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {(log.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Log Details</DialogTitle>
                          <DialogDescription>
                            Detailed information about this activity log
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedLog && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Timestamp</Label>
                                <p className="text-sm text-gray-600">
                                  {new Date(selectedLog.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Camera ID</Label>
                                <p className="text-sm text-gray-600">{selectedLog.camera_id}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Event Type</Label>
                                <p className="text-sm text-gray-600">
                                  {formatEventType(selectedLog.event_type)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Confidence</Label>
                                <p className="text-sm text-gray-600">
                                  {selectedLog.confidence ? 
                                    `${(selectedLog.confidence * 100).toFixed(2)}%` : 
                                    'N/A'
                                  }
                                </p>
                              </div>
                              {selectedLog.person_id && (
                                <>
                                  <div>
                                    <Label className="text-sm font-medium">Person ID</Label>
                                    <p className="text-sm text-gray-600">{selectedLog.person_id}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Person Name</Label>
                                    <p className="text-sm text-gray-600">{selectedLog.person_name}</p>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {selectedLog.bounding_box && (
                              <div>
                                <Label className="text-sm font-medium">Bounding Box</Label>
                                <p className="text-sm text-gray-600 font-mono">
                                  x: {selectedLog.bounding_box.x}, y: {selectedLog.bounding_box.y}, 
                                  w: {selectedLog.bounding_box.width}, h: {selectedLog.bounding_box.height}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} logs
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};