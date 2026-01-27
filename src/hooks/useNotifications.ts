import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedSupabase } from './useAuthenticatedSupabase';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationType =
    | 'missing_items_report'
    | 'outgoing_delivery_created'
    | 'outgoing_delivery_arrived'
    | 'delivery_confirmed'
    | 'delivery_disputed'
    | 'connection_request'
    | 'connection_accepted';

export interface Notification {
    id: string;
    created_at: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string | null;
    link_type: string | null;
    link_id: string | null;
    read: boolean;
    read_at: string | null;
    metadata: Record<string, unknown> | null;
}

export function useNotifications() {
    const supabase = useAuthenticatedSupabase();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) {
                setError(fetchError.message);
                setNotifications([]);
            } else {
                setNotifications(data || []);
                setError(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [supabase, user?.id]);

    // Initial fetch and real-time subscription
    useEffect(() => {
        fetchNotifications();

        if (!user?.id) return;

        const channel = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, user?.id, fetchNotifications]);

    return {
        notifications,
        loading,
        error,
        refetch: fetchNotifications,
    };
}

export function useUnreadNotificationsCount() {
    const { notifications } = useNotifications();
    return notifications.filter((n) => !n.read).length;
}

export function useMarkNotificationAsRead() {
    const supabase = useAuthenticatedSupabase();
    const [loading, setLoading] = useState(false);

    const markAsRead = useCallback(
        async (notificationId: string) => {
            setLoading(true);
            try {
                const { error } = await supabase
                    .from('notifications')
                    .update({ read: true, read_at: new Date().toISOString() })
                    .eq('id', notificationId);

                if (error) {
                    return { success: false, error: error.message };
                }
                return { success: true };
            } catch (err) {
                return {
                    success: false,
                    error: err instanceof Error ? err.message : 'Failed to mark as read',
                };
            } finally {
                setLoading(false);
            }
        },
        [supabase]
    );

    return { markAsRead, loading };
}

export function useMarkAllNotificationsAsRead() {
    const supabase = useAuthenticatedSupabase();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const markAllAsRead = useCallback(async () => {
        if (!user?.id) {
            return { success: false, error: 'User not authenticated' };
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('read', false);

            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Failed to mark all as read',
            };
        } finally {
            setLoading(false);
        }
    }, [supabase, user?.id]);

    return { markAllAsRead, loading };
}

export interface CreateNotificationParams {
    user_id: string;
    type: NotificationType;
    title: string;
    message?: string;
    link_type?: string;
    link_id?: string;
    metadata?: Record<string, unknown>;
}

export function useCreateNotification() {
    const supabase = useAuthenticatedSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: CreateNotificationParams) => {
            // Don't use .select() after insert because RLS prevents reading
            // notifications created for other users (intended behavior)
            const { error } = await supabase
                .from('notifications')
                .insert({
                    user_id: params.user_id,
                    type: params.type,
                    title: params.title,
                    message: params.message || null,
                    link_type: params.link_type || null,
                    link_id: params.link_id || null,
                    metadata: params.metadata || null,
                    read: false,
                });

            if (error) throw error;
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
