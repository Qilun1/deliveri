import { useState, useMemo, useEffect } from 'react';
import {
    Users,
    Search,
    Mail,
    Phone,
    MapPin,
    Calendar,
    ShoppingCart,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Loader2,
    AlertTriangle,
    Building2,
    Check,
    X,
    Bell
} from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSupplierRestaurantsWithProfiles, useSupplierStats, useConnectionRequests } from '@/hooks/useSupplierData';
import { ConnectButton } from '@/components/connections/ConnectButton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';

interface SearchedRestaurant {
    id: string;
    name: string;
    city: string | null;
    street_address: string | null;
    address: string | null;
    contact_email: string | null;
    contact_phone: string | null;
}

export default function ConnectedRestaurants() {
    const supabase = useAuthenticatedSupabase();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchedRestaurant[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const { data: restaurants, isLoading, error } = useSupplierRestaurantsWithProfiles();
    const { data: stats } = useSupplierStats();
    const {
        pendingRequests,
        isLoading: isLoadingRequests,
        acceptRequest,
        isAccepting,
        declineRequest,
        isDeclining,
    } = useConnectionRequests();

    // Handle accept connection request
    const handleAccept = async (connectionId: string, restaurantName: string) => {
        try {
            await acceptRequest(connectionId);
            toast({
                title: 'Connection Accepted',
                description: `You are now connected with ${restaurantName}.`,
            });
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to accept connection request.',
                variant: 'destructive',
            });
        }
    };

    // Handle decline connection request
    const handleDecline = async (connectionId: string, restaurantName: string) => {
        try {
            await declineRequest(connectionId);
            toast({
                title: 'Connection Declined',
                description: `Connection request from ${restaurantName} was declined.`,
            });
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to decline connection request.',
                variant: 'destructive',
            });
        }
    };

    // Debounce search query (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Search restaurants in Supabase
    useEffect(() => {
        const searchRestaurants = async () => {
            if (!debouncedQuery || debouncedQuery.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const { data, error: searchError } = await supabase
                    .from('restaurants')
                    .select('*')
                    .or(`name.ilike.%${debouncedQuery}%,city.ilike.%${debouncedQuery}%`)
                    .limit(20);

                if (searchError) throw searchError;

                setSearchResults(data || []);
            } catch (err) {
                console.error('Error searching restaurants:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        searchRestaurants();
    }, [debouncedQuery]);

    const filteredRestaurants = useMemo(() => {
        if (!restaurants) return [];

        // If actively searching in Supabase, don't filter locally
        if (debouncedQuery.length >= 2) return restaurants;

        let result = [...restaurants];

        // Filter by search locally for connected restaurants
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (r) =>
                    r.restaurantId.toLowerCase().includes(query) ||
                    r.profile?.name?.toLowerCase().includes(query) ||
                    r.profile?.city?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [restaurants, searchQuery, debouncedQuery]);

    const totalStats = useMemo(() => {
        if (!restaurants) return { totalRestaurants: 0, totalOrders: 0, totalRevenue: 0, avgDiscrepancy: 0 };

        const totalOrders = restaurants.reduce((sum, r) => sum + r.totalDeliveries, 0);
        const totalIssues = restaurants.reduce((sum, r) => sum + r.issueCount, 0);

        return {
            totalRestaurants: restaurants.length,
            totalOrders,
            totalRevenue: restaurants.reduce((sum, r) => sum + r.totalValue, 0),
            avgDiscrepancy: totalOrders > 0 ? (totalIssues / totalOrders) * 100 : 0,
        };
    }, [restaurants]);

    // Check if a searched restaurant is already connected
    const connectedIds = useMemo(() => {
        return new Set(restaurants?.map(r => r.restaurantId) || []);
    }, [restaurants]);

    if (error) {
        return (
            <MainContent>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-destructive">Error loading restaurants</p>
                    </div>
                </div>
            </MainContent>
        );
    }

    const showSearchResults = debouncedQuery.length >= 2;

    return (
        <MainContent>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Restaurant Discovery</h1>
                    <p className="text-muted-foreground">Find and connect with restaurants</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#009EE0]/10 rounded-lg">
                                    <Users className="w-6 h-6 text-[#009EE0]" />
                                </div>
                                <div>
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <>
                                            <p className="text-2xl font-bold text-foreground">{totalStats.totalRestaurants}</p>
                                            <p className="text-sm text-muted-foreground">Connected</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#009EE0]/10 rounded-lg">
                                    <ShoppingCart className="w-6 h-6 text-[#009EE0]" />
                                </div>
                                <div>
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <>
                                            <p className="text-2xl font-bold text-foreground">{totalStats.totalOrders}</p>
                                            <p className="text-sm text-muted-foreground">Total Orders</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#009EE0]/10 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-[#009EE0]" />
                                </div>
                                <div>
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <>
                                            <p className="text-2xl font-bold text-foreground">
                                                {totalStats.totalRevenue.toFixed(2)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/10 rounded-lg">
                                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <>
                                            <p className="text-2xl font-bold text-foreground">
                                                {totalStats.avgDiscrepancy.toFixed(1)}%
                                            </p>
                                            <p className="text-sm text-muted-foreground">Avg Discrepancy</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search restaurants by name or city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                    </div>
                    {searchQuery && searchQuery.length < 2 && (
                        <p className="text-sm text-muted-foreground mt-2">Type at least 2 characters to search all restaurants</p>
                    )}
                </div>

                {/* Search Results from Supabase */}
                {showSearchResults && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Search Results {searchResults.length > 0 && `(${searchResults.length})`}
                        </h2>

                        {isSearching ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {searchResults.map((restaurant) => (
                                    <Card key={restaurant.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="pt-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                                                        <Building2 className="w-5 h-5 text-[#009EE0]" />
                                                        {restaurant.name}
                                                    </h3>
                                                    {(restaurant.city || restaurant.street_address || restaurant.address) && (
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {restaurant.street_address || restaurant.address}
                                                            {(restaurant.street_address || restaurant.address) && restaurant.city && ', '}
                                                            {restaurant.city}
                                                        </p>
                                                    )}
                                                </div>
                                                {connectedIds.has(restaurant.id) && (
                                                    <Badge className="bg-[#009EE0]/10 text-[#009EE0]">Connected</Badge>
                                                )}
                                            </div>

                                            {/* Contact Info */}
                                            {(restaurant.contact_email || restaurant.contact_phone) && (
                                                <div className="flex flex-col gap-1 mb-4 text-sm text-muted-foreground">
                                                    {restaurant.contact_email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3" />
                                                            {restaurant.contact_email}
                                                        </span>
                                                    )}
                                                    {restaurant.contact_phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {restaurant.contact_phone}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Connect Button */}
                                            <div className="pt-4 border-t border-border">
                                                <ConnectButton
                                                    entityId={restaurant.id}
                                                    entityType="restaurant"
                                                    entityName={restaurant.name}
                                                    className="w-full"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-8 text-center">
                                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">No restaurants found for "{debouncedQuery}"</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Pending Connection Requests Section */}
                {pendingRequests.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Bell className="w-5 h-5 text-amber-500" />
                            <h2 className="text-lg font-semibold text-foreground">
                                Pending Connection Requests ({pendingRequests.length})
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingRequests.map((request) => (
                                <Card key={request.id} className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                                                    <Building2 className="w-5 h-5 text-amber-500" />
                                                    {request.restaurant?.name || 'Unknown Restaurant'}
                                                </h3>
                                                {(request.restaurant?.city || request.restaurant?.street_address) && (
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {request.restaurant?.street_address}
                                                        {request.restaurant?.street_address && request.restaurant?.city && ', '}
                                                        {request.restaurant?.city}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                                                Pending
                                            </Badge>
                                        </div>

                                        {/* Contact Info */}
                                        {(request.restaurant?.contact_email || request.restaurant?.contact_phone) && (
                                            <div className="flex flex-col gap-1 mb-4 text-sm text-muted-foreground">
                                                {request.restaurant?.contact_email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {request.restaurant.contact_email}
                                                    </span>
                                                )}
                                                {request.restaurant?.contact_phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {request.restaurant.contact_phone}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Request date */}
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                                            <Calendar className="w-3 h-3" />
                                            Requested: {format(new Date(request.created_at), 'MMM d, yyyy')}
                                        </p>

                                        {/* Accept/Decline Buttons */}
                                        <div className="flex gap-2 pt-4 border-t border-amber-200 dark:border-amber-900/50">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="flex-1 bg-[#009EE0] hover:bg-[#0080B8] text-white"
                                                onClick={() => handleAccept(request.id, request.restaurant?.name || 'Restaurant')}
                                                disabled={isAccepting || isDeclining}
                                            >
                                                {isAccepting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Accept
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                                                onClick={() => handleDecline(request.id, request.restaurant?.name || 'Restaurant')}
                                                disabled={isAccepting || isDeclining}
                                            >
                                                {isDeclining ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <X className="w-4 h-4 mr-1" />
                                                        Decline
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Connected Restaurants Section */}
                <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">Connected Restaurants</h2>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredRestaurants.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredRestaurants.map((restaurant) => (
                                <Card key={restaurant.restaurantId} className="hover:shadow-md transition-shadow overflow-hidden">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Building2 className="w-5 h-5 text-[#009EE0]" />
                                                    {restaurant.profile?.name || `Restaurant ${restaurant.restaurantId.slice(0, 8)}`}
                                                </CardTitle>
                                                {restaurant.profile?.city && (
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {restaurant.profile.address && `${restaurant.profile.address}, `}
                                                        {restaurant.profile.city}
                                                        {restaurant.profile.postal_code && ` ${restaurant.profile.postal_code}`}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    restaurant.discrepancyRate < 5
                                                        ? "bg-[#009EE0]/10 text-[#009EE0]"
                                                        : restaurant.discrepancyRate < 15
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-red-100 text-red-700"
                                                }
                                            >
                                                {restaurant.discrepancyRate < 5 ? (
                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 mr-1" />
                                                )}
                                                {restaurant.discrepancyRate.toFixed(1)}% issues
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        {/* Contact Info */}
                                        {(restaurant.profile?.contact_email || restaurant.profile?.contact_phone) && (
                                            <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                                                {restaurant.profile?.contact_email && (
                                                    <a
                                                        href={`mailto:${restaurant.profile.contact_email}`}
                                                        className="flex items-center gap-1 hover:text-[#009EE0] transition-colors"
                                                    >
                                                        <Mail className="w-3 h-3" />
                                                        {restaurant.profile.contact_email}
                                                    </a>
                                                )}
                                                {restaurant.profile?.contact_phone && (
                                                    <a
                                                        href={`tel:${restaurant.profile.contact_phone}`}
                                                        className="flex items-center gap-1 hover:text-[#009EE0] transition-colors"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        {restaurant.profile.contact_phone}
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {/* Last Order */}
                                        {restaurant.lastDeliveryDate && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                                                <Calendar className="w-3 h-3" />
                                                Last order: {format(new Date(restaurant.lastDeliveryDate), 'MMM d, yyyy')}
                                            </p>
                                        )}

                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-foreground">{restaurant.totalDeliveries}</p>
                                                <p className="text-xs text-muted-foreground">Orders</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-foreground">
                                                    {restaurant.totalValue.toFixed(0)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Revenue</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-red-600">{restaurant.issueCount}</p>
                                                <p className="text-xs text-muted-foreground">Issues</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-foreground mb-2">No connected restaurants</h3>
                                <p className="text-muted-foreground">
                                    Search for restaurants above to send connection requests
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </MainContent>
    );
}
