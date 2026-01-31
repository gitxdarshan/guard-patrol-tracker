import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Shield, LogOut, Camera, CheckCircle2, XCircle, 
  MapPin, Clock, AlertTriangle, History, Scan
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Scan as ScanType, Checkpoint } from '@/types';
import { format, subMinutes, isAfter } from 'date-fns';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'duplicate';

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
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const waitForQrReaderEl = useCallback(async () => {
    // Ensure the "qr-reader" container exists before Html5Qrcode.start()
    const maxFrames = 30; // ~0.5s at 60fps
    for (let i = 0; i < maxFrames; i++) {
      const el = document.getElementById('qr-reader');
      if (el) return;
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

      // Get current location (optional)
      let lat: number | null = null;
      let lng: number | null = null;
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (e) {
        console.log('Location not available');
      }

      // Record scan
      const scanData = {
        guard_id: user?.id,
        guard_name: profile?.full_name || user?.email || 'Unknown',
        checkpoint_id: checkpointId,
        checkpoint_name: (checkpoint as Checkpoint).name,
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
      setScanStatus('success');
      
      toast({
        title: 'Checkpoint Verified!',
        description: `${(checkpoint as Checkpoint).name} scanned successfully`,
      });

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
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card rounded-none border-x-0 border-t-0 p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">On Duty</p>
              <p className="font-semibold text-foreground">{profile?.full_name || 'Guard'}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-6">
        {/* Scanner Section */}
        <motion.div 
          layout
          className="glass-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Scan className="w-5 h-5 text-primary" />
            <span>Scan Checkpoint</span>
          </div>

          <AnimatePresence mode="wait">
            {scanStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <div className="w-24 h-24 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-center">
                  Tap below to scan a checkpoint QR code
                </p>
                <Button
                  onClick={initializeScanner}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow"
                >
                  <Camera className="w-5 h-5 mr-2" />
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
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <History className="w-5 h-5 text-primary" />
            <span>Recent Scans</span>
          </div>

          {recentScans.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No scans recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <motion.div
                  key={scan.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div>
                    <p className="font-medium">{scan.checkpoint_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(scan.scanned_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
