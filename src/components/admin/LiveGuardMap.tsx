import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Clock, Wifi, WifiOff, RefreshCw, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GuardLocation, Checkpoint } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { GuardMapView } from './GuardMapView';

export function LiveGuardMap() {
  const [guardLocations, setGuardLocations] = useState<GuardLocation[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch initial data
  useEffect(() => {
    fetchData();

    // Set up realtime subscription for guard locations
    const channel = supabase
      .channel('guard_locations_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guard_locations',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          setLastUpdate(new Date());
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setGuardLocations(prev => {
              const updated = prev.filter(g => g.guard_id !== (payload.new as GuardLocation).guard_id);
              return [...updated, payload.new as GuardLocation];
            });
          } else if (payload.eventType === 'DELETE') {
            setGuardLocations(prev => 
              prev.filter(g => g.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch guard locations
    const { data: locations } = await supabase
      .from('guard_locations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (locations) {
      setGuardLocations(locations as GuardLocation[]);
    }

    // Fetch checkpoints
    const { data: cps } = await supabase
      .from('checkpoints')
      .select('*');

    if (cps) {
      setCheckpoints(cps as Checkpoint[]);
    }

    setIsLoading(false);
    setLastUpdate(new Date());
  };

  const getStatusColor = (status: string, updatedAt: string) => {
    const minutesAgo = (Date.now() - new Date(updatedAt).getTime()) / 60000;
    
    if (minutesAgo > 5 || status === 'offline') {
      return 'bg-muted-foreground'; // Gray - offline
    }
    if (status === 'on_patrol') {
      return 'bg-success'; // Green - active
    }
    return 'bg-warning'; // Yellow - idle
  };

  const getStatusLabel = (status: string, updatedAt: string) => {
    const minutesAgo = (Date.now() - new Date(updatedAt).getTime()) / 60000;
    
    if (minutesAgo > 5) return 'Offline';
    if (status === 'on_patrol') return 'On Patrol';
    if (status === 'idle') return 'Idle';
    return 'Offline';
  };

  const activeGuards = guardLocations.filter(g => {
    const minutesAgo = (Date.now() - new Date(g.updated_at).getTime()) / 60000;
    return minutesAgo <= 5 && g.status !== 'offline';
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Live Guard Tracking</h2>
          <p className="text-sm text-muted-foreground/80">
            Real-time location of guards on patrol
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            disabled={isLoading}
            className="rounded-xl border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-success/20 bg-gradient-to-br from-success/15 to-success/5 p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-success" />
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">{activeGuards.length}</span>
              <p className="text-xs text-muted-foreground/80">Active Guards</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
              <WifiOff className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">
                {guardLocations.length - activeGuards.length}
              </span>
              <p className="text-xs text-muted-foreground/80">Offline</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/15 to-accent/5 p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-accent" />
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">{checkpoints.length}</span>
              <p className="text-xs text-muted-foreground/80">Checkpoints</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">{guardLocations.length}</span>
              <p className="text-xs text-muted-foreground/80">Total Tracked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map + Guard List */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Real Map Area */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-2 sm:p-3 min-h-[350px] sm:min-h-[450px]">
          <GuardMapView guardLocations={guardLocations} checkpoints={checkpoints} />
        </div>

        {/* Guard List */}
        <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 sm:p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            Guard Status
          </h3>
          
          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {guardLocations.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No guard locations recorded yet</p>
              </div>
            ) : (
              guardLocations.map((guard) => (
                <motion.div
                  key={guard.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/30 transition-all duration-200"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${getStatusColor(guard.status, guard.updated_at)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">{guard.guard_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-0.5 ${
                          getStatusLabel(guard.status, guard.updated_at) === 'On Patrol' 
                            ? 'border-success/30 text-success bg-success/10' 
                            : getStatusLabel(guard.status, guard.updated_at) === 'Idle'
                            ? 'border-warning/30 text-warning bg-warning/10'
                            : 'border-muted-foreground/30 text-muted-foreground bg-muted/20'
                        }`}
                      >
                        {getStatusLabel(guard.status, guard.updated_at)}
                      </Badge>
                      <span className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(guard.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
