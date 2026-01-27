import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    ShoppingCart,
    AlertTriangle,
    ArrowRight,
    Users,
    Package,
    Loader2,
    Bell,
    Wifi,
    WifiOff,
    MapPin,
    TrendingUp
} from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    useSupplierStats,
    useSupplierRestaurantsWithProfiles,
    useRealtimeDiscrepancyAlerts,
} from '@/hooks/useSupplierData';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SupplierDashboard() {
    const navigate = useNavigate();

    const { data: stats, isLoading: statsLoading } = useSupplierStats();
    const { data: restaurants, isLoading: restaurantsLoading } = useSupplierRestaurantsWithProfiles();

    // Real-time subscription for live updates
    const {
        isConnected,
        newReportsCount,
        lastEvent,
        clearAlerts
    } = useRealtimeDiscrepancyAlerts();

    // Show toast notification when new report arrives
    useEffect(() => {
        if (lastEvent && lastEvent.type === 'INSERT') {
            const missingValue = Number(lastEvent.delivery.missing_value || 0);
            if (missingValue > 0 || lastEvent.delivery.status === 'pending_redelivery') {
                toast.error(
                    `New discrepancy report: ${missingValue.toFixed(2)} missing`,
                    {
                        description: `Order ${lastEvent.delivery.order_number || 'Unknown'} - ${format(new Date(lastEvent.delivery.delivery_date), 'MMM d')}`,
                        action: {
                            label: 'View',
                            onClick: () => navigate('/supplier/issues'),
                        },
                        duration: 8000,
                    }
                );
            } else {
                toast.success(
                    'New delivery received',
                    {
                        description: `Order ${lastEvent.delivery.order_number || 'Unknown'} - ${Number(lastEvent.delivery.total_value || 0).toFixed(2)}`,
                        duration: 5000,
                    }
                );
            }
        } else if (lastEvent && lastEvent.type === 'UPDATE') {
            const missingValue = Number(lastEvent.delivery.missing_value || 0);
            if (missingValue > 0) {
                toast.warning(
                    `Delivery updated with discrepancy`,
                    {
                        description: `Order ${lastEvent.delivery.order_number || 'Unknown'} - ${missingValue.toFixed(2)} missing`,
                        action: {
                            label: 'View',
                            onClick: () => navigate('/supplier/issues'),
                        },
                        duration: 6000,
                    }
                );
            }
        }
    }, [lastEvent, navigate]);

    // Calculate today's active orders
    const todayOrders = stats?.activeDeliveries || 0;

    return (
        <MainContent>
            <div className="max-w-7xl mx-auto">
                {/* Welcome Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            Supplier Dashboard
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your restaurant connections and deliveries
                        </p>
                    </div>
                    {/* Real-time Status Indicator */}
                    <div className="flex items-center gap-4">
                        {newReportsCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="relative border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                    navigate('/supplier/issues');
                                    clearAlerts();
                                }}
                            >
                                <Bell className="w-4 h-4 mr-2 animate-pulse" />
                                {newReportsCount} new report{newReportsCount > 1 ? 's' : ''}
                            </Button>
                        )}
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                                isConnected
                                    ? "bg-[#009EE0]/10 text-[#009EE0]"
                                    : "bg-amber-100 text-amber-700"
                            )}
                        >
                            {isConnected ? (
                                <>
                                    <Wifi className="w-3 h-3" />
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#009EE0] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009EE0]"></span>
                                    </span>
                                    Live
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-3 h-3" />
                                    Connecting...
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Summary Stats - Top Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                    <Card className="border-border shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <Users className="w-5 h-5 text-[#009EE0]" />
                                <span className="text-xs text-muted-foreground">Connected</span>
                            </div>
                            {statsLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{stats?.uniqueRestaurants || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Total Restaurants</p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <Package className="w-5 h-5 text-[#009EE0]" />
                                <span className="text-xs text-muted-foreground">Today</span>
                            </div>
                            {statsLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{todayOrders}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Active Orders Today</p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className={cn(
                        "border-border shadow-sm transition-all",
                        newReportsCount > 0 && "ring-2 ring-red-500 ring-offset-2"
                    )}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <AlertTriangle className={cn(
                                    "w-5 h-5 text-red-500",
                                    newReportsCount > 0 && "animate-pulse"
                                )} />
                                <span className="text-xs text-muted-foreground">Open</span>
                            </div>
                            {statsLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{stats?.openIssues || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Pending Issues</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Button
                        onClick={() => navigate('/supplier/orders')}
                        className="h-auto py-4 bg-[#009EE0] hover:bg-[#009EE0]/90 text-white"
                    >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        View All Orders
                        {(stats?.pendingDeliveries || 0) > 0 && (
                            <Badge className="ml-2 bg-white/20 text-white hover:bg-white/20">{stats?.pendingDeliveries}</Badge>
                        )}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <Button
                        onClick={() => navigate('/supplier/deliveries')}
                        variant="outline"
                        className="h-auto py-4 border-[#009EE0] text-[#009EE0] hover:bg-[#009EE0]/10"
                    >
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Outgoing Deliveries
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <Button
                        onClick={() => {
                            navigate('/supplier/issues');
                            clearAlerts();
                        }}
                        variant="outline"
                        className={cn(
                            "h-auto py-4",
                            newReportsCount > 0 && "border-red-200 bg-red-50 hover:bg-red-100"
                        )}
                    >
                        <AlertTriangle className={cn(
                            "w-5 h-5 mr-2",
                            newReportsCount > 0 && "text-red-500"
                        )} />
                        Review Issues
                        {((stats?.openIssues || 0) > 0 || newReportsCount > 0) && (
                            <Badge variant="destructive" className="ml-2">
                                {newReportsCount > 0 ? `${newReportsCount} new` : stats?.openIssues}
                            </Badge>
                        )}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>

                {/* Restaurant Cards Grid - Primary View */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-[#009EE0]" />
                                Connected Restaurants
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/supplier/restaurants')}
                                className="text-[#009EE0] hover:text-[#009EE0]/80 hover:bg-[#009EE0]/10"
                            >
                                View All
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {restaurantsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : restaurants && restaurants.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {restaurants.map((restaurant) => (
                                    <Card
                                        key={restaurant.restaurantId}
                                        className="cursor-pointer hover:shadow-md transition-all border-border shadow-sm hover:border-[#009EE0]/30"
                                        onClick={() => navigate(`/supplier/restaurant/${restaurant.restaurantId}`)}
                                    >
                                        <CardContent className="p-4">
                                            {/* Restaurant Name */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-foreground truncate">
                                                        {restaurant.profile?.name || `Restaurant ${restaurant.restaurantId.slice(0, 8)}`}
                                                    </h3>
                                                    {restaurant.profile?.city && (
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{restaurant.profile.city}</span>
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "ml-2 flex-shrink-0",
                                                        restaurant.discrepancyRate < 5
                                                            ? "bg-[#009EE0]/10 text-[#009EE0]"
                                                            : restaurant.discrepancyRate < 15
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "bg-red-100 text-red-700"
                                                    )}
                                                >
                                                    {restaurant.discrepancyRate.toFixed(1)}% issues
                                                </Badge>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex items-center justify-between pt-3 border-t border-border">
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-foreground">{restaurant.totalDeliveries}</p>
                                                    <p className="text-xs text-muted-foreground">Orders</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-foreground">{restaurant.totalValue.toFixed(0)}</p>
                                                    <p className="text-xs text-muted-foreground">Revenue</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-red-600">{restaurant.issueCount}</p>
                                                    <p className="text-xs text-muted-foreground">Issues</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                    No connected restaurants yet
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    Restaurant data will appear once you have orders
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainContent>
    );
}
