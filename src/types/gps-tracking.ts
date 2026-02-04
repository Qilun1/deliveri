// GPS Tracking Types for DeliVeri

export interface Driver {
  id: string;
  supplier_id: string;
  clerk_user_id?: string;
  name: string;
  phone?: string;
  email?: string;
  vehicle_type?: 'car' | 'van' | 'bike' | 'scooter';
  vehicle_plate?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryLocation {
  id: string;
  delivery_id: string;
  driver_id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
  recorded_at: string;
  created_at: string;
}

export interface DeliveryTrackingInfo {
  delivery_id: string;
  driver_id?: string;
  driver?: Driver;
  current_latitude?: number;
  current_longitude?: number;
  current_speed?: number;
  current_heading?: number;
  last_location_update?: string;
  tracking_started_at?: string;
  tracking_ended_at?: string;
  estimated_arrival_time?: string;
  route_distance_km?: number;
  route_duration_minutes?: number;
}

export interface LocationUpdate {
  delivery_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TrackingState {
  isTracking: boolean;
  currentLocation: Coordinates | null;
  lastUpdate: Date | null;
  error: string | null;
  batteryLevel: number | null;
}

export interface LocationRealtimeEvent {
  type: 'INSERT' | 'UPDATE';
  location: DeliveryLocation;
  timestamp: Date;
}

export interface DeliveryTrackingEvent {
  type: 'location_update' | 'tracking_started' | 'tracking_ended' | 'eta_updated';
  delivery_id: string;
  data: Partial<DeliveryTrackingInfo>;
  timestamp: Date;
}
