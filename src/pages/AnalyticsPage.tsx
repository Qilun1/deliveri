import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, Euro, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { Delivery } from '@/types/delivery';
import { useAuth } from '@clerk/clerk-react';
import { format, subMonths } from 'date-fns';

export default function AnalyticsPage() {
  const { userId } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch deliveries from Supabase
  useEffect(() => {
    const fetchDeliveries = async () => {
      if (!userId) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            *,
            items:delivery_items(*)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDeliveries(data as Delivery[]);
      } catch (err) {
        console.error('Error fetching deliveries:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliveries();
  }, [userId]);

  // Calculate analytics from real data
  const totalRecovered = useMemo(() => {
    return deliveries.reduce((sum, d) => sum + Number(d.missing_value || 0), 0);
  }, [deliveries]);

  const totalDeliveries = deliveries.length;
  const discrepancyCount = deliveries.filter(d => Number(d.missing_value) > 0).length;

  // Calculate accuracy rate
  const accuracyRate = useMemo(() => {
    if (totalDeliveries === 0) return 0;
    const completeDeliveries = deliveries.filter(d => d.status === 'complete').length;
    return Math.round((completeDeliveries / totalDeliveries) * 100);
  }, [deliveries, totalDeliveries]);

  // Generate supplier data from real deliveries
  const supplierData = useMemo(() => {
    const supplierStats: Record<string, { total: number; complete: number }> = {};

    deliveries.forEach(d => {
      if (!supplierStats[d.supplier_name]) {
        supplierStats[d.supplier_name] = { total: 0, complete: 0 };
      }
      supplierStats[d.supplier_name].total++;
      if (d.status === 'complete') {
        supplierStats[d.supplier_name].complete++;
      }
    });

    return Object.entries(supplierStats).map(([name, stats]) => ({
      name,
      accuracy: stats.total > 0 ? Math.round((stats.complete / stats.total) * 100) : 0,
      discrepancies: stats.total > 0 ? 100 - Math.round((stats.complete / stats.total) * 100) : 0,
    }));
  }, [deliveries]);

  // Generate monthly data from real deliveries
  const monthlyData = useMemo(() => {
    const months: Record<string, { discrepancies: number; recovered: number }> = {};

    // Initialize last 5 months
    for (let i = 4; i >= 0; i--) {
      const monthKey = format(subMonths(new Date(), i), 'MMM');
      months[monthKey] = { discrepancies: 0, recovered: 0 };
    }

    deliveries.forEach(d => {
      const monthKey = format(new Date(d.delivery_date), 'MMM');
      if (months[monthKey]) {
        if (Number(d.missing_value) > 0) {
          months[monthKey].discrepancies++;
          months[monthKey].recovered += Number(d.missing_value);
        }
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
    }));
  }, [deliveries]);

  // Discrepancy types (static for now as we don't track types)
  const discrepancyTypes = [
    { name: 'Missing Items', value: discrepancyCount > 0 ? 100 : 0, color: 'hsl(var(--destructive))' },
  ];

  if (isLoading) {
    return (
      <AppLayout>
        <MainContent>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </MainContent>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <MainContent>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Track discrepancies and recovered revenue
              </p>
            </div>
            <Button variant="outline">
              <Download size={18} />
              Export CSV
            </Button>
          </div>

          {totalDeliveries === 0 ? (
            <div className="bg-muted/10 border border-dashed border-border rounded-xl p-12 text-center">
              <p className="text-muted-foreground font-medium text-lg">No delivery data yet.</p>
              <p className="text-muted-foreground text-sm mt-2">Upload receipts to see analytics.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Euro className="text-success" size={20} />
                    <span className="text-sm text-muted-foreground">Total Discrepancies Found</span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-foreground">
                    €{totalRecovered.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <span>From {discrepancyCount} deliveries</span>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="text-primary" size={20} />
                    <span className="text-sm text-muted-foreground">Delivery Accuracy</span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-foreground">
                    {accuracyRate}%
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <span>Based on {totalDeliveries} deliveries</span>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingDown className="text-warning" size={20} />
                    <span className="text-sm text-muted-foreground">Total Deliveries</span>
                  </div>
                  <div className="font-mono text-3xl font-bold text-foreground">
                    {totalDeliveries}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                    <span>{discrepancyCount} with discrepancies</span>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Discrepancies Over Time */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4">Discrepancies Over Time</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="recovered"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Supplier Accuracy */}
                {supplierData.length > 0 && (
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Accuracy by Supplier</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={supplierData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="accuracy" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </MainContent>
    </AppLayout>
  );
}
