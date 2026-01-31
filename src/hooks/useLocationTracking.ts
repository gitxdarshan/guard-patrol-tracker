import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const UPDATE_INTERVAL = 30000; // 30 seconds

export function useLocationTracking(enabled: boolean = true) {
  const { user, profile } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const updateLocation = useCallback(async (latitude: number, longitude: number) => {
    if (!user) return;

    try {
      // Upsert guard location (insert or update based on guard_id unique constraint)
      const { error } = await supabase
        .from('guard_locations')
        .upsert({
          guard_id: user.id,
          guard_name: profile?.full_name || user.email || 'Guard',
          latitude,
          longitude,
          status: 'on_patrol',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'guard_id'
        });

      if (error) {
        console.error('Failed to update location:', error);
      }
    } catch (err) {
      console.error('Location update error:', err);
    }
  }, [user, profile]);

  const setOffline = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('guard_locations')
        .update({ status: 'offline', updated_at: new Date().toISOString() })
        .eq('guard_id', user.id);
    } catch (err) {
      console.error('Failed to set offline:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!enabled || !user) return;

    // Get location and update
    const getAndUpdateLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('Location error:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // Initial update
    getAndUpdateLocation();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(getAndUpdateLocation, UPDATE_INTERVAL);

    // Set offline when leaving
    const handleBeforeUnload = () => {
      setOffline();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [enabled, user, updateLocation, setOffline]);

  return { updateLocation, setOffline };
}
