import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';

// Types for missing items reports
export interface MissingItemsReportItem {
  id: string;
  report_id: string;
  item_name: string;
  expected_quantity: number;
  received_quantity: number;
  missing_quantity: number;
  unit: string | null;
  price_per_unit: number;
  total_missing_value: number;
  created_at?: string;
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

export interface MissingItemsReportWithItems extends MissingItemsReport {
  items: MissingItemsReportItem[];
  supplier?: {
    id: string;
    name: string;
    contact_email: string | null;
  };
}

export interface CreateReportInput {
  deliveryId: string;
  supplierId: string;
  missingItems: {
    item_name: string;
    expected_quantity: number;
    received_quantity: number;
    missing_quantity: number;
    unit: string | null;
    price_per_unit: number;
  }[];
}

/**
 * Hook for managing missing items reports
 */
export function useMissingItemsReport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = useAuthenticatedSupabase();

  /**
   * Create a new missing items report with its items
   */
  const createReportMutation = useMutation({
    mutationFn: async (input: CreateReportInput) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Calculate totals
      const totalMissingValue = input.missingItems.reduce(
        (sum, item) => sum + (item.missing_quantity * item.price_per_unit),
        0
      );
      const itemsCount = input.missingItems.length;

      // Create the report
      const { data: report, error: reportError } = await supabase
        .from('missing_items_reports')
        .insert({
          delivery_id: input.deliveryId,
          restaurant_id: user.businessId,
          supplier_id: input.supplierId,
          status: 'pending',
          total_missing_value: totalMissingValue,
          items_count: itemsCount,
          last_action_by: user.id
        })
        .select()
        .single();

      if (reportError) {
        console.error('Error creating report:', reportError);
        throw reportError;
      }

      // Create the report items
      const reportItems = input.missingItems.map((item) => ({
        report_id: report.id,
        item_name: item.item_name,
        expected_quantity: item.expected_quantity,
        received_quantity: item.received_quantity,
        missing_quantity: item.missing_quantity,
        unit: item.unit,
        price_per_unit: item.price_per_unit,
        total_missing_value: item.missing_quantity * item.price_per_unit,
      }));

      const { error: itemsError } = await supabase
        .from('missing_items_report_items')
        .insert(reportItems);

      if (itemsError) {
        console.error('Error creating report items:', itemsError);
        // Try to clean up the report if items failed
        await supabase.from('missing_items_reports').delete().eq('id', report.id);
        throw itemsError;
      }

      return {
        report: report as MissingItemsReport,
        itemsCount,
        totalMissingValue,
      };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['missing-items-reports'] });
    },
  });

  /**
   * Get all reports sent by the current restaurant
   */
  const getReportsByRestaurantQuery = useQuery({
    queryKey: ['missing-items-reports', 'restaurant', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('missing_items_reports')
        .select(`
          *,
          supplier:suppliers (
            id,
            name,
            contact_email
          )
        `)
        .eq('restaurant_id', user.businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        throw error;
      }

      return data as (MissingItemsReport & { supplier: { id: string; name: string; contact_email: string | null } | null })[];
    },
    enabled: !!user?.id,
  });

  /**
   * Get a single report with all its items
   */
  const useReportDetails = (reportId: string | undefined) => {
    return useQuery({
      queryKey: ['missing-items-reports', 'detail', reportId],
      queryFn: async () => {
        if (!reportId) return null;

        // Fetch the report
        const { data: report, error: reportError } = await supabase
          .from('missing_items_reports')
          .select(`
            *,
            supplier:suppliers (
              id,
              name,
              contact_email
            )
          `)
          .eq('id', reportId)
          .single();

        if (reportError) {
          console.error('Error fetching report:', reportError);
          throw reportError;
        }

        // Fetch the items
        const { data: items, error: itemsError } = await supabase
          .from('missing_items_report_items')
          .select('*')
          .eq('report_id', reportId)
          .order('created_at', { ascending: true });

        if (itemsError) {
          console.error('Error fetching report items:', itemsError);
          throw itemsError;
        }

        return {
          ...report,
          items: items as MissingItemsReportItem[],
        } as MissingItemsReportWithItems;
      },
      enabled: !!reportId,
    });
  };

  /**
   * Get reports for a specific delivery
   */
  const useReportsByDelivery = (deliveryId: string | undefined) => {
    return useQuery({
      queryKey: ['missing-items-reports', 'delivery', deliveryId],
      queryFn: async () => {
        if (!deliveryId) return [];

        const { data, error } = await supabase
          .from('missing_items_reports')
          .select(`
            *,
            supplier:suppliers (
              id,
              name,
              contact_email
            )
          `)
          .eq('delivery_id', deliveryId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching reports for delivery:', error);
          throw error;
        }

        return data as (MissingItemsReport & { supplier: { id: string; name: string; contact_email: string | null } | null })[];
      },
      enabled: !!deliveryId,
    });
  };

  return {
    // Mutations
    createReport: createReportMutation.mutateAsync,
    isCreatingReport: createReportMutation.isPending,
    createReportError: createReportMutation.error,

    // Queries
    reports: getReportsByRestaurantQuery.data || [],
    isLoadingReports: getReportsByRestaurantQuery.isLoading,
    reportsError: getReportsByRestaurantQuery.error,
    refetchReports: getReportsByRestaurantQuery.refetch,

    // Hooks for specific data
    useReportDetails,
    useReportsByDelivery,
  };
}

/**
 * Hook for suppliers to view and manage incoming reports
 */
export function useSupplierMissingItemsReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = useAuthenticatedSupabase();

  /**
   * Get all reports received by the current supplier
   */
  const getReportsQuery = useQuery({
    queryKey: ['missing-items-reports', 'supplier', user?.id],
    queryFn: async () => {
      if (!user?.businessId) return [];

      const { data, error } = await supabase
        .from('missing_items_reports')
        .select(`
          *,
          restaurant:restaurants (
            id,
            name,
            contact_email
          )
        `)
        .eq('supplier_id', user.businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching supplier reports:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  /**
   * Acknowledge a report
   */
  const acknowledgeMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase
        .from('missing_items_reports')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          last_action_by: user?.id
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missing-items-reports'] });
    },
  });

  /**
   * Resolve a report
   */
  const resolveMutation = useMutation({
    mutationFn: async ({ reportId, notes }: { reportId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('missing_items_reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          notes: notes || null,
          last_action_by: user?.id
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missing-items-reports'] });
    },
  });

  return {
    reports: getReportsQuery.data || [],
    isLoading: getReportsQuery.isLoading,
    error: getReportsQuery.error,
    refetch: getReportsQuery.refetch,

    acknowledge: acknowledgeMutation.mutateAsync,
    isAcknowledging: acknowledgeMutation.isPending,

    resolve: resolveMutation.mutateAsync,
    isResolving: resolveMutation.isPending,
  };
}
