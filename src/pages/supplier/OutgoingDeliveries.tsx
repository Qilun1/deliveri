import { useState, useMemo } from 'react';
import {
    Truck,
    Search,
    Filter,
    Clock,
    CheckCircle,
    Loader2,
    Building2,
    AlertTriangle
} from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSupplierDeliveriesByStatus, useSupplierRestaurantsWithProfiles, Delivery } from '@/hooks/useSupplierData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function OutgoingDeliveries() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Get active deliveries (complete and pending_redelivery)
    const { data: deliveries, isLoading, error } = useSupplierDeliveriesByStatus(['complete', 'pending_redelivery', 'resolved']);
    const { data: restaurants } = useSupplierRestaurantsWithProfiles();

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

        // Sort by delivery date (newest first)
        result.sort((a, b) =>
            new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()
        );

        return result;
    }, [deliveries, searchQuery, statusFilter, restaurantMap]);

    const getStatusIcon = (status: Delivery['status']) => {
        switch (status) {
            case 'complete':
            case 'resolved':
                return <CheckCircle className="w-5 h-5 text-[#009EE0]" />;
            case 'pending_redelivery':
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-amber-500" />;
        }
    };

    const getStatusLabel = (status: Delivery['status']) => {
        switch (status) {
            case 'complete':
                return 'Delivered';
            case 'resolved':
                return 'Resolved';
            case 'pending_redelivery':
                return 'Issue Reported';
            default:
                return 'Processing';
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
                    <h1 className="text-3xl font-bold text-foreground mb-2">Outgoing Deliveries</h1>
                    <p className="text-muted-foreground">Operational view of all completed deliveries, sorted by date</p>
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
                            <SelectItem value="all">All Deliveries</SelectItem>
                            <SelectItem value="complete">Delivered</SelectItem>
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
                            const restaurantName = restaurantMap.get(delivery.user_id) || `Restaurant ${delivery.user_id.slice(0, 8)}`;

                            return (
                                <Card key={delivery.id} className="overflow-hidden shadow-sm">
                                    <CardContent className="p-6">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg text-foreground mb-1">
                                                    {delivery.order_number || 'No order number'}
                                                </h3>
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
                                                            <span className="text-red-600">-{Number(delivery.missing_value).toFixed(2)} missing</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "px-3 py-1",
                                                    (delivery.status === 'complete' || delivery.status === 'resolved') && "bg-[#009EE0]/10 text-[#009EE0] border-[#009EE0]/30",
                                                    delivery.status === 'pending_redelivery' && "bg-red-50 text-red-700 border-red-200"
                                                )}
                                            >
                                                {getStatusLabel(delivery.status)}
                                            </Badge>
                                        </div>

                                        {/* Status Indicator */}
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                            <div className={cn(
                                                "flex items-center justify-center w-10 h-10 rounded-full",
                                                (delivery.status === 'complete' || delivery.status === 'resolved')
                                                    ? "bg-[#009EE0]/10"
                                                    : "bg-red-100"
                                            )}>
                                                {getStatusIcon(delivery.status)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {delivery.status === 'complete' && 'Delivery completed successfully'}
                                                    {delivery.status === 'resolved' && 'Issue has been resolved'}
                                                    {delivery.status === 'pending_redelivery' && 'Issue reported - awaiting resolution'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Delivered on {format(new Date(delivery.delivery_date), 'MMMM d, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="shadow-sm">
                        <CardContent className="py-12 text-center">
                            <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No deliveries found</h3>
                            <p className="text-muted-foreground">
                                {searchQuery || statusFilter !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'Completed deliveries will appear here'}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainContent>
    );
}
