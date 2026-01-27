export interface DeliveryItem {
    id?: string;
    delivery_id?: string;
    name: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    total_price: number;
    received_quantity: number | null;
    missing_quantity: number | null;
    status: 'received' | 'missing' | 'pending';
    created_at?: string;
}

export interface Delivery {
    id: string;
    user_id: string;
    supplier_name: string;
    supplier_id?: string | null;
    restaurant_id?: string | null;
    delivery_date: string;
    order_number: string | null;
    total_value: number;
    missing_value: number;
    status: 'complete' | 'pending_redelivery' | 'resolved' | 'draft';
    items?: DeliveryItem[];
    created_at: string;
    updated_at: string;
}
