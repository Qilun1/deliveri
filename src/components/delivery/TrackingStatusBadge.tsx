import { Badge } from '@/components/ui/badge';
import { MapPin, Truck, CheckCircle2, Clock } from 'lucide-react';

interface TrackingStatusBadgeProps {
  status: 'not_started' | 'tracking' | 'arriving_soon' | 'arrived';
  eta?: Date;
}

export function TrackingStatusBadge({ status }: TrackingStatusBadgeProps) {
  switch (status) {
    case 'tracking':
      return (
        <Badge className="bg-[#009EE0] text-white">
          <Truck className="w-3 h-3 mr-1 animate-pulse" />
          In Transit
        </Badge>
      );
    case 'arriving_soon':
      return (
        <Badge className="bg-amber-500 text-white">
          <MapPin className="w-3 h-3 mr-1" />
          Arriving Soon
        </Badge>
      );
    case 'arrived':
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Arrived
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

export function getTrackingStatus(
  trackingStartedAt?: string | null,
  trackingEndedAt?: string | null,
  distanceKm?: number | null
): 'not_started' | 'tracking' | 'arriving_soon' | 'arrived' {
  if (trackingEndedAt) {
    return 'arrived';
  }
  if (!trackingStartedAt) {
    return 'not_started';
  }
  if (distanceKm !== null && distanceKm !== undefined && distanceKm < 0.5) {
    return 'arriving_soon';
  }
  return 'tracking';
}
