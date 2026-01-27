import { useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    CheckCircle,
    AlertTriangle,
    Package,
    Users,
    DollarSign,
    Loader2
} from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    useSupplierStats,
    useSupplierDeliveries,
    useSupplierIssues,
    useSupplierRestaurants
} from '@/hooks/useSupplierData';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

export default function SupplierAnalytics() {
    const { data: stats, isLoading: statsLoading } = useSupplierStats();
    const { data: deliveries, isLoading: deliveriesLoading } = useSupplierDeliveries();
    const { data: issues, isLoading: issuesLoading } = useSupplierIssues();
    const { data: restaurants, isLoading: restaurantsLoading } = useSupplierRestaurants();

    const isLoading = statsLoading || deliveriesLoading || issuesLoading || restaurantsLoading;

    // Delivery status distribution
    const statusDistribution = useMemo(() => {
        if (!deliveries) return [];

        const statusCounts: Record<string, number> = {};
        deliveries.forEach((d) => {
            const status = d.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const statusLabels: Record<string, string> = {
            draft: 'Draft',
            complete: 'Complete',
            pending_redelivery: 'Issue Reported',
            resolved: 'Resolved',
        };

        return Object.entries(statusCounts).map(([status, count]) => ({
            name: statusLabels[status] || status,
            value: count,
        }));
    }, [deliveries]);

    // Revenue by restaurant
    const revenueByRestaurant = useMemo(() => {
        if (!restaurants) return [];

        return restaurants
            .slice(0, 5)
            .map((r) => ({
                name: r.restaurantId.slice(0, 12) + '...',
                revenue: r.totalValue,
                orders: r.totalDeliveries,
            }));
    }, [restaurants]);

    // Issue resolution stats
    const issueStats = useMemo(() => {
        if (!issues) return [];

        const pending = issues.filter((i) => i.status === 'pending_redelivery').length;
        const resolved = issues.filter((i) => i.status === 'resolved').length;

        return [
            { name: 'Pending', value: pending, color: '#f59e0b' },
            { name: 'Resolved', value: resolved, color: '#009EE0' },
        ];
    }, [issues]);

    const COLORS = ['#009EE0', '#0088C4', '#f59e0b', '#ef4444', '#8b5cf6'];

    // Calculate accuracy rate
    const accuracyRate = useMemo(() => {
        if (!deliveries) return 100;
        const totalDeliveries = deliveries.filter((d) => d.status === 'complete' || d.status === 'resolved').length;
        const issueCount = deliveries.filter((d) => Number(d.missing_value || 0) > 0).length;
        if (totalDeliveries === 0) return 100;
        return Math.round(((totalDeliveries - issueCount) / totalDeliveries) * 100);
    }, [deliveries]);

    return (
        <MainContent>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
                    <p className="text-muted-foreground">Insights into your supplier performance</p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <Package className="w-5 h-5 text-[#009EE0]" />
                            </div>
                            {statsLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{stats?.totalDeliveries || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Total Deliveries</p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <DollarSign className="w-5 h-5 text-[#009EE0]" />
                            </div>
                            {statsLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-foreground">€{(stats?.totalRevenue || 0).toFixed(0)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <CheckCircle className="w-5 h-5 text-blue-500" />
                            </div>
                            {deliveriesLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{accuracyRate}%</p>
                                    <p className="text-xs text-muted-foreground mt-1">Delivery Accuracy</p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                                <Users className="w-5 h-5 text-purple-500" />
                            </div>
                            {statsLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{stats?.uniqueRestaurants || 0}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Active Restaurants</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Revenue by Restaurant */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-[#009EE0]" />
                                        Revenue by Restaurant
                                    </CardTitle>
                                    <CardDescription>Top performing restaurants</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {revenueByRestaurant.length > 0 ? (
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={revenueByRestaurant} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                                    <XAxis type="number" className="text-xs" />
                                                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                                                    <Tooltip
                                                        formatter={(value: number) => [`€${value.toFixed(2)}`, 'Revenue']}
                                                        contentStyle={{
                                                            backgroundColor: 'hsl(var(--card))',
                                                            border: '1px solid hsl(var(--border))',
                                                            borderRadius: '8px',
                                                        }}
                                                    />
                                                    <Bar dataKey="revenue" fill="#009EE0" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                            No restaurant data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Delivery Status Distribution */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-blue-500" />
                                        Delivery Status Distribution
                                    </CardTitle>
                                    <CardDescription>Current status breakdown</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {statusDistribution.length > 0 ? (
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={statusDistribution}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                    >
                                                        {statusDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'hsl(var(--card))',
                                                            border: '1px solid hsl(var(--border))',
                                                            borderRadius: '8px',
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                            No delivery data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Issue Resolution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    Issue Resolution Status
                                </CardTitle>
                                <CardDescription>Reported discrepancies and their resolution status</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {issueStats.some((s) => s.value > 0) ? (
                                    <div className="h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={issueStats}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {issueStats.map((entry) => (
                                                        <Cell key={entry.name} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'hsl(var(--card))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: '8px',
                                                    }}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                        No issues reported yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </MainContent>
    );
}
