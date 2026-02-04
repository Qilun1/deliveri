import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedSupabase } from './useAuthenticatedSupabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Driver } from '@/types/gps-tracking';

export function useSupplierDrivers() {
  const { user } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const supplierId = user?.businessId || '';

  return useQuery({
    queryKey: ['drivers', supplierId],
    queryFn: async (): Promise<Driver[]> => {
      if (!supplierId) return [];

      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!supplierId,
  });
}

export function useCreateDriver() {
  const { user } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (driverData: Omit<Driver, 'id' | 'supplier_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.businessId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('drivers')
        .insert({
          ...driverData,
          supplier_id: user.businessId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useUpdateDriver() {
  const supabase = useAuthenticatedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driverId,
      updates
    }: {
      driverId: string;
      updates: Partial<Driver>;
    }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driverId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useDeleteDriver() {
  const supabase = useAuthenticatedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from('drivers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', driverId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useAssignDriver() {
  const supabase = useAuthenticatedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deliveryId,
      driverId
    }: {
      deliveryId: string;
      driverId: string;
    }) => {
      const { data, error } = await supabase
        .from('outgoing_deliveries')
        .update({
          driver_id: driverId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-deliveries'] });
    },
  });
}

export function useUnassignDriver() {
  const supabase = useAuthenticatedSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const { data, error } = await supabase
        .from('outgoing_deliveries')
        .update({
          driver_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoing-deliveries'] });
    },
  });
}
