import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@clerk/clerk-react';
import * as mock from '@/data/mockData';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Types based on existing Supabase tables
export interface Delivery {
    id: string;
    user_id: string;
    supplier_name: string;
    delivery_date: string;
    order_number: string | null;
    total_value: number;
    missing_value: number;
    status: 'draft' | 'complete' | 'pending_redelivery' | 'resolved';
    created_at: string;
    updated_at: string;
    restaurant_id: string | null;
    supplier_id?: string; // For mock mapping
    last_action_by?: string | null;
}

export interface DeliveryItem {
    id: string;
    delivery_id: string;
    name: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    total_price: number;
    received_quantity: number | null;
    missing_quantity: number | null;
    status: 'received' | 'missing' | 'pending';
    created_at: string;
}

export interface Product {
    name: string | null;
    price: number | null;
    url: string | null;
    image_url: string | null;
    code: number | null;
    scraped_at: string;
}

export interface SupplierStats {
    totalDeliveries: number;
    pendingDeliveries: number;
    activeDeliveries: number;
    openIssues: number;
    uniqueRestaurants: number;
    totalRevenue: number;
}

// ============ DELIVERIES (Orders from restaurants) ============

/**
 * Fetch all deliveries for the current supplier
 * These are orders placed by restaurants that need to be fulfilled
 */
export function useSupplierDeliveries() {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierName = (user?.publicMetadata?.companyName || user?.unsafeMetadata?.companyName || 'Kespro') as string;

    return useQuery({
        queryKey: ['supplier-deliveries', supplierName],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deliveries')
                .select('*')
                .eq('supplier_name', supplierName)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fallback to mock data if empty
            if (!data || data.length === 0) {
                const mockSupplier = mock.MOCK_SUPPLIERS.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
                if (mockSupplier) {
                    return mock.MOCK_DELIVERIES
                        .filter(d => d.supplierId === mockSupplier.id)
                        .map(d => ({
                            id: d.id,
                            user_id: d.restaurantId,
                            supplier_name: d.supplierName,
                            delivery_date: d.deliveryDate.toISOString(),
                            order_number: d.orderNumber,
                            total_value: d.items.reduce((sum, i) => sum + i.totalPrice, 0),
                            missing_value: d.discrepancyValue,
                            status: d.status === 'verified' ? 'complete' : (d.status === 'discrepancy_reported' ? 'pending_redelivery' : 'draft'),
                            created_at: d.createdAt.toISOString(),
                            updated_at: d.createdAt.toISOString(),
                            restaurant_id: d.restaurantId
                        } as Delivery));
                }
            }

            return data as Delivery[];
        },
    });
}

/**
 * Fetch deliveries with specific statuses (for filtering)
 */
export function useSupplierDeliveriesByStatus(statuses: string[]) {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierName = (user?.publicMetadata?.companyName || user?.unsafeMetadata?.companyName || 'Kespro') as string;

    return useQuery({
        queryKey: ['supplier-deliveries', supplierName, 'status', statuses],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deliveries')
                .select('*')
                .eq('supplier_name', supplierName)
                .in('status', statuses)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Delivery[];
        },
    });
}

/**
 * Fetch a single delivery with its items
 */
export function useSupplierDeliveryWithItems(deliveryId: string | undefined) {
    const supabase = useAuthenticatedSupabase();
    return useQuery({
        queryKey: ['supplier-delivery', deliveryId],
        queryFn: async () => {
            if (!deliveryId) return null;

            const { data: delivery, error: deliveryError } = await supabase
                .from('deliveries')
                .select('*')
                .eq('id', deliveryId)
                .single();

            if (deliveryError) throw deliveryError;

            const { data: items, error: itemsError } = await supabase
                .from('delivery_items')
                .select('*')
                .eq('delivery_id', deliveryId);

            if (itemsError) throw itemsError;

            return {
                delivery: delivery as Delivery,
                items: items as DeliveryItem[],
            };
        },
        enabled: !!deliveryId,
    });
}

// ============ ISSUES (Deliveries with discrepancies) ============

/**
 * Fetch deliveries with discrepancies (missing_value > 0)
 */
export function useSupplierIssues() {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierName = (user?.publicMetadata?.companyName || user?.unsafeMetadata?.companyName || 'Kespro') as string;

    return useQuery({
        queryKey: ['supplier-issues', supplierName],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deliveries')
                .select('*')
                .eq('supplier_name', supplierName)
                .gt('missing_value', 0)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fallback to mock data if empty
            if (!data || data.length === 0) {
                const mockSupplier = mock.MOCK_SUPPLIERS.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
                if (mockSupplier) {
                    return mock.MOCK_DELIVERIES
                        .filter(d => d.supplierId === mockSupplier.id && d.discrepancyValue > 0)
                        .map(d => ({
                            id: d.id,
                            user_id: d.restaurantId,
                            supplier_name: d.supplierName,
                            delivery_date: d.deliveryDate.toISOString(),
                            order_number: d.orderNumber,
                            total_value: d.items.reduce((sum, i) => sum + i.totalPrice, 0),
                            missing_value: d.discrepancyValue,
                            status: d.status === 'verified' ? 'complete' : (d.status === 'discrepancy_reported' ? 'pending_redelivery' : 'draft'),
                            created_at: d.createdAt.toISOString(),
                            updated_at: d.createdAt.toISOString(),
                            restaurant_id: d.restaurantId
                        } as Delivery));
                }
            }

            return data as Delivery[];
        },
    });
}

/**
 * Fetch open issues (pending_redelivery status)
 */
export function useSupplierOpenIssues() {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierName = (user?.publicMetadata?.companyName || user?.unsafeMetadata?.companyName || 'Kespro') as string;

    return useQuery({
        queryKey: ['supplier-open-issues', supplierName],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deliveries')
                .select('*')
                .eq('supplier_name', supplierName)
                .eq('status', 'pending_redelivery')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fallback to mock data if empty
            if (!data || data.length === 0) {
                const mockSupplier = mock.MOCK_SUPPLIERS.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
                if (mockSupplier) {
                    return mock.MOCK_DELIVERIES
                        .filter(d => d.supplierId === mockSupplier.id && d.status === 'discrepancy_reported')
                        .map(d => ({
                            id: d.id,
                            user_id: d.restaurantId,
                            supplier_name: d.supplierName,
                            delivery_date: d.deliveryDate.toISOString(),
                            order_number: d.orderNumber,
                            total_value: d.items.reduce((sum, i) => sum + i.totalPrice, 0),
                            missing_value: d.discrepancyValue,
                            status: 'pending_redelivery',
                            created_at: d.createdAt.toISOString(),
                            updated_at: d.createdAt.toISOString(),
                            restaurant_id: d.restaurantId
                        } as Delivery));
                }
            }

            return data as Delivery[];
        },
    });
}

// ============ PRODUCTS ============

/**
 * Fetch products from metrotukku_products table
 */
export function useSupplierProducts() {
    const supabase = useAuthenticatedSupabase();
    return useQuery({
        queryKey: ['supplier-products'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('metrotukku_products')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data as Product[];
        },
    });
}

// ============ RESTAURANTS (Aggregated from deliveries) ============

export interface ConnectedRestaurant {
    restaurantId: string;
    totalDeliveries: number;
    totalValue: number;
    lastDeliveryDate: string | null;
}

/**
 * Get unique restaurants that have ordered from this supplier
 * Aggregated from deliveries table
 */
export function useSupplierRestaurants() {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierName = (user?.publicMetadata?.companyName || user?.unsafeMetadata?.companyName || 'Kespro') as string;

    return useQuery({
        queryKey: ['supplier-restaurants', supplierName],
        queryFn: async () => {
            let { data, error } = await supabase
                .from('deliveries')
                .select('user_id, total_value, delivery_date')
                .eq('supplier_name', supplierName);

            if (error) throw error;

            // Fallback to mock data if empty
            if (!data || data.length === 0) {
                const mockSupplier = mock.MOCK_SUPPLIERS.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
                if (mockSupplier) {
                    return mock.getRestaurantsForSupplier(mockSupplier.id).map(r => ({
                        restaurantId: r.restaurantId,
                        totalDeliveries: r.totalOrders,
                        totalValue: r.totalRevenue,
                        lastDeliveryDate: r.lastOrderDate ? r.lastOrderDate.toISOString() : null
                    }));
                }
            }

            // Aggregate by user_id (restaurant)
            const restaurantMap = new Map<string, ConnectedRestaurant>();

            (data || []).forEach((delivery) => {
                const existing = restaurantMap.get(delivery.user_id);
                if (existing) {
                    existing.totalDeliveries += 1;
                    existing.totalValue += Number(delivery.total_value) || 0;
                    if (delivery.delivery_date > (existing.lastDeliveryDate || '')) {
                        existing.lastDeliveryDate = delivery.delivery_date;
                    }
                } else {
                    restaurantMap.set(delivery.user_id, {
                        restaurantId: delivery.user_id,
                        totalDeliveries: 1,
                        totalValue: Number(delivery.total_value) || 0,
                        lastDeliveryDate: delivery.delivery_date,
                    });
                }
            });

            return Array.from(restaurantMap.values()).sort(
                (a, b) => b.totalValue - a.totalValue
            );
        },
    });
}

// ============ STATISTICS ============

/**
 * Get supplier dashboard statistics
 */
export function useSupplierStats() {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierName = (user?.publicMetadata?.companyName || user?.unsafeMetadata?.companyName || 'Kespro') as string;

    return useQuery({
        queryKey: ['supplier-stats', supplierName],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deliveries')
                .select('id, user_id, status, total_value, missing_value')
                .eq('supplier_name', supplierName);

            if (error) throw error;

            const deliveries = data || [];

            // Fallback to mock stats if no real deliveries
            if (deliveries.length === 0) {
                const mockSupplier = mock.MOCK_SUPPLIERS.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
                if (mockSupplier) {
                    const mockStats = mock.getSupplierStats(mockSupplier.id);
                    return {
                        totalDeliveries: mockStats.totalOrders,
                        pendingDeliveries: mockStats.pendingOrders,
                        activeDeliveries: mockStats.deliveriesInTransit,
                        openIssues: mockStats.openIssues,
                        uniqueRestaurants: mockStats.connectedRestaurants,
                        totalRevenue: mockStats.totalRevenue,
                    };
                }
            }

            const stats: SupplierStats = {
                totalDeliveries: deliveries.length,
                pendingDeliveries: deliveries.filter((d) => d.status === 'draft').length,
                activeDeliveries: deliveries.filter(
                    (d) => d.status === 'complete' || d.status === 'pending_redelivery'
                ).length,
                openIssues: deliveries.filter((d) => d.status === 'pending_redelivery').length,
                uniqueRestaurants: new Set(deliveries.map((d) => d.user_id)).size,
                totalRevenue: deliveries
                    .filter((d) => d.status === 'complete' || d.status === 'resolved')
                    .reduce((sum, d) => sum + (Number(d.total_value) || 0), 0),
            };

            return stats;
        },
    });
}

// ============ MUTATIONS ============

/**
 * Update delivery status (e.g., resolve an issue)
 */
export function useUpdateDeliveryStatus() {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const supabase = useAuthenticatedSupabase();

    return useMutation({
        mutationFn: async ({
            deliveryId,
            status,
        }: {
            deliveryId: string;
            status: Delivery['status'];
        }) => {
            const { data, error } = await supabase
                .from('deliveries')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                    last_action_by: user?.id
                })
                .eq('id', deliveryId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['supplier-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-issues'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-open-issues'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
        },
    });
}

/**
 * Get recent deliveries (for dashboard)
 */
export function useRecentSupplierDeliveries(limit: number = 5) {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierName = (user?.publicMetadata?.companyName || user?.unsafeMetadata?.companyName || 'Kespro') as string;

    return useQuery({
        queryKey: ['supplier-recent-deliveries', supplierName, limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('deliveries')
                .select('*')
                .eq('supplier_name', supplierName)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            // Fallback to mock data if empty
            if (!data || data.length === 0) {
                const mockSupplier = mock.MOCK_SUPPLIERS.find(s => s.name.toLowerCase().includes(supplierName.toLowerCase()));
                if (mockSupplier) {
                    return mock.MOCK_DELIVERIES
                        .filter(d => d.supplierId === mockSupplier.id)
                        .slice(0, limit)
                        .map(d => ({
                            id: d.id,
                            user_id: d.restaurantId,
                            supplier_name: d.supplierName,
                            delivery_date: d.deliveryDate.toISOString(),
                            order_number: d.orderNumber,
                            total_value: d.items.reduce((sum, i) => sum + i.totalPrice, 0),
                            missing_value: d.discrepancyValue,
                            status: d.status === 'verified' ? 'complete' : (d.status === 'discrepancy_reported' ? 'pending_redelivery' : 'draft'),
                            created_at: d.createdAt.toISOString(),
                            updated_at: d.createdAt.toISOString(),
                            restaurant_id: d.restaurantId
                        } as Delivery));
                }
            }

            return data as Delivery[];
        },
    });
}

// ============ REAL-TIME SUBSCRIPTIONS ============

export interface RealtimeDeliveryEvent {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    delivery: Delivery;
    timestamp: Date;
}

/**
 * Real-time subscription for incoming discrepancy reports
 * This is CRITICAL for demos - suppliers see reports as they arrive
 */
export function useRealtimeDeliveries(onNewReport?: (event: RealtimeDeliveryEvent) => void) {
    const { user } = useUser();
    const supabase = useAuthenticatedSupabase();
    const supplierName = (user?.publicMetadata?.companyName || user?.unsafeMetadata?.companyName || 'Kespro') as string;
    const queryClient = useQueryClient();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<RealtimeDeliveryEvent | null>(null);

    const handleRealtimeChange = useCallback(
        (payload: RealtimePostgresChangesPayload<Delivery>) => {
            const delivery = payload.new as Delivery;

            // Only process if this delivery is for our supplier
            if (delivery?.supplier_name !== supplierName) return;

            const event: RealtimeDeliveryEvent = {
                type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                delivery,
                timestamp: new Date(),
            };

            setLastEvent(event);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['supplier-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-issues'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-open-issues'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-stats'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-recent-deliveries'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-restaurants'] });

            // Call the callback if provided
            if (onNewReport) {
                onNewReport(event);
            }
        },
        [supplierName, queryClient, onNewReport]
    );

    useEffect(() => {
        if (!supplierName) return;

        // Create a unique channel name
        const channelName = `supplier-deliveries-${supplierName.replace(/\s+/g, '-').toLowerCase()}`;

        // Subscribe to changes on the deliveries table
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'deliveries',
                },
                handleRealtimeChange
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                setIsConnected(false);
            }
        };
    }, [supplierName, handleRealtimeChange]);

    return {
        isConnected,
        lastEvent,
    };
}

/**
 * Hook specifically for tracking new discrepancy reports in real-time
 * Shows a count of unread/new reports since last check
 */
export function useRealtimeDiscrepancyAlerts() {
    const [newReportsCount, setNewReportsCount] = useState(0);
    const [recentReports, setRecentReports] = useState<Delivery[]>([]);

    const handleNewReport = useCallback((event: RealtimeDeliveryEvent) => {
        // Only count as new if it's an issue (has missing value)
        const isMissingValueIssue =
            Number(event.delivery.missing_value || 0) > 0 ||
            event.delivery.status === 'pending_redelivery';

        if (event.type === 'INSERT' && isMissingValueIssue) {
            setNewReportsCount((prev) => prev + 1);
            setRecentReports((prev) => [event.delivery, ...prev].slice(0, 10));
        } else if (event.type === 'UPDATE' && isMissingValueIssue) {
            // An existing delivery was updated to have issues
            setNewReportsCount((prev) => prev + 1);
            setRecentReports((prev) => {
                const filtered = prev.filter((d) => d.id !== event.delivery.id);
                return [event.delivery, ...filtered].slice(0, 10);
            });
        }
    }, []);

    const { isConnected, lastEvent } = useRealtimeDeliveries(handleNewReport);

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

// ============ RESTAURANT PROFILES ============

export interface RestaurantProfile {
    id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    street_address: string | null;
    city: string | null;
    postal_code: string | null;
}

export interface ConnectedRestaurantWithProfile extends ConnectedRestaurant {
    profile: RestaurantProfile | null;
    discrepancyRate: number;
    issueCount: number;
    connectionStatus?: 'pending' | 'active' | 'inactive';
    connectedAt?: string | null;
}

/**
 * Get restaurants with their profile data and stats
 * Uses restaurant_supplier_connections table for proper connection tracking
 */
export function useSupplierRestaurantsWithProfiles() {
    const { user } = useAuth();
    const supabase = useAuthenticatedSupabase();
    const supplierId = user?.businessId || '';

    return useQuery({
        queryKey: ['supplier-restaurants-profiles', supplierId],
        queryFn: async () => {
            if (!supplierId) return [];

            // First get ACTIVE connections from restaurant_supplier_connections table
            const { data: connections, error: connectionsError } = await supabase
                .from('restaurant_supplier_connections')
                .select('restaurant_id, status, created_at')
                .eq('supplier_id', supplierId)
                .eq('status', 'active');

            if (connectionsError) {
                throw connectionsError;
            }

            if (!connections || connections.length === 0) {
                return [];
            }

            // Get connected restaurant IDs
            const restaurantIds = connections.map(c => c.restaurant_id);

            // Fetch restaurant profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('restaurants')
                .select('*')
                .in('id', restaurantIds);

            if (profilesError) {
                throw profilesError;
            }

            // Create a map of profiles and connection status
            const connectionMap = new Map(connections.map(c => [c.restaurant_id, c]));

            // Fetch deliveries for these restaurants from this supplier
            const { data: deliveries } = await supabase
                .from('deliveries')
                .select('user_id, total_value, missing_value, delivery_date, status')
                .eq('supplier_id', supplierId)
                .in('user_id', restaurantIds);

            // Aggregate delivery data by restaurant
            const deliveryMap = new Map<string, {
                totalDeliveries: number;
                totalValue: number;
                totalMissing: number;
                lastDeliveryDate: string | null;
                issueCount: number;
            }>();

            (deliveries || []).forEach((delivery) => {
                const existing = deliveryMap.get(delivery.user_id);
                const hasIssue = Number(delivery.missing_value) > 0 || delivery.status === 'pending_redelivery';

                if (existing) {
                    existing.totalDeliveries += 1;
                    existing.totalValue += Number(delivery.total_value) || 0;
                    existing.totalMissing += Number(delivery.missing_value) || 0;
                    existing.issueCount += hasIssue ? 1 : 0;
                    if (delivery.delivery_date > (existing.lastDeliveryDate || '')) {
                        existing.lastDeliveryDate = delivery.delivery_date;
                    }
                } else {
                    deliveryMap.set(delivery.user_id, {
                        totalDeliveries: 1,
                        totalValue: Number(delivery.total_value) || 0,
                        totalMissing: Number(delivery.missing_value) || 0,
                        lastDeliveryDate: delivery.delivery_date,
                        issueCount: hasIssue ? 1 : 0,
                    });
                }
            });

            // Build final array with profiles
            const result: ConnectedRestaurantWithProfile[] = (profiles || []).map(profile => {
                const connection = connectionMap.get(profile.id);
                const stats = deliveryMap.get(profile.id) || {
                    totalDeliveries: 0,
                    totalValue: 0,
                    totalMissing: 0,
                    lastDeliveryDate: null,
                    issueCount: 0,
                };

                return {
                    restaurantId: profile.id,
                    connectionStatus: connection?.status || 'pending',
                    connectedAt: connection?.created_at || null,
                    totalDeliveries: stats.totalDeliveries,
                    totalValue: stats.totalValue,
                    lastDeliveryDate: stats.lastDeliveryDate,
                    profile: profile as RestaurantProfile,
                    discrepancyRate: stats.totalDeliveries > 0
                        ? (stats.issueCount / stats.totalDeliveries) * 100
                        : 0,
                    issueCount: stats.issueCount,
                };
            });

            return result;
        },
    });
}

/**
 * Hook for managing incoming connection requests (for suppliers)
 */
export function useConnectionRequests() {
    const { user } = useAuth();
    const supabase = useAuthenticatedSupabase();
    const queryClient = useQueryClient();
    const supplierId = user?.businessId || '';

    // Fetch pending connection requests
    const pendingRequestsQuery = useQuery({
        queryKey: ['connection-requests', supplierId],
        queryFn: async () => {
            if (!supplierId) return [];

            const { data, error } = await supabase
                .from('restaurant_supplier_connections')
                .select(`
                    id,
                    restaurant_id,
                    supplier_id,
                    status,
                    created_at
                `)
                .eq('supplier_id', supplierId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch restaurant profiles for these requests
            if (!data || data.length === 0) return [];

            const restaurantIds = data.map(d => d.restaurant_id);
            const { data: profiles } = await supabase
                .from('restaurants')
                .select('*')
                .in('id', restaurantIds);

            const profileMap = new Map((profiles || []).map(p => [p.id, p]));

            return data.map(request => ({
                ...request,
                restaurant: profileMap.get(request.restaurant_id) || null,
            }));
        },
        enabled: !!supplierId,
    });

    // Accept connection request
    const acceptMutation = useMutation({
        mutationFn: async (connectionId: string) => {
            const { data, error } = await supabase
                .from('restaurant_supplier_connections')
                .update({
                    status: 'active',
                    last_action_by: user?.id
                })
                .eq('id', connectionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
            queryClient.invalidateQueries({ queryKey: ['supplier-restaurants-profiles'] });
        },
    });

    // Decline connection request
    const declineMutation = useMutation({
        mutationFn: async (connectionId: string) => {
            const { error } = await supabase
                .from('restaurant_supplier_connections')
                .delete()
                .eq('id', connectionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
        },
    });

    return {
        pendingRequests: pendingRequestsQuery.data || [],
        isLoading: pendingRequestsQuery.isLoading,
        error: pendingRequestsQuery.error,
        acceptRequest: acceptMutation.mutateAsync,
        isAccepting: acceptMutation.isPending,
        declineRequest: declineMutation.mutateAsync,
        isDeclining: declineMutation.isPending,
        refetch: pendingRequestsQuery.refetch,
    };
}
