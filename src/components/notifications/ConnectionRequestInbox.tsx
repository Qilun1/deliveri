import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Loader2, Building2, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { useConnectionRequests, ConnectionRequest } from '@/hooks/useConnectionRequests';
import { useToast } from '@/hooks/use-toast';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export function ConnectionRequestInbox() {
  const { user } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const {
    incomingRequests,
    loadingRequests,
    acceptRequest,
    rejectRequest,
    updatingRequest,
    pendingCount,
    refetchRequests,
  } = useConnectionRequests();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const prevPendingCountRef = useRef(pendingCount);

  // Filter to only show pending requests
  const pendingRequests = incomingRequests.filter((r) => r.status === 'pending');

  // Show toast when new request arrives
  useEffect(() => {
    if (pendingCount > prevPendingCountRef.current && prevPendingCountRef.current !== 0) {
      toast({
        title: 'New Connection Request',
        description: 'You have a new connection request waiting for review.',
      });
    }
    prevPendingCountRef.current = pendingCount;
  }, [pendingCount, toast]);

  // Set up realtime subscription for new incoming requests
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('new_connection_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            refetchRequests();
            toast({
              title: 'New Connection Request',
              description: 'Someone wants to connect with you!',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchRequests, toast]);

  const handleAccept = async (request: ConnectionRequest) => {
    setProcessingId(request.id);
    const result = await acceptRequest(request.id);
    setProcessingId(null);

    if (result.success) {
      toast({
        title: 'Connection Accepted',
        description: `You are now connected with ${request.sender_name || 'this partner'}.`,
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to accept request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (request: ConnectionRequest) => {
    setProcessingId(request.id);
    const result = await rejectRequest(request.id);
    setProcessingId(null);

    if (result.success) {
      toast({
        title: 'Request Declined',
        description: 'The connection request has been declined.',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to decline request',
        variant: 'destructive',
      });
    }
  };

  const getSenderIcon = (senderType: string) => {
    return senderType === 'restaurant' ? (
      <Building2 className="w-5 h-5 text-[#009EE0]" />
    ) : (
      <Truck className="w-5 h-5 text-[#009EE0]" />
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-5 h-5" />
          {pendingCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-xs bg-[#009EE0] text-white border-0"
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#009EE0]" />
            Connection Requests
          </SheetTitle>
          <SheetDescription>
            Review and respond to partnership requests
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loadingRequests ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#009EE0]" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#009EE0]/10 flex items-center justify-center">
                <Bell className="w-8 h-8 text-[#009EE0]" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No pending requests</h3>
              <p className="text-sm text-muted-foreground">
                When someone sends you a connection request, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#009EE0]/10 flex items-center justify-center flex-shrink-0">
                      {getSenderIcon(request.sender_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground truncate">
                          {request.sender_name || `Unknown ${request.sender_type}`}
                        </h4>
                        <Badge
                          variant="secondary"
                          className="bg-[#009EE0]/10 text-[#009EE0] border-0 text-xs"
                        >
                          {request.sender_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      size="sm"
                      className="flex-1 bg-[#009EE0] hover:bg-[#0080B8] text-white"
                      onClick={() => handleAccept(request)}
                      disabled={updatingRequest || processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-[#009EE0]/30 text-[#009EE0] hover:bg-[#009EE0]/10 hover:text-[#009EE0]"
                      onClick={() => handleReject(request)}
                      disabled={updatingRequest || processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Decline
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show recent accepted/rejected for context */}
          {incomingRequests.filter((r) => r.status !== 'pending').length > 0 && (
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</h4>
              <div className="space-y-2">
                {incomingRequests
                  .filter((r) => r.status !== 'pending')
                  .slice(0, 3)
                  .map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between text-sm py-2"
                    >
                      <div className="flex items-center gap-2">
                        {getSenderIcon(request.sender_type)}
                        <span className="text-foreground truncate">
                          {request.sender_name || `Unknown ${request.sender_type}`}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          request.status === 'accepted'
                            ? 'bg-[#009EE0]/10 text-[#009EE0] border-0'
                            : 'bg-muted text-muted-foreground border-0'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
