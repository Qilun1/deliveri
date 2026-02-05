import { useState, useEffect } from 'react';
import { Truck, Clock, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveDeliveryMap } from '@/components/delivery/LiveDeliveryMap';
import { TrackingStatusBadge } from '@/components/delivery/TrackingStatusBadge';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useAuth } from '@clerk/clerk-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActiveDelivery {
  id: string;
  supplier_id: string;
  restaurant_id: string;
  driver_id: string | null;
  tracking_status: 'pending' | 'in_transit' | 'delivered' | null;
  tracking_started_at: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  created_at: string;
  suppliers?: {
    business_name: string | null;
  };
  drivers?: {
    name: string;
    phone: string | null;
  };
}

export default function ActiveDeliveriesPage() {
  const { userId } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [restaurantLocation, setRestaurantLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchActiveDeliveries = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      // Get restaurant profile for this user
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, latitude, longitude')
        .eq('user_id', userId)
        .single();

      if (restaurant?.latitude && restaurant?.longitude) {
        setRestaurantLocation({
          lat: restaurant.latitude,
          lng: restaurant.longitude,
        });
      }

      // Get active deliveries for this restaurant
      const { data, error } = await supabase
        .from('outgoing_deliveries')
        .select(`
          id,
          supplier_id,
          restaurant_id,
          driver_id,
          tracking_status,
          tracking_started_at,
          current_latitude,
          current_longitude,
          last_location_update,
          created_at,
          suppliers (
            business_name
          ),
          drivers (
            name,
            phone
          )
        `)
        .eq('restaurant_id', restaurant?.id)
        .in('tracking_status', ['pending', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeliveries(data || []);

      // Auto-select first in-transit delivery
      const inTransit = data?.find(d => d.tracking_status === 'in_transit');
      if (inTransit && !selectedDeliveryId) {
        setSelectedDeliveryId(inTransit.id);
      }
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
      .channel('active-deliveries')
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
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const selectedDelivery = deliveries.find(d => d.id === selectedDeliveryId);

  if (isLoading) {
    return (
      <AppLayout>
        <MainContent>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </MainContent>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <MainContent>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Track Deliveries</h1>
              <p className="text-muted-foreground mt-1">
                Monitor incoming deliveries in real-time
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

          {deliveries.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Active Deliveries</h3>
                <p className="text-muted-foreground">
                  When a supplier sends a delivery your way, you'll be able to track it here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Delivery List */}
              <div className="lg:col-span-1 space-y-4">
                <h2 className="font-semibold text-lg">Active Deliveries</h2>
                {deliveries.map(delivery => (
                  <Card
                    key={delivery.id}
                    className={`cursor-pointer transition-all ${
                      selectedDeliveryId === delivery.id
                        ? 'ring-2 ring-[#009EE0] bg-[#009EE0]/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedDeliveryId(delivery.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {delivery.suppliers?.business_name || 'Unknown Supplier'}
                          </h3>
                          {delivery.drivers && (
                            <p className="text-sm text-muted-foreground">
                              Driver: {delivery.drivers.name}
                            </p>
                          )}
                        </div>
                        <TrackingStatusBadge status={delivery.tracking_status} />
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {delivery.tracking_started_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Started {formatDistanceToNow(new Date(delivery.tracking_started_at))} ago
                          </div>
                        )}
                        {delivery.last_location_update && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Updated {formatDistanceToNow(new Date(delivery.last_location_update))} ago
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Map View */}
              <div className="lg:col-span-2">
                {selectedDelivery ? (
                  <LiveDeliveryMap
                    deliveryId={selectedDelivery.id}
                    restaurantLocation={restaurantLocation || undefined}
                    restaurantName="Your Restaurant"
                    driverName={selectedDelivery.drivers?.name || 'Driver'}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        Select a delivery to view live tracking
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </MainContent>
    </AppLayout>
  );
}
