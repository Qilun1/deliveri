export interface Driver {
  id: string;
  supplier_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  vehicle_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
}

export interface Delivery {
  id: string;
  supplier_id: string;
  restaurant_id: string;
  driver_id: string | null;
  tracking_status: 'pending' | 'in_transit' | 'delivered' | null;
  tracking_started_at: string | null;
  tracking_ended_at: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  created_at: string;
}

export interface DeliveryLocation {
  id: string;
  delivery_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  recorded_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}
