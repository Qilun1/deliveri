import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useAuth } from '@/contexts/AuthContext';

export type ReportStatus = 'pending' | 'acknowledged' | 'resolved' | 'disputed';

export interface MissingItemsReportItem {
    id: string;
    report_id: string;
    item_name: string;
    expected_quantity: number;
    received_quantity: number;
    missing_quantity: number;
    unit: string | null;
    price_per_unit: number | null;
    total_missing_value: number | null;
    created_at: string;
}

export interface MissingItemsReport {
    id: string;
    delivery_id: string | null;
    restaurant_id: string;
    supplier_id: string;
    status: ReportStatus;
    total_missing_value: number | null;
    items_count: number | null;
    notes: string | null;
    created_at: string;
    acknowledged_at: string | null;
    resolved_at: string | null;
}

export interface SupplierInfo {
    id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
}

export interface DeliveryInfo {
    id: string;
    delivery_date: string;
    order_number: string | null;
    receipt_image_url: string | null;
}

export interface MissingItemsReportWithDetails extends MissingItemsReport {
    supplier?: SupplierInfo;
    delivery?: DeliveryInfo;
    items?: MissingItemsReportItem[];
}

export interface ReportFilters {
    status?: ReportStatus | 'all';
    supplierId?: string | 'all';
}

/**
 * Fetch all missing items reports submitted by the restaurant
 */
export function useRestaurantReportsList(filters?: ReportFilters) {
    const { user } = useAuth();
    const supabase = useAuthenticatedSupabase();
    const restaurantId = user?.businessId || '';

    return useQuery({
        queryKey: ['restaurant-reports', restaurantId, filters],
        queryFn: async (): Promise<MissingItemsReportWithDetails[]> => {
            if (!restaurantId) {
                return [];
            }

            // Build the query
            let query = supabase
                .from('missing_items_reports')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });

            // Apply status filter
            if (filters?.status && filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }

            // Apply supplier filter
            if (filters?.supplierId && filters.supplierId !== 'all') {
                query = query.eq('supplier_id', filters.supplierId);
            }

            const { data: reports, error } = await query;

            if (error) {
                throw error;
            }
            if (!reports || reports.length === 0) {
                return [];
            }

            // Get unique supplier IDs
            const supplierIds = [...new Set(reports.map(r => r.supplier_id))];

            // Fetch supplier info
            const { data: suppliers, error: supplierError } = await supabase
                .from('suppliers')
                .select('id, name, contact_email, contact_phone')
                .in('id', supplierIds);

            if (supplierError) {
                console.error('Error fetching suppliers:', supplierError);
            }

            // Create a map for quick lookup
            const supplierMap = new Map<string, SupplierInfo>();
            (suppliers || []).forEach(s => supplierMap.set(s.id, s));

            // Combine reports with supplier info
            const result: MissingItemsReportWithDetails[] = reports.map(report => ({
                ...report,
                supplier: supplierMap.get(report.supplier_id),
            }));

            return result;
        },
        enabled: !!restaurantId,
    });
}

/**
 * Fetch a single report with full details including items
 */
export function useRestaurantReportDetails(reportId: string | undefined) {
    const supabase = useAuthenticatedSupabase();

    return useQuery({
        queryKey: ['restaurant-report-details', reportId],
        queryFn: async (): Promise<MissingItemsReportWithDetails | null> => {
            if (!reportId) return null;

            // Fetch the report
            const { data: report, error: reportError } = await supabase
                .from('missing_items_reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (reportError) throw reportError;
            if (!report) return null;

            // Fetch the items
            const { data: items, error: itemsError } = await supabase
                .from('missing_items_report_items')
                .select('*')
                .eq('report_id', reportId)
                .order('item_name', { ascending: true });

            if (itemsError) {
                console.error('Error fetching report items:', itemsError);
            }

            // Fetch supplier info
            const { data: supplier, error: supplierError } = await supabase
                .from('suppliers')
                .select('id, name, contact_email, contact_phone')
                .eq('id', report.supplier_id)
                .single();

            if (supplierError) {
                console.error('Error fetching supplier:', supplierError);
            }

            // Fetch delivery info if available
            let delivery: DeliveryInfo | undefined;
            if (report.delivery_id) {
                const { data: deliveryData, error: deliveryError } = await supabase
                    .from('deliveries')
                    .select('id, delivery_date, order_number, receipt_image_url')
                    .eq('id', report.delivery_id)
                    .single();

                if (!deliveryError && deliveryData) {
                    delivery = deliveryData;
                }
            }

            return {
                ...report,
                supplier: supplier || undefined,
                delivery,
                items: items || [],
            };
        },
        enabled: !!reportId,
    });
}

/**
 * Get report statistics for the restaurant dashboard
 */
export function useRestaurantReportStats() {
    const { user } = useAuth();
    const supabase = useAuthenticatedSupabase();
    const restaurantId = user?.businessId || '';

    return useQuery({
        queryKey: ['restaurant-report-stats', restaurantId],
        queryFn: async () => {
            if (!restaurantId) return null;

            const { data, error } = await supabase
                .from('missing_items_reports')
                .select('status, total_missing_value')
                .eq('restaurant_id', restaurantId);

            if (error) throw error;

            const reports = data || [];

            return {
                total: reports.length,
                pending: reports.filter(r => r.status === 'pending').length,
                acknowledged: reports.filter(r => r.status === 'acknowledged').length,
                resolved: reports.filter(r => r.status === 'resolved').length,
                disputed: reports.filter(r => r.status === 'disputed').length,
                totalMissingValue: reports.reduce((sum, r) => sum + (Number(r.total_missing_value) || 0), 0),
                recoveredValue: reports
                    .filter(r => r.status === 'resolved')
                    .reduce((sum, r) => sum + (Number(r.total_missing_value) || 0), 0),
            };
        },
        enabled: !!restaurantId,
    });
}
