import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { Supplier, SupplierConnection, MissingItemsReport } from '@/types/supplier';

interface UseSupplierConnectionsReturn {
  // Connected suppliers
  connectedSuppliers: SupplierConnection[];
  loadingConnections: boolean;

  // Available suppliers (not yet connected)
  availableSuppliers: Supplier[];
  loadingAvailable: boolean;

  // Missing items reports
  missingReports: MissingItemsReport[];
  loadingReports: boolean;

  // Actions
  createConnection: (supplierId: string) => Promise<{ success: boolean; error?: string }>;
  creatingConnection: boolean;

  // Utilities
  refetch: () => Promise<void>;
  getSupplierReports: (supplierId: string) => MissingItemsReport[];
}

export function useSupplierConnections(): UseSupplierConnectionsReturn {
  const { user } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const [connectedSuppliers, setConnectedSuppliers] = useState<SupplierConnection[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [missingReports, setMissingReports] = useState<MissingItemsReport[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [creatingConnection, setCreatingConnection] = useState(false);

  // Fetch connected suppliers with JOIN on suppliers table
  const fetchConnectedSuppliers = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoadingConnections(true);

      const { data, error } = await supabase
        .from('restaurant_supplier_connections')
        .select(`
          id,
          restaurant_id,
          supplier_id,
          status,
          created_at,
          supplier:suppliers (
            id,
            name,
            contact_email,
            contact_phone,
            address,
            logo_url,
            is_major_tukku,
            priority_order,
            created_at
          )
        `)
        .eq('restaurant_id', user.businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to flatten the supplier object
      const transformedData: SupplierConnection[] = (data || []).map((item: any) => ({
        id: item.id,
        restaurant_id: item.restaurant_id,
        supplier_id: item.supplier_id,
        status: item.status,
        created_at: item.created_at,
        supplier: item.supplier,
      }));

      // Sort: major tukkus first by priority_order, then others
      transformedData.sort((a, b) => {
        const aIsMajor = a.supplier?.is_major_tukku || false;
        const bIsMajor = b.supplier?.is_major_tukku || false;

        if (aIsMajor && !bIsMajor) return -1;
        if (!aIsMajor && bIsMajor) return 1;

        const aPriority = a.supplier?.priority_order ?? 999;
        const bPriority = b.supplier?.priority_order ?? 999;

        return aPriority - bPriority;
      });

      setConnectedSuppliers(transformedData);
    } catch (error) {
      console.error('Error fetching connected suppliers:', error);
    } finally {
      setLoadingConnections(false);
    }
  }, [user?.id]);

  // Fetch available suppliers (not yet connected)
  const fetchAvailableSuppliers = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoadingAvailable(true);

      // First get connected supplier IDs
      const { data: connections, error: connError } = await supabase
        .from('restaurant_supplier_connections')
        .select('supplier_id')
        .eq('restaurant_id', user.businessId);

      if (connError) throw connError;

      const connectedIds = (connections || []).map(c => c.supplier_id);

      // Then fetch all suppliers (no filtering for now to debug)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('is_major_tukku', { ascending: false })
        .order('priority_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (error) throw error;

      // Filter and deduplicate by name (only show one entry per business)
      const available: Supplier[] = [];
      const seenNames = new Set();
      const connectedNames = new Set(connectedSuppliers.map(c => c.supplier?.name));

      for (const s of (data || [])) {
        if (!connectedIds.includes(s.id) && !connectedNames.has(s.name) && !seenNames.has(s.name)) {
          available.push(s);
          seenNames.add(s.name);
        }
      }

      setAvailableSuppliers(available);
    } catch (error) {
      console.error('[SupplierConnections] Error fetching available suppliers:', error);
    } finally {
      setLoadingAvailable(false);
    }
  }, [user?.id]);

  // Fetch missing items reports
  const fetchMissingReports = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingReports(true);

      const { data, error } = await supabase
        .from('missing_items_reports')
        .select('*')
        .eq('restaurant_id', user.businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMissingReports(data || []);
    } catch (error) {
      console.error('Error fetching missing reports:', error);
    } finally {
      setLoadingReports(false);
    }
  }, [user?.id]);

  // Create a new connection
  const createConnection = async (supplierId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setCreatingConnection(true);

      // Check for existing connection
      const { data: existing, error: checkError } = await supabase
        .from('restaurant_supplier_connections')
        .select('id, status')
        .eq('restaurant_id', user.businessId)
        .eq('supplier_id', supplierId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.status === 'active') {
          return { success: false, error: 'Already connected to this supplier' };
        }
        if (existing.status === 'pending') {
          return { success: false, error: 'Connection request already pending' };
        }
        // If inactive, we could reactivate - for now just create new
      }

      // CRITICAL FIX: Ensure restaurant record exists before connecting
      // This prevents the 409 Foreign Key violation if the auto-repair hook missed it.
      if (user.role === 'restaurant') {
        const { error: ensureError } = await supabase
          .from('restaurants')
          .upsert({
            id: user.businessId,
            name: user.companyName || 'My Restaurant',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id', ignoreDuplicates: true });

        if (ensureError) {
          console.error('[SupplierConnections] JIT Restaurant Creation failed:', ensureError);
          // We continue anyway, hoping it exists despite error (e.g. RLS blocking update but allowing select?)
        }
      }

      // Create new connection with pending status
      const { error: insertError } = await supabase
        .from('restaurant_supplier_connections')
        .insert({
          restaurant_id: user.businessId,
          supplier_id: supplierId,
          status: 'pending',
          last_action_by: user.id
        });

      if (insertError) throw insertError;

      // Refetch data
      await Promise.all([fetchConnectedSuppliers(), fetchAvailableSuppliers()]);

      return { success: true };
    } catch (error) {
      console.error('Error creating connection:', error);
      return { success: false, error: 'Failed to create connection' };
    } finally {
      setCreatingConnection(false);
    }
  };

  // Get reports for a specific supplier
  const getSupplierReports = useCallback((supplierId: string): MissingItemsReport[] => {
    return missingReports.filter(report => report.supplier_id === supplierId);
  }, [missingReports]);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchConnectedSuppliers(),
      fetchAvailableSuppliers(),
      fetchMissingReports(),
    ]);
  }, [fetchConnectedSuppliers, fetchAvailableSuppliers, fetchMissingReports]);

  // Initial fetch
  useEffect(() => {
    fetchConnectedSuppliers();
    fetchAvailableSuppliers();
    fetchMissingReports();
  }, [fetchConnectedSuppliers, fetchAvailableSuppliers, fetchMissingReports]);

  // Set up realtime subscription for connection status changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('supplier_connections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_supplier_connections',
          filter: `restaurant_id=eq.${user.businessId}`,
        },
        () => {
          fetchConnectedSuppliers();
          fetchAvailableSuppliers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missing_items_reports',
          filter: `restaurant_id=eq.${user.businessId}`,
        },
        () => {
          fetchMissingReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConnectedSuppliers, fetchAvailableSuppliers, fetchMissingReports]);

  return {
    connectedSuppliers,
    loadingConnections,
    availableSuppliers,
    loadingAvailable,
    missingReports,
    loadingReports,
    createConnection,
    creatingConnection,
    refetch,
    getSupplierReports,
  };
}
