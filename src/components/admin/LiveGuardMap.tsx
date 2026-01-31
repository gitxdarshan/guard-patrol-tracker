import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, User, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GuardLocation, Checkpoint } from '@/types';
import { formatDistanceToNow } from 'date-fns';

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

      {/* Map Placeholder + Guard List */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2 glass-card p-6 min-h-[400px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-secondary/5" />
          
          {/* Simple visual map representation */}
          <div className="relative h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-semibold">Location Overview</span>
            </div>
            
            <div className="flex-1 relative rounded-lg bg-secondary/30 border border-border overflow-hidden">
              {/* Grid background */}
              <div className="absolute inset-0 opacity-20" 
                style={{
                  backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }}
              />
              
              {/* Guard markers positioned relatively */}
              <AnimatePresence>
                {activeGuards.map((guard, index) => {
                  // Simple positioning based on index for demo
                  const positions = [
                    { top: '20%', left: '30%' },
                    { top: '40%', left: '60%' },
                    { top: '60%', left: '25%' },
                    { top: '30%', left: '75%' },
                    { top: '70%', left: '50%' },
                  ];
                  const pos = positions[index % positions.length];
                  
                  return (
                    <motion.div
                      key={guard.guard_id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ top: pos.top, left: pos.left }}
                    >
                      <div className="relative group cursor-pointer">
                        {/* Pulse animation */}
                        <div className="absolute inset-0 rounded-full bg-success/30 animate-ping" />
                        
                        {/* Guard marker */}
                        <div className="relative w-10 h-10 rounded-full bg-success flex items-center justify-center shadow-lg">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                            <p className="font-medium text-sm">{guard.guard_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(guard.updated_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Checkpoint markers */}
              {checkpoints.filter(cp => cp.latitude && cp.longitude).slice(0, 5).map((cp, index) => {
                const positions = [
                  { top: '15%', left: '20%' },
                  { top: '50%', left: '40%' },
                  { top: '80%', left: '70%' },
                  { top: '25%', left: '85%' },
                  { top: '65%', left: '15%' },
                ];
                const pos = positions[index % positions.length];

                return (
                  <div
                    key={cp.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ top: pos.top, left: pos.left }}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-primary" />
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-background border border-border rounded px-2 py-1 text-xs whitespace-nowrap">
                        {cp.name}
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeGuards.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No active guards on patrol</p>
                  </div>
                </div>
              )}
            </div>
          </div>
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
