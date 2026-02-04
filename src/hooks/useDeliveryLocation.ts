import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthenticatedSupabase } from './useAuthenticatedSupabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { DeliveryLocation, Coordinates, DeliveryTrackingInfo, Driver } from '@/types/gps-tracking';

interface UseDeliveryLocationOptions {
  deliveryId: string | undefined;
  enabled?: boolean;
}

interface UseDeliveryLocationReturn {
  currentLocation: Coordinates | null;
  trackingInfo: DeliveryTrackingInfo | null;
  locationHistory: DeliveryLocation[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastUpdate: Date | null;
  estimatedArrival: Date | null;
  distanceRemaining: number | null;
}

export function useDeliveryLocation({
  deliveryId,
  enabled = true,
}: UseDeliveryLocationOptions): UseDeliveryLocationReturn {
  const supabase = useAuthenticatedSupabase();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<DeliveryTrackingInfo | null>(null);
  const [locationHistory, setLocationHistory] = useState<DeliveryLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchTrackingData = useCallback(async () => {
    if (!deliveryId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: delivery, error: deliveryError } = await supabase
        .from('outgoing_deliveries')
        .select(`
          id,
          driver_id,
          current_latitude,
          current_longitude,
          current_speed,
          current_heading,
          last_location_update,
          tracking_started_at,
          tracking_ended_at,
          estimated_arrival_time,
          route_distance_km,
          route_duration_minutes,
          drivers (
            id,
            name,
            phone,
            vehicle_type,
            vehicle_plate
          )
        `)
        .eq('id', deliveryId)
        .single();

      if (deliveryError) throw deliveryError;

      if (delivery) {
        setTrackingInfo({
          delivery_id: delivery.id,
          driver_id: delivery.driver_id,
          driver: delivery.drivers as unknown as Driver,
          current_latitude: delivery.current_latitude,
          current_longitude: delivery.current_longitude,
          current_speed: delivery.current_speed,
          current_heading: delivery.current_heading,
          last_location_update: delivery.last_location_update,
          tracking_started_at: delivery.tracking_started_at,
          tracking_ended_at: delivery.tracking_ended_at,
          estimated_arrival_time: delivery.estimated_arrival_time,
          route_distance_km: delivery.route_distance_km,
          route_duration_minutes: delivery.route_duration_minutes,
        });

        if (delivery.current_latitude && delivery.current_longitude) {
          setCurrentLocation({
            lat: Number(delivery.current_latitude),
            lng: Number(delivery.current_longitude),
          });
          setLastUpdate(delivery.last_location_update ? new Date(delivery.last_location_update) : null);
        }
      }

      const { data: history, error: historyError } = await supabase
        .from('delivery_locations')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (historyError) throw historyError;

      setLocationHistory(history || []);

    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError('Failed to load tracking data');
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId, supabase]);

  useEffect(() => {
    if (!deliveryId || !enabled) return;

    fetchTrackingData();

    const channel = supabase
      .channel(`delivery-tracking-${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_locations',
          filter: `delivery_id=eq.${deliveryId}`,
        },
        (payload) => {
          const newLocation = payload.new as DeliveryLocation;

          setCurrentLocation({
            lat: Number(newLocation.latitude),
            lng: Number(newLocation.longitude),
          });

          setTrackingInfo(prev => prev ? {
            ...prev,
            current_latitude: newLocation.latitude,
            current_longitude: newLocation.longitude,
            current_speed: newLocation.speed,
            current_heading: newLocation.heading,
            last_location_update: newLocation.recorded_at,
          } : null);

          setLocationHistory(prev => [newLocation, ...prev].slice(0, 100));
          setLastUpdate(new Date(newLocation.recorded_at));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'outgoing_deliveries',
          filter: `id=eq.${deliveryId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;

          setTrackingInfo(prev => prev ? {
            ...prev,
            driver_id: updated.driver_id as string,
            estimated_arrival_time: updated.estimated_arrival_time as string,
            tracking_started_at: updated.tracking_started_at as string,
            tracking_ended_at: updated.tracking_ended_at as string,
          } : null);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [deliveryId, enabled, supabase, fetchTrackingData]);

  const estimatedArrival = trackingInfo?.estimated_arrival_time
    ? new Date(trackingInfo.estimated_arrival_time)
    : null;

  const distanceRemaining = trackingInfo?.route_distance_km ?? null;

  return {
    currentLocation,
    trackingInfo,
    locationHistory,
    isLoading,
    isConnected,
    error,
    lastUpdate,
    estimatedArrival,
    distanceRemaining,
  };
}
