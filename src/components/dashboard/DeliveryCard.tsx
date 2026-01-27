import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Delivery } from '@/data/mockData';

interface DeliveryCardProps {
  delivery: Delivery;
  onVerify: (delivery: Delivery) => void;
}

export function DeliveryCard({ delivery, onVerify }: DeliveryCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">
              {delivery.supplierName}
            </span>
            <Badge variant="pending">Pending</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Order #{delivery.orderNumber}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {format(delivery.deliveryDate, 'dd.MM.yyyy')}
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {delivery.items.length} items to verify
      </div>

      <Button
        onClick={() => onVerify(delivery)}
        className="w-full"
      >
        Verify Now
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
