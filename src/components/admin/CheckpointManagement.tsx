import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, MapPin, Loader2, QrCode, Download, Printer, Navigation, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkpoint } from '@/types';

interface CheckpointManagementProps {
  onUpdate: () => void;
}

export function CheckpointManagement({ onUpdate }: CheckpointManagementProps) {
  const { user } = useAuth();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [newCheckpoint, setNewCheckpoint] = useState({ name: '', location: '', latitude: '', longitude: '' });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();
  const qrRef = useRef<HTMLImageElement>(null);

  // Get current GPS location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      setNewCheckpoint(prev => ({
        ...prev,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
      }));
      toast({
        title: 'Location Captured',
        description: 'GPS coordinates have been set',
      });
    } catch (err: any) {
      toast({
        title: 'Location Error',
        description: 'Could not get GPS location. Please enter manually.',
        variant: 'destructive',
      });
    }
    setIsGettingLocation(false);
  };

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const fetchCheckpoints = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setCheckpoints(data as Checkpoint[]);
    }
    setIsLoading(false);
  };

  const createCheckpoint = async () => {
    setIsCreating(true);
    try {
      const lat = newCheckpoint.latitude ? parseFloat(newCheckpoint.latitude) : null;
      const lng = newCheckpoint.longitude ? parseFloat(newCheckpoint.longitude) : null;

      const { error } = await supabase.from('checkpoints').insert({
        name: newCheckpoint.name,
        location: newCheckpoint.location,
        latitude: lat,
        longitude: lng,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Checkpoint Created',
        description: `${newCheckpoint.name} has been added${lat && lng ? ' with GPS verification' : ''}`,
      });

      setNewCheckpoint({ name: '', location: '', latitude: '', longitude: '' });
      setDialogOpen(false);
      fetchCheckpoints();
      onUpdate();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create checkpoint',
        variant: 'destructive',
      });
    }
    setIsCreating(false);
  };

  const deleteCheckpoint = async (id: string, name: string) => {
    try {
      const { error } = await supabase.from('checkpoints').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Checkpoint Removed',
        description: `${name} has been removed`,
      });

      fetchCheckpoints();
      onUpdate();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete checkpoint',
        variant: 'destructive',
      });
    }
  };

  const generateQR = async (checkpoint: Checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    try {
      const qrValue = `checkpoint:${checkpoint.id}`;
      const dataUrl = await QRCode.toDataURL(qrValue, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
      setQrDialogOpen(true);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl || !selectedCheckpoint) return;
    const link = document.createElement('a');
    link.download = `qr-${selectedCheckpoint.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const printQR = () => {
    if (!qrDataUrl || !selectedCheckpoint) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${selectedCheckpoint.name}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
              }
              img { max-width: 300px; }
              h2 { margin: 20px 0 5px; }
              p { color: #666; margin: 0; }
            </style>
          </head>
          <body>
            <img src="${qrDataUrl}" alt="QR Code" />
            <h2>${selectedCheckpoint.name}</h2>
            <p>${selectedCheckpoint.location}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Checkpoint Management</h2>
          <p className="text-muted-foreground">Create checkpoints and generate QR codes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow">
              <Plus className="w-4 h-4 mr-2" />
              Add Checkpoint
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Checkpoint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Checkpoint Name</Label>
                <Input
                  placeholder="Gate 1"
                  value={newCheckpoint.name}
                  onChange={(e) => setNewCheckpoint({ ...newCheckpoint, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Location Description</Label>
                <Input
                  placeholder="Main Entrance, Building A"
                  value={newCheckpoint.location}
                  onChange={(e) => setNewCheckpoint({ ...newCheckpoint, location: e.target.value })}
                />
              </div>
              
              {/* GPS Coordinates Section */}
              <div className="space-y-3 p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-primary" />
                    GPS Location (for verification)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                  >
                    {isGettingLocation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-1" />
                        Get Current
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="19.0760"
                      value={newCheckpoint.latitude}
                      onChange={(e) => setNewCheckpoint({ ...newCheckpoint, latitude: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="72.8777"
                      value={newCheckpoint.longitude}
                      onChange={(e) => setNewCheckpoint({ ...newCheckpoint, longitude: e.target.value })}
                    />
                  </div>
                </div>
                {newCheckpoint.latitude && newCheckpoint.longitude && (
                  <p className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    GPS verification enabled for this checkpoint
                  </p>
                )}
              </div>

              <Button
                onClick={createCheckpoint}
                disabled={isCreating || !newCheckpoint.name || !newCheckpoint.location}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Checkpoint'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
          </DialogHeader>
          {selectedCheckpoint && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl">
                  <img ref={qrRef} src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">{selectedCheckpoint.name}</h3>
                <p className="text-muted-foreground">{selectedCheckpoint.location}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={downloadQR} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={printQR} className="flex-1">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkpoints List */}
      <div className="glass-card p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No checkpoints added yet</p>
            <p className="text-sm text-muted-foreground">Click "Add Checkpoint" to create one</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {checkpoints.map((checkpoint, index) => (
                <motion.div
                  key={checkpoint.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{checkpoint.name}</p>
                        <p className="text-sm text-muted-foreground">{checkpoint.location}</p>
                        {checkpoint.latitude && checkpoint.longitude ? (
                          <p className="text-xs text-success flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3" />
                            GPS Verified
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/60 mt-1">No GPS set</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateQR(checkpoint)}
                      className="flex-1"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Code
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Checkpoint?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {checkpoint.name} and all related scan records.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCheckpoint(checkpoint.id, checkpoint.name)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
