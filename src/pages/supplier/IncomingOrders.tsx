import { useState, useMemo } from 'react';
import {
    ShoppingCart,
    Search,
    Filter,
    ChevronDown,
    Check,
    Clock,
    Package,
    Loader2,
    Building2
} from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useSupplierDeliveries, useSupplierDeliveryWithItems, useUpdateDeliveryStatus, useSupplierRestaurantsWithProfiles, Delivery } from '@/hooks/useSupplierData';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function IncomingOrders() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedOrders, setExpandedOrders] = useState<string[]>([]);

    const { data: deliveries, isLoading, error } = useSupplierDeliveries();
    const { data: restaurants } = useSupplierRestaurantsWithProfiles();
    const updateStatus = useUpdateDeliveryStatus();

    // Create a map of restaurant profiles for quick lookup
    const restaurantMap = useMemo(() => {
        const map = new Map<string, string>();
        if (restaurants) {
            restaurants.forEach(r => {
                map.set(r.restaurantId, r.profile?.name || `Restaurant ${r.restaurantId.slice(0, 8)}`);
            });
        }
        return map;
    }, [restaurants]);

    const filteredDeliveries = useMemo(() => {
        if (!deliveries) return [];

        let result = [...deliveries];

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (d) =>
                    (d.order_number?.toLowerCase() || '').includes(query) ||
                    d.user_id.toLowerCase().includes(query) ||
                    restaurantMap.get(d.user_id)?.toLowerCase().includes(query)
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter((d) => d.status === statusFilter);
        }

        // Sort by date (newest first)
        result.sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());

        return result;
    }, [deliveries, searchQuery, statusFilter, restaurantMap]);

    const toggleOrder = (orderId: string) => {
        setExpandedOrders((prev) =>
            prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
        );
    };

    const getStatusBadge = (status: Delivery['status']) => {
        switch (status) {
            case 'draft':
                return (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                        <Clock className="w-3 h-3 mr-1" />
                        Draft
                    </Badge>
                );
            case 'complete':
                return (
                    <Badge variant="secondary" className="bg-[#009EE0]/10 text-[#009EE0] hover:bg-[#009EE0]/10">
                        <Check className="w-3 h-3 mr-1" />
                        Complete
                    </Badge>
                );
            case 'pending_redelivery':
                return (
                    <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">
                        <Package className="w-3 h-3 mr-1" />
                        Issue Reported
                    </Badge>
                );
            case 'resolved':
                return (
                    <Badge variant="secondary" className="bg-[#009EE0]/10 text-[#009EE0] hover:bg-[#009EE0]/10">
                        <Check className="w-3 h-3 mr-1" />
                        Resolved
                    </Badge>
                );
        }
    };

    const handleResolve = async (deliveryId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await updateStatus.mutateAsync({ deliveryId, status: 'resolved' });
            toast.success('Delivery marked as resolved');
        } catch {
            toast.error('Failed to update status');
        }
    };

    if (error) {
        return (
            <MainContent>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-destructive">Error loading deliveries</p>
                    </div>
                </div>
            </MainContent>
        );
    }

    return (
        <MainContent>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        Incoming Orders
                    </h1>
                    <p className="text-muted-foreground">
                        All orders from all restaurants, sorted by date
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by order number or restaurant..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Orders</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="pending_redelivery">Issue Reported</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredDeliveries.length > 0 ? (
                    <div className="space-y-4">
                        {filteredDeliveries.map((delivery) => {
                            const isExpanded = expandedOrders.includes(delivery.id);
                            const restaurantName = restaurantMap.get(delivery.user_id) || `Restaurant ${delivery.user_id.slice(0, 8)}`;

                            return (
                                <Collapsible key={delivery.id} open={isExpanded} onOpenChange={() => toggleOrder(delivery.id)}>
                                    <Card className="overflow-hidden shadow-sm">
                                        <CollapsibleTrigger asChild>
                                            <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "transition-transform duration-200",
                                                            isExpanded && "rotate-180"
                                                        )}>
                                                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className="font-semibold text-foreground">
                                                                    {delivery.order_number || 'No order number'}
                                                                </span>
                                                                {getStatusBadge(delivery.status)}
                                                            </div>
                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Building2 className="w-3 h-3" />
                                                                    {restaurantName}
                                                                </span>
                                                                <span>|</span>
                                                                <span>{format(new Date(delivery.delivery_date), 'MMM d, yyyy')}</span>
                                                                <span>|</span>
                                                                <span className="font-medium">{Number(delivery.total_value || 0).toFixed(2)}</span>
                                                                {Number(delivery.missing_value || 0) > 0 && (
                                                                    <>
                                                                        <span>|</span>
                                                                        <span className="text-red-600">
                                                                            -{Number(delivery.missing_value).toFixed(2)} missing
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right hidden sm:block">
                                                            <p className="text-sm text-muted-foreground">
                                                                {formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                        {delivery.status === 'pending_redelivery' && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-[#009EE0] hover:bg-[#009EE0]/90"
                                                                onClick={(e) => handleResolve(delivery.id, e)}
                                                                disabled={updateStatus.isPending}
                                                            >
                                                                {updateStatus.isPending ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Check className="w-4 h-4 mr-1" />
                                                                        Resolve
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <OrderDetails deliveryId={delivery.id} />
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="shadow-sm">
                        <CardContent className="py-12">
                            <div className="text-center">
                                <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                    No orders found
                                </h3>
                                <p className="text-muted-foreground">
                                    {searchQuery || statusFilter !== 'all'
                                        ? 'Try adjusting your filters'
                                        : 'Orders from restaurants will appear here'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainContent>
    );
}

// Separate component for order details to enable lazy loading
function OrderDetails({ deliveryId }: { deliveryId: string }) {
    const { data, isLoading } = useSupplierDeliveryWithItems(deliveryId);

    if (isLoading) {
        return (
            <CardContent className="pt-0 pb-4 border-t border-border">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </CardContent>
        );
    }

    if (!data || !data.items || data.items.length === 0) {
        return (
            <CardContent className="pt-0 pb-4 border-t border-border">
                <div className="mt-4 text-center py-4 text-muted-foreground">
                    No items found for this delivery
                </div>
            </CardContent>
        );
    }

    const totalValue = data.items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

    return (
        <CardContent className="pt-0 pb-4 border-t border-border">
            <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-3">Order Items</h4>
                <div className="bg-muted/30 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Product</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Qty</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unit Price</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item) => (
                                <tr key={item.id} className="border-b border-border last:border-0">
                                    <td className="py-2 px-3 text-foreground">{item.name}</td>
                                    <td className="py-2 px-3 text-right text-muted-foreground">
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td className="py-2 px-3 text-right text-muted-foreground">
                                        {Number(item.price_per_unit).toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-medium text-foreground">
                                        {Number(item.total_price).toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                item.status === 'received' && "bg-[#009EE0]/10 text-[#009EE0]",
                                                item.status === 'missing' && "bg-red-100 text-red-700",
                                                item.status === 'pending' && "bg-amber-100 text-amber-700"
                                            )}
                                        >
                                            {item.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-muted/50">
                                <td colSpan={3} className="py-2 px-3 text-right font-medium text-foreground">
                                    Order Total
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-foreground">
                                    {totalValue.toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </CardContent>
    );
}
