import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'rejected';
export type EntityType = 'restaurant' | 'supplier';

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  sender_type: EntityType;
  receiver_id: string;
  receiver_type: EntityType;
  status: ConnectionRequestStatus;
  created_at: string;
  // Joined data
  sender_name?: string;
  receiver_name?: string;
}

interface UseConnectionRequestsReturn {
  // Sending requests
  sendConnectionRequest: (receiverId: string, receiverType: EntityType) => Promise<{ success: boolean; error?: string }>;
  sendingRequest: boolean;

  // Fetching requests
  incomingRequests: ConnectionRequest[];
  outgoingRequests: ConnectionRequest[];
  loadingRequests: boolean;

  // Updating requests
  acceptRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  rejectRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  updatingRequest: boolean;

  // Utilities
  getConnectionStatus: (entityId: string) => 'none' | 'pending' | 'connected';
  refetchRequests: () => Promise<void>;
  pendingCount: number;
}

export function useConnectionRequests(): UseConnectionRequestsReturn {
  const { user } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [updatingRequest, setUpdatingRequest] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoadingRequests(true);

      // Fetch incoming requests (where user is receiver)
      const { data: incoming, error: incomingError } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (incomingError) throw incomingError;

      // Fetch outgoing requests (where user is sender)
      const { data: outgoing, error: outgoingError } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (outgoingError) throw outgoingError;

      // Enrich with sender/receiver names
      const enrichedIncoming = await enrichRequestsWithNames(incoming || [], 'sender');
      const enrichedOutgoing = await enrichRequestsWithNames(outgoing || [], 'receiver');

      setIncomingRequests(enrichedIncoming);
      setOutgoingRequests(enrichedOutgoing);
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  }, [user?.id]);

  // Enrich requests with names from restaurants/suppliers tables
  async function enrichRequestsWithNames(
    requests: ConnectionRequest[],
    enrichField: 'sender' | 'receiver'
  ): Promise<ConnectionRequest[]> {
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const entityId = enrichField === 'sender' ? request.sender_id : request.receiver_id;
        const entityType = enrichField === 'sender' ? request.sender_type : request.receiver_type;
        const tableName = entityType === 'restaurant' ? 'restaurants' : 'suppliers';

        try {
          const { data } = await supabase
            .from(tableName)
            .select('name')
            .eq('id', entityId)
            .single();

          return {
            ...request,
            [enrichField === 'sender' ? 'sender_name' : 'receiver_name']: data?.name || `Unknown ${entityType}`,
          };
        } catch {
          return {
            ...request,
            [enrichField === 'sender' ? 'sender_name' : 'receiver_name']: `Unknown ${entityType}`,
          };
        }
      })
    );
    return enriched;
  }

  // Send a connection request
  const sendConnectionRequest = async (
    receiverId: string,
    receiverType: EntityType
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id || !user?.role) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setSendingRequest(true);

      // Check for existing pending request
      const { data: existing, error: checkError } = await supabase
        .from('connection_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .in('status', ['pending', 'accepted']);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        const existingRequest = existing[0];
        if (existingRequest.status === 'accepted') {
          return { success: false, error: 'Already connected' };
        }
        return { success: false, error: 'Request already pending' };
      }

      // Create new request
      const { error: insertError } = await supabase
        .from('connection_requests')
        .insert({
          sender_id: user.id,
          sender_type: user.role,
          receiver_id: receiverId,
          receiver_type: receiverType,
          status: 'pending',
        });

      if (insertError) throw insertError;

      await fetchRequests();
      return { success: true };
    } catch (error) {
      console.error('Error sending connection request:', error);
      return { success: false, error: 'Failed to send request' };
    } finally {
      setSendingRequest(false);
    }
  };

  // Accept a connection request
  const acceptRequest = async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setUpdatingRequest(true);

      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      await fetchRequests();
      return { success: true };
    } catch (error) {
      console.error('Error accepting request:', error);
      return { success: false, error: 'Failed to accept request' };
    } finally {
      setUpdatingRequest(false);
    }
  };

  // Reject a connection request
  const rejectRequest = async (requestId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setUpdatingRequest(true);

      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      await fetchRequests();
      return { success: true };
    } catch (error) {
      console.error('Error rejecting request:', error);
      return { success: false, error: 'Failed to reject request' };
    } finally {
      setUpdatingRequest(false);
    }
  };

  // Get connection status with a specific entity
  const getConnectionStatus = useCallback(
    (entityId: string): 'none' | 'pending' | 'connected' => {
      // Check outgoing requests
      const outgoing = outgoingRequests.find((r) => r.receiver_id === entityId);
      if (outgoing) {
        if (outgoing.status === 'accepted') return 'connected';
        if (outgoing.status === 'pending') return 'pending';
      }

      // Check incoming requests
      const incoming = incomingRequests.find((r) => r.sender_id === entityId);
      if (incoming) {
        if (incoming.status === 'accepted') return 'connected';
        if (incoming.status === 'pending') return 'pending';
      }

      return 'none';
    },
    [outgoingRequests, incomingRequests]
  );

  // Count pending incoming requests
  const pendingCount = incomingRequests.filter((r) => r.status === 'pending').length;

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('connection_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchRequests]);

  return {
    sendConnectionRequest,
    sendingRequest,
    incomingRequests,
    outgoingRequests,
    loadingRequests,
    acceptRequest,
    rejectRequest,
    updatingRequest,
    getConnectionStatus,
    refetchRequests: fetchRequests,
    pendingCount,
  };
}
