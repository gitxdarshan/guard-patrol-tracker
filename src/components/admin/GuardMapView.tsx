import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import { Map, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuardLocation, Checkpoint } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
const guardIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const offlineGuardIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const checkpointIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

interface GuardMapViewProps {
  guardLocations: GuardLocation[];
  checkpoints: Checkpoint[];
}

// Component to handle map bounds
function MapBoundsHandler({ guards, checkpoints }: { guards: GuardLocation[]; checkpoints: Checkpoint[] }) {
  const map = useMap();

  useEffect(() => {
    const allPoints: [number, number][] = [];

    guards.forEach(g => {
      if (g.latitude && g.longitude) {
        allPoints.push([g.latitude, g.longitude]);
      }
    });

    checkpoints.forEach(cp => {
      if (cp.latitude && cp.longitude) {
        allPoints.push([cp.latitude, cp.longitude]);
      }
    });

    if (allPoints.length > 0) {
      const bounds = new LatLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [guards, checkpoints, map]);

  return null;
}

export function GuardMapView({ guardLocations, checkpoints }: GuardMapViewProps) {
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard');

  // Default center (India)
  const defaultCenter: [number, number] = [20.5937, 78.9629];

  const getGuardStatus = (guard: GuardLocation) => {
    const minutesAgo = (Date.now() - new Date(guard.updated_at).getTime()) / 60000;
    return minutesAgo <= 5 && guard.status !== 'offline';
  };

  const tileLayers = {
    standard: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
    }
  };

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden">
      {/* Map Style Toggle */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-1">
        <Button
          size="sm"
          variant={mapStyle === 'standard' ? 'default' : 'outline'}
          onClick={() => setMapStyle('standard')}
          className="h-8 px-2 sm:px-3 text-xs"
        >
          <Map className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Map</span>
        </Button>
        <Button
          size="sm"
          variant={mapStyle === 'satellite' ? 'default' : 'outline'}
          onClick={() => setMapStyle('satellite')}
          className="h-8 px-2 sm:px-3 text-xs"
        >
          <Satellite className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Satellite</span>
        </Button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={5}
        className="h-full w-full"
        style={{ minHeight: '350px' }}
      >
        <TileLayer
          key={mapStyle}
          url={tileLayers[mapStyle].url}
          attribution={tileLayers[mapStyle].attribution}
        />

        <MapBoundsHandler guards={guardLocations} checkpoints={checkpoints} />

        {/* Guard Markers */}
        {guardLocations.map((guard) => {
          if (!guard.latitude || !guard.longitude) return null;
          const isActive = getGuardStatus(guard);

          return (
            <Marker
              key={guard.id}
              position={[guard.latitude, guard.longitude]}
              icon={isActive ? guardIcon : offlineGuardIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{guard.guard_name}</p>
                  <p className={`text-xs ${isActive ? 'text-emerald-600' : 'text-neutral-500'}`}>
                    {isActive ? '🟢 On Patrol' : '⚫ Offline'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Updated {formatDistanceToNow(new Date(guard.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Checkpoint Markers */}
        {checkpoints.map((cp) => {
          if (!cp.latitude || !cp.longitude) return null;

          return (
            <Marker
              key={cp.id}
              position={[cp.latitude, cp.longitude]}
              icon={checkpointIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{cp.name}</p>
                  <p className="text-xs text-neutral-500">{cp.location}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] glass-card p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span>Active Guard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground" />
          <span>Offline Guard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Checkpoint</span>
        </div>
      </div>
    </div>
  );
}
