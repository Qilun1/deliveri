import { useState, useEffect, useMemo } from 'react';
import { Truck, MapPin, Clock, RefreshCw, Loader2, User, Phone } from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveDeliveryMap } from '@/components/delivery/LiveDeliveryMap';
import { TrackingStatusBadge } from '@/components/delivery/TrackingStatusBadge';
import { useSupplierDrivers } from '@/hooks/useDrivers';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { formatDistanceToNow } from 'date-fns';

interface ActiveDelivery {
  id: string;
  restaurant_id: string;
  driver_id: string;
  tracking_status: 'pending' | 'in_transit' | 'delivered' | null;
  tracking_started_at: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  restaurants?: {
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

export default function DriverMonitoringPage() {
  const supabase = useAuthenticatedSupabase();
  const { data: drivers, isLoading: driversLoading } = useSupplierDrivers();
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const fetchActiveDeliveries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('outgoing_deliveries')
        .select(`
          id,
          restaurant_id,
          driver_id,
          tracking_status,
          tracking_started_at,
          current_latitude,
          current_longitude,
          last_location_update,
          restaurants (
            name,
            address,
            latitude,
            longitude
          )
        `)
        .in('tracking_status', ['pending', 'in_transit']);

      if (error) throw error;
      setActiveDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveDeliveries();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('supplier-deliveries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outgoing_deliveries',
        },
        () => {
          fetchActiveDeliveries();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_locations',
        },
        () => {
          fetchActiveDeliveries();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const activeDriverIds = useMemo(() => {
    return new Set(
      activeDeliveries
        .filter(d => d.tracking_status === 'in_transit')
        .map(d => d.driver_id)
    );
  }, [activeDeliveries]);

  const selectedDriver = drivers?.find(d => d.id === selectedDriverId);
  const selectedDelivery = activeDeliveries.find(
    d => d.driver_id === selectedDriverId && d.tracking_status === 'in_transit'
  );

  if (driversLoading || isLoading) {
    return (
      <MainContent>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Driver Monitoring</h1>
            <p className="text-muted-foreground mt-1">
              Track your drivers and active deliveries in real-time
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchActiveDeliveries}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-[#009EE0]/10">
                <User className="w-5 h-5 text-[#009EE0]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{drivers?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Truck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeDriverIds.size}</p>
                <p className="text-sm text-muted-foreground">Active Now</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeDeliveries.filter(d => d.tracking_status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Pickups</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Driver List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold text-lg">Drivers</h2>
            {!drivers || drivers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No drivers registered yet</p>
                </CardContent>
              </Card>
            ) : (
              drivers.map(driver => {
                const isActive = activeDriverIds.has(driver.id);
                const driverDelivery = activeDeliveries.find(
                  d => d.driver_id === driver.id && d.tracking_status === 'in_transit'
                );

                return (
                  <Card
                    key={driver.id}
                    className={`cursor-pointer transition-all ${
                      selectedDriverId === driver.id
                        ? 'ring-2 ring-[#009EE0] bg-[#009EE0]/5'
                        : 'hover:bg-muted/50'
                    } ${!isActive && 'opacity-60'}`}
                    onClick={() => setSelectedDriverId(driver.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${isActive ? 'bg-green-500/10' : 'bg-muted'}`}>
                            <User className={`w-4 h-4 ${isActive ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{driver.name}</h3>
                            {driver.phone && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {driver.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-green-500' : ''}>
                          {isActive ? 'Active' : 'Idle'}
                        </Badge>
                      </div>

                      {driverDelivery && (
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p className="text-muted-foreground">
                            Delivering to: <span className="font-medium text-foreground">
                              {driverDelivery.restaurants?.name || 'Unknown'}
                            </span>
                          </p>
                          {driver.last_location_update && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last update: {formatDistanceToNow(new Date(driver.last_location_update))} ago
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Map View */}
          <div className="lg:col-span-2">
            {selectedDelivery ? (
              <LiveDeliveryMap
                deliveryId={selectedDelivery.id}
                restaurantLocation={
                  selectedDelivery.restaurants?.latitude && selectedDelivery.restaurants?.longitude
                    ? {
                        lat: selectedDelivery.restaurants.latitude,
                        lng: selectedDelivery.restaurants.longitude,
                      }
                    : undefined
                }
                restaurantName={selectedDelivery.restaurants?.name || 'Destination'}
                driverName={selectedDriver?.name || 'Driver'}
              />
            ) : selectedDriver ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">{selectedDriver.name}</h3>
                  <p className="text-muted-foreground">
                    This driver is not currently on an active delivery.
                  </p>
                  {selectedDriver.current_latitude && selectedDriver.current_longitude && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Last known location: {selectedDriver.current_latitude.toFixed(4)}, {selectedDriver.current_longitude.toFixed(4)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    Select a driver to view their location
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainContent>
  );
}
