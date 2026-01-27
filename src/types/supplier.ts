export interface Supplier {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_major_tukku: boolean;
  priority_order: number | null;
  created_at: string;
}

export interface SupplierConnection {
  id: string;
  restaurant_id: string;
  supplier_id: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  supplier?: Supplier;
}

export interface MissingItemsReport {
  id: string;
  delivery_id: string | null;
  restaurant_id: string;
  supplier_id: string;
  status: 'pending' | 'acknowledged' | 'resolved' | 'disputed';
  total_missing_value: number;
  items_count: number;
  notes: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  last_action_by?: string | null;
}

export type SupplierConnectionStatus = 'pending' | 'active' | 'inactive';
export type MissingItemsReportStatus = 'pending' | 'acknowledged' | 'resolved' | 'disputed';
