import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useUser } from '@clerk/clerk-react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Types for missing items reports
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

export interface RestaurantInfo {
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

export interface MissingItemsReportWithRestaurant extends MissingItemsReport {
    restaurant?: RestaurantInfo;
    delivery?: DeliveryInfo;
    items?: MissingItemsReportItem[];
}

export interface RealtimeReportEvent {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    report: MissingItemsReport;
    timestamp: Date;
}

export interface ReportFilters {
    status?: ReportStatus | 'all';
    search?: string;
}

/**
 * Hook for supplier incoming missing items reports
 * Provides real-time subscription, fetching, and mutations
 */
export function useSupplierReports() {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierId = user?.id || '';
    const queryClient = useQueryClient();

    // Real-time state
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<RealtimeReportEvent | null>(null);

    // Handle real-time changes
    const handleRealtimeChange = useCallback(
        (payload: RealtimePostgresChangesPayload<MissingItemsReport>) => {
            const report = payload.new as MissingItemsReport;

            // Only process if this report is for our supplier
            if (report?.supplier_id !== supplierId) return;

            const event: RealtimeReportEvent = {
                type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                report,
                timestamp: new Date(),
            };

            setLastEvent(event);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['supplier-reports'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-report-details'] });
        },
        [supplierId, queryClient]
    );

    // Set up real-time subscription
    useEffect(() => {
        if (!supplierId) return;

        const channelName = `supplier-reports-${supplierId}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'missing_items_reports',
                    filter: `supplier_id=eq.${supplierId}`,
                },
                handleRealtimeChange
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
    }, [supplierId, handleRealtimeChange]);

    return {
        supplierId,
        isConnected,
        lastEvent,
    };
}

/**
 * Fetch all reports for the supplier with optional filtering
 */
export function useSupplierReportsList(filters?: ReportFilters) {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierId = user?.id || '';

    return useQuery({
        queryKey: ['supplier-reports', supplierId, filters],
        queryFn: async (): Promise<MissingItemsReportWithRestaurant[]> => {
            if (!supplierId) {
                return [];
            }

            // Build the query
            let query = supabase
                .from('missing_items_reports')
                .select('*')
                .eq('supplier_id', supplierId)
                .order('created_at', { ascending: false });

            // Apply status filter
            if (filters?.status && filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }

            const { data: reports, error } = await query;

            if (error) {
                throw error;
            }
            if (!reports || reports.length === 0) {
                return [];
            }

            // Get unique restaurant IDs
            const restaurantIds = [...new Set(reports.map(r => r.restaurant_id))];

            // Fetch restaurant info
            const { data: restaurants, error: restaurantError } = await supabase
                .from('restaurants')
                .select('id, name, contact_email, contact_phone')
                .in('id', restaurantIds);

            if (restaurantError) {
                console.error('Error fetching restaurants:', restaurantError);
            }

            // Create a map for quick lookup
            const restaurantMap = new Map<string, RestaurantInfo>();
            (restaurants || []).forEach(r => restaurantMap.set(r.id, r));

            // Combine reports with restaurant info
            let result: MissingItemsReportWithRestaurant[] = reports.map(report => ({
                ...report,
                restaurant: restaurantMap.get(report.restaurant_id),
            }));

            // Apply search filter (client-side for restaurant name)
            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                result = result.filter(report =>
                    report.restaurant?.name?.toLowerCase().includes(searchLower)
                );
            }

            return result;
        },
        enabled: !!supplierId,
    });
}

/**
 * Fetch a single report with full details including items
 */
export function useSupplierReportDetails(reportId: string | undefined) {
    const supabase = useAuthenticatedSupabase();
    return useQuery({
        queryKey: ['supplier-report-details', reportId],
        queryFn: async (): Promise<MissingItemsReportWithRestaurant | null> => {
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

            // Fetch restaurant info
            const { data: restaurant, error: restaurantError } = await supabase
                .from('restaurants')
                .select('id, name, contact_email, contact_phone')
                .eq('id', report.restaurant_id)
                .single();

            if (restaurantError) {
                console.error('Error fetching restaurant:', restaurantError);
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
                restaurant: restaurant || undefined,
                delivery,
                items: items || [],
            };
        },
        enabled: !!reportId,
    });
}

/**
 * Acknowledge a report (status: pending -> acknowledged)
 */
export function useAcknowledgeReport() {
    const queryClient = useQueryClient();
    const supabase = useAuthenticatedSupabase();

    return useMutation({
        mutationFn: async (reportId: string) => {
            const { data, error } = await supabase
                .from('missing_items_reports')
                .update({
                    status: 'acknowledged',
                    acknowledged_at: new Date().toISOString(),
                })
                .eq('id', reportId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-reports'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-report-details'] });
        },
    });
}

export type ResolutionType = 'redelivery_scheduled' | 'credit_issued' | 'other';

export interface ResolveReportParams {
    reportId: string;
    resolutionType: ResolutionType;
    note?: string;
}

/**
 * Resolve a report (status: acknowledged -> resolved)
 */
export function useResolveReport() {
    const queryClient = useQueryClient();
    const supabase = useAuthenticatedSupabase();

    return useMutation({
        mutationFn: async ({ reportId, resolutionType, note }: ResolveReportParams) => {
            // Build the notes string
            const resolutionLabels: Record<ResolutionType, string> = {
                redelivery_scheduled: 'Redelivery scheduled',
                credit_issued: 'Credit issued',
                other: 'Other resolution',
            };

            const notesUpdate = `Resolution: ${resolutionLabels[resolutionType]}${note ? ` - ${note}` : ''}`;

            const { data, error } = await supabase
                .from('missing_items_reports')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    notes: notesUpdate,
                })
                .eq('id', reportId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-reports'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-report-details'] });
        },
    });
}

export type DisputeReason = 'items_delivered' | 'quantities_incorrect' | 'other';

export interface DisputeReportParams {
    reportId: string;
    reason: DisputeReason;
    details?: string;
}

/**
 * Dispute a report (status: pending/acknowledged -> disputed)
 */
export function useDisputeReport() {
    const queryClient = useQueryClient();
    const supabase = useAuthenticatedSupabase();

    return useMutation({
        mutationFn: async ({ reportId, reason, details }: DisputeReportParams) => {
            // Build the notes string
            const reasonLabels: Record<DisputeReason, string> = {
                items_delivered: 'Items were delivered',
                quantities_incorrect: 'Quantities incorrect',
                other: 'Other reason',
            };

            const notesUpdate = `Dispute: ${reasonLabels[reason]}${details ? ` - ${details}` : ''}`;

            const { data, error } = await supabase
                .from('missing_items_reports')
                .update({
                    status: 'disputed',
                    notes: notesUpdate,
                })
                .eq('id', reportId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-reports'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-report-details'] });
        },
    });
}

/**
 * Hook for tracking new report alerts
 */
export function useRealtimeReportAlerts() {
    const [newReportsCount, setNewReportsCount] = useState(0);
    const [recentReports, setRecentReports] = useState<MissingItemsReport[]>([]);
    const { lastEvent, isConnected } = useSupplierReports();

    useEffect(() => {
        if (lastEvent?.type === 'INSERT') {
            setNewReportsCount(prev => prev + 1);
            setRecentReports(prev => [lastEvent.report, ...prev].slice(0, 10));
        }
    }, [lastEvent]);

    const clearAlerts = useCallback(() => {
        setNewReportsCount(0);
    }, []);

    const clearRecentReports = useCallback(() => {
        setRecentReports([]);
        setNewReportsCount(0);
    }, []);

    return {
        isConnected,
        newReportsCount,
        recentReports,
        lastEvent,
        clearAlerts,
        clearRecentReports,
    };
}
