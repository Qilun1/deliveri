import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useDeliveryLocation } from '@/hooks/useDeliveryLocation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Clock, Navigation, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error Leaflet typing issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom truck icon for driver
const truckIcon = new L.DivIcon({
  html: `<div style="background: #009EE0; padding: 8px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="7" cy="18" r="2"/>
    </svg>
  </div>`,
  className: 'custom-truck-marker',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

// Restaurant destination icon
const restaurantIcon = new L.DivIcon({
  html: `<div style="background: #22c55e; padding: 8px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  className: 'custom-destination-marker',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

interface LiveDeliveryMapProps {
  deliveryId: string;
  restaurantLocation?: { lat: number; lng: number };
  restaurantName?: string;
  driverName?: string;
}

function MapRecenter({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], map.getZoom());
    }
  }, [location, map]);

  return null;
}

export function LiveDeliveryMap({
  deliveryId,
  restaurantLocation,
  restaurantName = 'Destination',
  driverName = 'Driver',
}: LiveDeliveryMapProps) {
  const {
    currentLocation,
    trackingInfo,
    locationHistory,
    isLoading,
    isConnected,
    error,
    lastUpdate,
    estimatedArrival,
    distanceRemaining,
  } = useDeliveryLocation({ deliveryId });

  const routePath = useMemo(() => {
    return locationHistory
      .slice()
      .reverse()
      .map(loc => [Number(loc.latitude), Number(loc.longitude)] as [number, number]);
  }, [locationHistory]);

  const mapCenter = useMemo(() => {
    if (currentLocation) {
      return [currentLocation.lat, currentLocation.lng] as [number, number];
    }
    if (restaurantLocation) {
      return [restaurantLocation.lat, restaurantLocation.lng] as [number, number];
    }
    return [60.1699, 24.9384] as [number, number];
  }, [currentLocation, restaurantLocation]);

  const speedKmh = trackingInfo?.current_speed
    ? Math.round(trackingInfo.current_speed * 3.6)
    : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Live Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-destructive" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentLocation && !trackingInfo?.tracking_started_at) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Tracking Not Started</h3>
            <p>The driver hasn't started tracking for this delivery yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#009EE0]" />
            Live Delivery Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? 'default' : 'secondary'}
              className={isConnected ? 'bg-green-500' : ''}
            >
              <span className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
              {isConnected ? 'Live' : 'Connecting...'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          {estimatedArrival && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>ETA: {format(estimatedArrival, 'HH:mm')}</span>
            </div>
          )}
          {distanceRemaining !== null && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Navigation className="w-4 h-4" />
              <span>{distanceRemaining.toFixed(1)} km away</span>
            </div>
          )}
          {speedKmh !== null && speedKmh > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="w-4 h-4" />
              <span>{speedKmh} km/h</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[400px] rounded-lg overflow-hidden border">
          <MapContainer
            center={mapCenter}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapRecenter location={currentLocation} />

            {currentLocation && (
              <Marker
                position={[currentLocation.lat, currentLocation.lng]}
                icon={truckIcon}
              >
                <Popup>
                  <div className="text-sm p-1">
                    <p className="font-semibold">{driverName}</p>
                    {lastUpdate && (
                      <p className="text-gray-500">
                        Updated {formatDistanceToNow(lastUpdate)} ago
                      </p>
                    )}
                    {speedKmh !== null && speedKmh > 0 && (
                      <p className="text-gray-500">Speed: {speedKmh} km/h</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {restaurantLocation && (
              <Marker
                position={[restaurantLocation.lat, restaurantLocation.lng]}
                icon={restaurantIcon}
              >
                <Popup>
                  <div className="text-sm p-1">
                    <p className="font-semibold">{restaurantName}</p>
                    <p className="text-gray-500">Delivery destination</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {routePath.length > 1 && (
              <Polyline
                positions={routePath}
                pathOptions={{
                  color: '#009EE0',
                  weight: 4,
                  opacity: 0.7,
                }}
              />
            )}
          </MapContainer>
        </div>

        {lastUpdate && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Last update: {formatDistanceToNow(lastUpdate)} ago
            <span className="text-xs">
              ({format(lastUpdate, 'HH:mm:ss')})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
