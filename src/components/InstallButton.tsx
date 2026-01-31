import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowDialog(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show instructions for desktop or unsupported browsers
      setShowDialog(true);
    }
  };

  // Don't show if already installed
  if (isInstalled) return null;

  // Check if we can show native prompt or iOS instructions
  const canInstall = isIOS || deferredPrompt;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleInstall}
        className="text-muted-foreground hover:text-foreground relative"
        title="Install App"
      >
        <Download className="w-5 h-5" />
        {canInstall && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full animate-pulse" />
        )}
      </Button>

      {/* Install Instructions Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install Guard Patrol App
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isIOS ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">iPhone pe install karne ke liye:</p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">1</div>
                  <p className="text-sm">Safari mein <strong>Share</strong> button tap karo</p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">2</div>
                  <p className="text-sm">Scroll karke <strong>"Add to Home Screen"</strong> tap karo</p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">3</div>
                  <p className="text-sm"><strong>"Add"</strong> tap karke install karo</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Mobile pe install karne ke liye:</p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">1</div>
                  <p className="text-sm">Apne <strong>phone ke browser</strong> mein yeh page kholo</p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">2</div>
                  <p className="text-sm">Chrome: Menu → <strong>"Install App"</strong></p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">3</div>
                  <p className="text-sm">Safari: Share → <strong>"Add to Home Screen"</strong></p>
                </div>
              </div>
            )}
            <Button onClick={() => setShowDialog(false)} className="w-full">
              Samajh Gaya!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
