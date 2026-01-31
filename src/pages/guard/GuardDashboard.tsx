import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Shield, LogOut, Camera, CheckCircle2, XCircle, 
  MapPin, Clock, AlertTriangle, History, Scan, Radio
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Scan as ScanType, Checkpoint } from '@/types';
import { format, subMinutes, isAfter } from 'date-fns';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { InstallButton } from '@/components/InstallButton';

// Calculate distance between two GPS points in meters (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'duplicate' | 'location_warning';

export default function GuardDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [lastScan, setLastScan] = useState<ScanType | null>(null);
  const [recentScans, setRecentScans] = useState<ScanType[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isProcessingScanRef = useRef(false); // Guard against duplicate scan processing
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Enable real-time location tracking
  useLocationTracking(true);

  const waitForQrReaderEl = useCallback(async () => {
    // Ensure the "qr-reader" container exists before Html5Qrcode.start()
    const maxFrames = 30; // ~0.5s at 60fps
    for (let i = 0; i < maxFrames; i++) {
      const el = document.getElementById('qr-reader');
      if (el) {
        const rect = el.getBoundingClientRect();
        // iOS Safari can show a blank camera if we start while the container is still
        // animating (scale/opacity) and reports ~0 size.
        if (rect.width >= 200 && rect.height >= 200) return;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    throw new Error('Scanner UI not ready. Please try again.');
  }, []);

  // Fetch recent scans
  useEffect(() => {
    if (!user) return;
    
    const fetchScans = async () => {
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('guard_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(10);
      
      if (data) setRecentScans(data as ScanType[]);
    };

    const fetchCheckpoints = async () => {
      const { data } = await supabase.from('checkpoints').select('*');
      if (data) setCheckpoints(data as Checkpoint[]);
    };

    fetchScans();
    fetchCheckpoints();
  }, [user, lastScan]);

  // Initialize scanner - robust approach for iOS/Android
  const initializeScanner = useCallback(async () => {
    if (isScanning || isStartingRef.current) return;
    if (!user) return;

    isStartingRef.current = true;
    setScanStatus('scanning');
    setErrorMessage('');

    try {
      // 1) CRITICAL (mobile): request camera access directly in the tap handler
      // This reliably triggers the permission prompt on iOS Safari + Android Chrome.
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        stream.getTracks().forEach((t) => t.stop());
      }

      // 2) Ensure the scanner DOM is mounted before starting
      await waitForQrReaderEl();

      // 3) Get camera list (also helps on some devices)
      let cameras: { id: string; label: string }[] = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch (camErr: any) {
        console.error('getCameras error:', camErr);
        throw new Error(
          'Camera permission denied. Please allow camera access in your browser/device settings and try again.'
        );
      }

      if (!cameras || cameras.length === 0) {
        throw new Error('No camera found on this device.');
      }

      // Find back camera (environment facing)
      let selectedCameraId = cameras[0].id;
      const backCamera = cameras.find(
        (cam) =>
          cam.label.toLowerCase().includes('back') ||
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
      );
      if (backCamera) {
        selectedCameraId = backCamera.id;
      } else if (cameras.length > 1) {
        selectedCameraId = cameras[cameras.length - 1].id;
      }

      const html5Qrcode = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      scannerRef.current = html5Qrcode;
      setScanner(html5Qrcode);
      setIsScanning(true);

      await html5Qrcode.start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        handleScanSuccess,
        () => {}
      );
    } catch (err: any) {
      console.error('Scanner init error:', err);
      const errorMsg = err?.message || 'Failed to start camera';

      if (errorMsg.includes('NotAllowed') || errorMsg.includes('Permission')) {
        setErrorMessage(
          'Camera permission denied. iPhone: Settings → Safari → Camera. Android: Site settings → Camera.'
        );
      } else if (errorMsg.includes('NotFound') || errorMsg.includes('No camera')) {
        setErrorMessage('No camera found on this device.');
      } else if (errorMsg.includes('NotReadable') || errorMsg.includes('in use')) {
        setErrorMessage('Camera is in use by another app. Please close other apps using the camera.');
      } else {
        setErrorMessage(errorMsg);
      }

      setScanStatus('error');
      setIsScanning(false);
      try {
        await scannerRef.current?.stop();
        scannerRef.current?.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
      setScanner(null);
    } finally {
      isStartingRef.current = false;
    }
  }, [isScanning, user, waitForQrReaderEl]);

  // Stop scanner
  const stopScanner = useCallback(async () => {
    const active = scannerRef.current;
    if (active) {
      try {
        await active.stop();
        active.clear();
      } catch (e) {
        console.log('Scanner already stopped');
      }
    }
    scannerRef.current = null;
    setScanner(null);
    setIsScanning(false);
    isStartingRef.current = false;
  }, []);

  // Cleanup on unmount to avoid "camera busy" on next visit
  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  // Handle successful scan
  const handleScanSuccess = async (decodedText: string) => {
    // CRITICAL: Guard against duplicate processing - QR scanner may fire callback multiple times
    if (isProcessingScanRef.current) {
      console.log('Scan already being processed, ignoring duplicate callback');
      return;
    }
    isProcessingScanRef.current = true;

    // Stop scanner immediately
    const active = scannerRef.current;
    if (active) {
      try {
        await active.stop();
        active.clear();
      } catch (e) {}
    }
    scannerRef.current = null;
    setScanner(null);
    setIsScanning(false);
    
    try {
      // Parse QR data (format: checkpoint-id:checkpoint-uuid)
      const checkpointId = decodedText.startsWith('checkpoint:') 
        ? decodedText.replace('checkpoint:', '') 
        : decodedText;

      // Verify checkpoint exists
      const { data: checkpoint, error: checkpointError } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('id', checkpointId)
        .single();

      if (checkpointError || !checkpoint) {
        setScanStatus('error');
        setErrorMessage('Invalid checkpoint QR code');
        return;
      }

      // Check for duplicate scan (within 5 minutes)
      const fiveMinutesAgo = subMinutes(new Date(), 5);
      const { data: existingScans } = await supabase
        .from('scans')
        .select('*')
        .eq('guard_id', user?.id)
        .eq('checkpoint_id', checkpointId)
        .gte('scanned_at', fiveMinutesAgo.toISOString());

      if (existingScans && existingScans.length > 0) {
        setScanStatus('duplicate');
        setErrorMessage('Already scanned within 5 minutes');
        return;
      }

      // Get current location (required for GPS verification)
      let lat: number | null = null;
      let lng: number | null = null;
      let distanceFromCheckpoint: number | null = null;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true,
            timeout: 10000 
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;

        // Calculate distance if checkpoint has GPS coordinates
        const cp = checkpoint as Checkpoint;
        if (cp.latitude && cp.longitude && lat && lng) {
          distanceFromCheckpoint = calculateDistance(lat, lng, cp.latitude, cp.longitude);
        }
      } catch (e) {
        console.log('Location not available');
      }

      // GPS Verification: Check if guard is within 100 meters
      const MAX_DISTANCE_METERS = 100;
      const cp = checkpoint as Checkpoint;
      const hasCheckpointGPS = cp.latitude && cp.longitude;
      const isTooFar = hasCheckpointGPS && distanceFromCheckpoint !== null && distanceFromCheckpoint > MAX_DISTANCE_METERS;

      // Record scan (even if too far - we log it anyway)
      const scanData = {
        guard_id: user?.id,
        guard_name: profile?.full_name || user?.email || 'Unknown',
        checkpoint_id: checkpointId,
        checkpoint_name: cp.name,
        latitude: lat,
        longitude: lng,
      };

      const { data: newScan, error: insertError } = await supabase
        .from('scans')
        .insert(scanData)
        .select()
        .single();

      if (insertError) throw insertError;

      setLastScan(newScan as ScanType);

      // Show warning if too far from checkpoint
      if (isTooFar && distanceFromCheckpoint) {
        setScanStatus('location_warning');
        setErrorMessage(`You are ${Math.round(distanceFromCheckpoint)}m away from checkpoint (max ${MAX_DISTANCE_METERS}m)`);
        toast({
          title: '⚠️ Location Warning',
          description: `Scan recorded but you're ${Math.round(distanceFromCheckpoint)}m away from checkpoint`,
          variant: 'destructive',
        });
      } else {
        setScanStatus('success');
        toast({
          title: 'Checkpoint Verified!',
          description: `${cp.name} scanned successfully${distanceFromCheckpoint !== null ? ` (${Math.round(distanceFromCheckpoint)}m away)` : ''}`,
        });
      }

    } catch (err: any) {
      console.error('Scan error:', err);
      setScanStatus('error');
      setErrorMessage(err.message || 'Scan failed');
    }
  };

  // Reset to scanning state
  const resetScanner = () => {
    setScanStatus('idle');
    setErrorMessage('');
    scannerRef.current = null;
    setScanner(null);
    isProcessingScanRef.current = false; // Reset processing guard for next scan
  };

  return (
    <div className="min-h-screen flex flex-col safe-area-top">
      {/* Header */}
      <header className="glass-card rounded-none border-x-0 border-t-0 p-3 sm:p-4 safe-area-x">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-success animate-pulse" />
                On Duty
              </p>
              <p className="font-semibold text-sm sm:text-base text-foreground truncate">{profile?.full_name || 'Guard'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <InstallButton />
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground touch-feedback h-9 w-9 sm:h-10 sm:w-10">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-4 max-w-lg mx-auto w-full space-y-4 sm:space-y-6 safe-area-x safe-area-bottom scroll-smooth-mobile">
        {/* Scanner Section */}
        <motion.div 
          layout
          className="glass-card p-4 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <Scan className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span>Scan Checkpoint</span>
          </div>

          <AnimatePresence mode="wait">
            {scanStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 sm:gap-4 py-6 sm:py-8"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-center text-sm sm:text-base px-2">
                  Tap below to scan a checkpoint QR code
                </p>
                <Button
                  onClick={initializeScanner}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow touch-feedback"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Start Scanning
                </Button>
              </motion.div>
            )}

            {scanStatus === 'scanning' && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="qr-viewport scanner-corners scanner-corners-bottom aspect-square relative">
                  <div id="qr-reader" className="w-full h-full" />
                  <div className="scan-line" />
                </div>
                <p className="text-center text-muted-foreground text-sm">
                  Point camera at checkpoint QR code
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await stopScanner();
                    resetScanner();
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </motion.div>
            )}

            {scanStatus === 'success' && lastScan && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center glow-success"
                >
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-success">Scan Successful!</h3>
                  <p className="text-muted-foreground mt-1">{lastScan.checkpoint_name}</p>
                </div>
                <div className="w-full p-4 rounded-lg bg-secondary/30 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(lastScan.scanned_at), 'PPp')}</span>
                  </div>
                  {lastScan.latitude && lastScan.longitude && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>Location recorded</span>
                    </div>
                  )}
                </div>
                <Button onClick={resetScanner} className="w-full">
                  Scan Another
                </Button>
              </motion.div>
            )}

            {scanStatus === 'location_warning' && lastScan && (
              <motion.div
                key="location_warning"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center"
                >
                  <AlertTriangle className="w-10 h-10 text-warning" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-warning">Location Warning</h3>
                  <p className="text-muted-foreground mt-1">{errorMessage}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Scan was recorded but flagged for review
                  </p>
                </div>
                <div className="w-full p-4 rounded-lg bg-secondary/30 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{lastScan.checkpoint_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(lastScan.scanned_at), 'PPp')}</span>
                  </div>
                </div>
                <Button onClick={resetScanner} className="w-full">
                  Scan Another
                </Button>
              </motion.div>
            )}

            {(scanStatus === 'error' || scanStatus === 'duplicate') && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    scanStatus === 'duplicate' 
                      ? 'bg-primary/20' 
                      : 'bg-destructive/20'
                  }`}
                >
                  {scanStatus === 'duplicate' ? (
                    <AlertTriangle className="w-10 h-10 text-primary" />
                  ) : (
                    <XCircle className="w-10 h-10 text-destructive" />
                  )}
                </motion.div>
                <div className="text-center">
                  <h3 className={`text-xl font-bold ${
                    scanStatus === 'duplicate' ? 'text-primary' : 'text-destructive'
                  }`}>
                    {scanStatus === 'duplicate' ? 'Duplicate Scan' : 'Scan Failed'}
                  </h3>
                  <p className="text-muted-foreground mt-1">{errorMessage}</p>
                </div>
                <Button onClick={resetScanner} className="w-full">
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Recent Scans */}
        <div className="glass-card p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span>Recent Scans</span>
          </div>

          {recentScans.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              No scans recorded yet
            </p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {recentScans.map((scan, index) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 touch-feedback"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-medium text-sm sm:text-base truncate">{scan.checkpoint_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {format(new Date(scan.scanned_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
