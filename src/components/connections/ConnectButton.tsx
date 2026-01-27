import { useState } from 'react';
import { Loader2, UserPlus, Clock, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectionRequests, EntityType } from '@/hooks/useConnectionRequests';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ConnectButtonProps {
  entityId: string;
  entityType: EntityType;
  entityName?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline';
}

export function ConnectButton({
  entityId,
  entityType,
  entityName,
  className,
  size = 'default',
  variant = 'default',
}: ConnectButtonProps) {
  const { sendConnectionRequest, sendingRequest, getConnectionStatus } = useConnectionRequests();
  const { toast } = useToast();
  const [localSending, setLocalSending] = useState(false);

  const status = getConnectionStatus(entityId);

  const handleConnect = async () => {
    setLocalSending(true);
    const result = await sendConnectionRequest(entityId, entityType);
    setLocalSending(false);

    if (result.success) {
      toast({
        title: 'Request Sent',
        description: `Connection request sent to ${entityName || entityType}.`,
      });
    } else {
      toast({
        title: 'Could not send request',
        description: result.error || 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = sendingRequest || localSending;

  // Connected state
  if (status === 'connected') {
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        className={cn(
          'border-[#009EE0]/30 text-[#009EE0] bg-[#009EE0]/5 cursor-default',
          className
        )}
      >
        <Link2 className="w-4 h-4" />
        Connected
      </Button>
    );
  }

  // Pending state
  if (status === 'pending') {
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        className={cn(
          'border-[#009EE0]/30 text-[#009EE0]/70 bg-[#009EE0]/5 cursor-default',
          className
        )}
      >
        <Clock className="w-4 h-4" />
        Pending...
      </Button>
    );
  }

  // Default connect state
  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleConnect}
      disabled={isLoading}
      className={cn(
        variant === 'default'
          ? 'bg-[#009EE0] hover:bg-[#0080B8] text-white'
          : 'border-[#009EE0] text-[#009EE0] hover:bg-[#009EE0]/10',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Connect
        </>
      )}
    </Button>
  );
}
