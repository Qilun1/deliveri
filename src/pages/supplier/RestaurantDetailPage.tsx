import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    MapPin,
    Mail,
    Phone,
    Calendar,
    Package,
    AlertTriangle,
    CheckCircle,
    Clock,
    Loader2,
    TrendingUp,
    ShoppingCart
} from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useSupplierRestaurantsWithProfiles,
    useSupplierDeliveries,
    Delivery
} from '@/hooks/useSupplierData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function RestaurantDetailPage() {
    const { restaurantId } = useParams<{ restaurantId: string }>();
    const navigate = useNavigate();

    const { data: restaurants, isLoading: restaurantsLoading } = useSupplierRestaurantsWithProfiles();
    const { data: allDeliveries, isLoading: deliveriesLoading } = useSupplierDeliveries();

    // Find the specific restaurant
    const restaurant = useMemo(() => {
        if (!restaurants || !restaurantId) return null;
        return restaurants.find(r => r.restaurantId === restaurantId) || null;
    }, [restaurants, restaurantId]);

    // Filter deliveries for this restaurant
    const restaurantDeliveries = useMemo(() => {
        if (!allDeliveries || !restaurantId) return [];
        return allDeliveries
            .filter(d => d.user_id === restaurantId || d.restaurant_id === restaurantId)
            .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
    }, [allDeliveries, restaurantId]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalOrders = restaurantDeliveries.length;
        const discrepancyCount = restaurantDeliveries.filter(
            d => Number(d.missing_value) > 0 || d.status === 'pending_redelivery'
        ).length;
        const resolvedCount = restaurantDeliveries.filter(
            d => d.status === 'resolved' || d.status === 'complete'
        ).length;
        const resolutionRate = totalOrders > 0 ? (resolvedCount / totalOrders) * 100 : 0;

        return {
            totalOrders,
            discrepancyCount,
            resolutionRate
        };
    }, [restaurantDeliveries]);

    const isLoading = restaurantsLoading || deliveriesLoading;

    const getStatusBadge = (status: Delivery['status']) => {
        switch (status) {
            case 'draft':
                return (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Clock className="w-3 h-3 mr-1" />
                        Draft
                    </Badge>
                );
            case 'complete':
                return (
                    <Badge variant="secondary" className="bg-[#009EE0]/10 text-[#009EE0]">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                    </Badge>
                );
            case 'pending_redelivery':
                return (
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Issue Reported
                    </Badge>
                );
            case 'resolved':
                return (
                    <Badge variant="secondary" className="bg-[#009EE0]/10 text-[#009EE0]">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolved
                    </Badge>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <MainContent>
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                </div>
            </MainContent>
        );
    }

    if (!restaurant) {
        return (
            <MainContent>
                <div className="max-w-7xl mx-auto">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/supplier/dashboard')}
                        className="mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                                Restaurant not found
                            </h3>
                            <p className="text-muted-foreground">
                                The restaurant you're looking for doesn't exist or you don't have access to it.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </MainContent>
        );
    }

    return (
        <MainContent>
            <div className="max-w-7xl mx-auto">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate('/supplier/dashboard')}
                    className="mb-6 hover:bg-[#009EE0]/10"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>

                {/* Restaurant Header */}
                <Card className="shadow-sm mb-6">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-3 bg-[#009EE0]/10 rounded-lg">
                                        <Building2 className="w-6 h-6 text-[#009EE0]" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-foreground">
                                            {restaurant.profile?.name || `Restaurant ${restaurantId?.slice(0, 8)}`}
                                        </h1>
                                        {restaurant.profile?.city && (
                                            <p className="text-muted-foreground flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {restaurant.profile.address && `${restaurant.profile.address}, `}
                                                {restaurant.profile.city}
                                                {restaurant.profile.postal_code && ` ${restaurant.profile.postal_code}`}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="flex flex-wrap gap-4 mt-4">
                                    {restaurant.profile?.contact_email && (
                                        <a
                                            href={`mailto:${restaurant.profile.contact_email}`}
                                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#009EE0] transition-colors"
                                        >
                                            <Mail className="w-4 h-4" />
                                            {restaurant.profile.contact_email}
                                        </a>
                                    )}
                                    {restaurant.profile?.contact_phone && (
                                        <a
                                            href={`tel:${restaurant.profile.contact_phone}`}
                                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#009EE0] transition-colors"
                                        >
                                            <Phone className="w-4 h-4" />
                                            {restaurant.profile.contact_phone}
                                        </a>
                                    )}
                                    {restaurant.lastDeliveryDate && (
                                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            Last order: {format(new Date(restaurant.lastDeliveryDate), 'MMM d, yyyy')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <Badge
                                variant="secondary"
                                className={cn(
                                    "text-sm px-3 py-1",
                                    restaurant.discrepancyRate < 5
                                        ? "bg-[#009EE0]/10 text-[#009EE0]"
                                        : restaurant.discrepancyRate < 15
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-red-100 text-red-700"
                                )}
                            >
                                {restaurant.discrepancyRate.toFixed(1)}% issue rate
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#009EE0]/10 rounded-lg">
                                    <ShoppingCart className="w-6 h-6 text-[#009EE0]" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                                    <p className="text-sm text-muted-foreground">Total Orders</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-100 rounded-lg">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.discrepancyCount}</p>
                                    <p className="text-sm text-muted-foreground">Discrepancies</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#009EE0]/10 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-[#009EE0]" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{stats.resolutionRate.toFixed(0)}%</p>
                                    <p className="text-sm text-muted-foreground">Resolution Rate</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Orders Section */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-[#009EE0]" />
                            Order History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="all">All Orders</TabsTrigger>
                                <TabsTrigger value="issues">
                                    Issues
                                    {stats.discrepancyCount > 0 && (
                                        <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                                            {stats.discrepancyCount}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="all">
                                {restaurantDeliveries.length > 0 ? (
                                    <div className="space-y-3">
                                        {restaurantDeliveries.map((delivery) => (
                                            <div
                                                key={delivery.id}
                                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                                                onClick={() => navigate(`/supplier/orders`)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-medium text-foreground">
                                                            {delivery.order_number || 'No order #'}
                                                        </span>
                                                        {getStatusBadge(delivery.status)}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span>{format(new Date(delivery.delivery_date), 'MMM d, yyyy')}</span>
                                                        <span>|</span>
                                                        <span className="font-medium">{Number(delivery.total_value || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                {Number(delivery.missing_value || 0) > 0 && (
                                                    <div className="text-right">
                                                        <p className="text-red-600 font-medium">
                                                            -{Number(delivery.missing_value).toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">missing</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-foreground mb-2">
                                            No orders yet
                                        </h3>
                                        <p className="text-muted-foreground">
                                            Orders from this restaurant will appear here
                                        </p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="issues">
                                {restaurantDeliveries.filter(d => Number(d.missing_value) > 0 || d.status === 'pending_redelivery').length > 0 ? (
                                    <div className="space-y-3">
                                        {restaurantDeliveries
                                            .filter(d => Number(d.missing_value) > 0 || d.status === 'pending_redelivery')
                                            .map((delivery) => (
                                                <div
                                                    key={delivery.id}
                                                    className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 cursor-pointer transition-colors"
                                                    onClick={() => navigate(`/supplier/issues`)}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="font-medium text-foreground">
                                                                {delivery.order_number || 'No order #'}
                                                            </span>
                                                            {getStatusBadge(delivery.status)}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                            <span>{format(new Date(delivery.delivery_date), 'MMM d, yyyy')}</span>
                                                            <span>|</span>
                                                            <span className="font-medium">{Number(delivery.total_value || 0).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-red-600 font-medium">
                                                            -{Number(delivery.missing_value || 0).toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">missing</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <CheckCircle className="w-16 h-16 text-[#009EE0] mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-foreground mb-2">
                                            No issues
                                        </h3>
                                        <p className="text-muted-foreground">
                                            This restaurant has no reported discrepancies
                                        </p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </MainContent>
    );
}
