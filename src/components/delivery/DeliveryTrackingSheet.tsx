import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { LiveDeliveryMap } from './LiveDeliveryMap';
import { TrackingStatusBadge, getTrackingStatus } from './TrackingStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDeliveryLocation } from '@/hooks/useDeliveryLocation';
import { Building2, Package, Calendar, User, Phone, Truck } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface DeliveryTrackingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  restaurantName?: string;
  restaurantLocation?: { lat: number; lng: number };
  deliveryDate?: string;
  orderNumber?: string;
  itemsCount?: number;
}

export function DeliveryTrackingSheet({
  open,
  onOpenChange,
  deliveryId,
  restaurantName,
  restaurantLocation,
  deliveryDate,
  orderNumber,
  itemsCount,
}: DeliveryTrackingSheetProps) {
  const { trackingInfo, isLoading, distanceRemaining, estimatedArrival } = useDeliveryLocation({
    deliveryId,
    enabled: open,
  });

  const trackingStatus = getTrackingStatus(
    trackingInfo?.tracking_started_at,
    trackingInfo?.tracking_ended_at,
    distanceRemaining
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#009EE0]" />
              Delivery Tracking
            </SheetTitle>
            <TrackingStatusBadge status={trackingStatus} eta={estimatedArrival || undefined} />
          </div>
          <SheetDescription>
            Real-time tracking for order {orderNumber || 'N/A'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Delivery Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Restaurant</p>
                <p className="text-sm font-medium">{restaurantName || 'Unknown'}</p>
              </div>
            </div>
            {deliveryDate && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{format(new Date(deliveryDate), 'MMM d, yyyy')}</p>
                </div>
              </div>
            )}
            {itemsCount !== undefined && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="text-sm font-medium">{itemsCount} items</p>
                </div>
              </div>
            )}
            {estimatedArrival && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#009EE0]/10">
                <Truck className="w-4 h-4 text-[#009EE0]" />
                <div>
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="text-sm font-medium text-[#009EE0]">
                    {format(estimatedArrival, 'HH:mm')} ({formatDistanceToNow(estimatedArrival)})
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Driver Info */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : trackingInfo?.driver ? (
            <div>
              <h4 className="text-sm font-medium mb-3">Driver</h4>
              <div className="flex items-center gap-4 p-4 rounded-lg border">
                <div className="w-12 h-12 rounded-full bg-[#009EE0]/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-[#009EE0]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{trackingInfo.driver.name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    {trackingInfo.driver.vehicle_type && (
                      <Badge variant="secondary" className="capitalize">
                        {trackingInfo.driver.vehicle_type}
                      </Badge>
                    )}
                    {trackingInfo.driver.vehicle_plate && (
                      <span>{trackingInfo.driver.vehicle_plate}</span>
                    )}
                  </div>
                </div>
                {trackingInfo.driver.phone && (
                  <a
                    href={`tel:${trackingInfo.driver.phone}`}
                    className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          ) : null}

          {/* Live Map */}
          <LiveDeliveryMap
            deliveryId={deliveryId}
            restaurantLocation={restaurantLocation}
            restaurantName={restaurantName}
            driverName={trackingInfo?.driver?.name}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
