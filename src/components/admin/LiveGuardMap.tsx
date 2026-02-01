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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Guard Tracking</h2>
          <p className="text-muted-foreground">
            Real-time location of guards on patrol
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-success">
            <Wifi className="w-5 h-5" />
            <span className="text-2xl font-bold">{activeGuards.length}</span>
          </div>
          <p className="text-sm text-muted-foreground">Active Guards</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <WifiOff className="w-5 h-5" />
            <span className="text-2xl font-bold">
              {guardLocations.length - activeGuards.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Offline</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="w-5 h-5" />
            <span className="text-2xl font-bold">{checkpoints.length}</span>
          </div>
          <p className="text-sm text-muted-foreground">Checkpoints</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <User className="w-5 h-5" />
            <span className="text-2xl font-bold">{guardLocations.length}</span>
          </div>
          <p className="text-sm text-muted-foreground">Total Tracked</p>
        </div>
      </div>

      {/* Map + Guard List */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Real Map Area */}
        <div className="lg:col-span-2 glass-card p-2 sm:p-4 min-h-[350px] sm:min-h-[450px]">
          <GuardMapView guardLocations={guardLocations} checkpoints={checkpoints} />
        </div>

        {/* Guard List */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Guard Status
          </h3>
          
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {guardLocations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No guard locations recorded yet
              </p>
            ) : (
              guardLocations.map((guard) => (
                <motion.div
                  key={guard.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(guard.status, guard.updated_at)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{guard.guard_name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(guard.status, guard.updated_at)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
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
