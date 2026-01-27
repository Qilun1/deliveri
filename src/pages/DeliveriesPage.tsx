import { useState, useMemo, useEffect } from 'react';
import { format, isToday, isYesterday, subDays, startOfWeek, isAfter } from 'date-fns';
import { Plus, Search, ChevronRight, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Delivery } from '@/types/delivery';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';

export default function DeliveriesPage() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const supabase = useAuthenticatedSupabase();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [expandedSuppliers, setExpandedSuppliers] = useState<string[]>([]);

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

  // Filter Logic
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((delivery) => {
      // Search
      const matchesSearch =
        (delivery.order_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        delivery.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());

      // Status Filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && delivery.status === 'draft') ||
        (statusFilter === 'complete' && delivery.status === 'complete') ||
        (statusFilter === 'discrepancy' && delivery.status === 'pending_redelivery');

      // Time Filter
      let matchesTime = true;
      const d = new Date(delivery.delivery_date);
      const now = new Date();
      if (timeFilter === 'week') {
        matchesTime = isAfter(d, startOfWeek(now));
      } else if (timeFilter === 'month') {
        matchesTime = isAfter(d, subDays(now, 30));
      }

      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [deliveries, searchQuery, statusFilter, timeFilter]);

  // Group by Supplier
  const groupedDeliveries = useMemo(() => {
    const grouped: Record<string, Delivery[]> = {};
    filteredDeliveries.forEach(d => {
      const supplierKey = d.supplier_name;
      if (!grouped[supplierKey]) {
        grouped[supplierKey] = [];
      }
      grouped[supplierKey].push(d);
    });

    // Sort contents by date
    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
    });

    return grouped;
  }, [filteredDeliveries]);

  // Set initial expanded state
  useEffect(() => {
    // Expand all if filtering, otherwise just first few
    if (searchQuery || statusFilter !== 'all' || timeFilter !== 'all') {
      setExpandedSuppliers(Object.keys(groupedDeliveries));
    } else if (expandedSuppliers.length === 0 && Object.keys(groupedDeliveries).length > 0) {
      setExpandedSuppliers(Object.keys(groupedDeliveries).slice(0, 3));
    }
  }, [groupedDeliveries, searchQuery, statusFilter, timeFilter]);


  const toggleSupplier = (supplierName: string) => {
    setExpandedSuppliers(prev =>
      prev.includes(supplierName)
        ? prev.filter(name => name !== supplierName)
        : [...prev, supplierName]
    );
  };

  const formatDeliveryDate = (date: Date | string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d, yyyy');
  };

  return (
    <AppLayout>
      <MainContent>
        <div className="max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Deliveries</h1>
              <p className="text-muted-foreground mt-1">
                Track and verify all your deliveries
              </p>
            </div>
            <Button
              onClick={() => navigate('/extract-receipt')}
              className="bg-[#009DE0] hover:bg-[#009DE0]/90 text-white"
            >
              <Plus size={18} className="mr-2" />
              Upload
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search by order # or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-card"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="h-11 px-4 rounded-lg border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-[#009DE0]/20 font-medium"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">Last 30 Days</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 px-4 rounded-lg border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-[#009DE0]/20 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="complete">Complete</option>
                <option value="discrepancy">Discrepancy</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#009DE0]" />
            </div>
          ) : (
            /* Grouped List */
            <div className="space-y-6">
              {Object.keys(groupedDeliveries).length > 0 ? (
                Object.keys(groupedDeliveries).map(supplierName => {
                  const supplierDeliveries = groupedDeliveries[supplierName];
                  const isExpanded = expandedSuppliers.includes(supplierName);

                  return (
                    <div key={supplierName} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                      {/* Supplier Header */}
                      <button
                        onClick={() => toggleSupplier(supplierName)}
                        className="w-full flex items-center justify-between p-4 px-6 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("text-muted-foreground transition-transform duration-200", isExpanded && "rotate-90")}>
                            <ChevronRight size={20} />
                          </div>
                          <span className="font-semibold text-foreground text-lg">{supplierName}</span>
                        </div>
                        <span className="text-sm font-medium px-3 py-1 bg-muted rounded-full text-muted-foreground">
                          {supplierDeliveries.length} deliveries
                        </span>
                      </button>

                      {/* Deliveries List */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="border-t border-border">
                              {supplierDeliveries.map(delivery => (
                                <div
                                  key={delivery.id}
                                  onClick={() => navigate(delivery.status === 'draft' ? `/verify-delivery/${delivery.id}` : `/deliveries/${delivery.id}`)}
                                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-start gap-4 mb-2 sm:mb-0">
                                    <div className="min-w-[100px]">
                                      <p className="font-medium text-foreground">
                                        {formatDeliveryDate(delivery.delivery_date)}
                                      </p>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        {delivery.order_number || 'N/A'}
                                      </p>
                                    </div>
                                    <div className="h-10 w-px bg-border hidden sm:block mx-2" />
                                    <div className="flex flex-col justify-center">
                                      <p className="text-sm text-foreground">
                                        {delivery.items?.length || 0} items
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        €{Number(delivery.total_value || 0).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 gap-4">
                                    {delivery.status === 'draft' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Pending Verification
                                      </span>
                                    ) : delivery.status === 'pending_redelivery' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                        <AlertTriangle size={12} />
                                        {Number(delivery.missing_value) > 0
                                          ? `-€${Number(delivery.missing_value).toFixed(2)}`
                                          : 'Discrepancy'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                        <CheckCircle size={12} />
                                        Complete
                                      </span>
                                    )}

                                    {delivery.status === 'draft' ? (
                                      <Button size="sm" variant="ghost" className="text-[#009DE0] hover:text-[#009DE0] hover:bg-[#009DE0]/10">
                                        Verify <ChevronRight size={16} className="ml-1" />
                                      </Button>
                                    ) : (
                                      <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center">
                  <p className="text-muted-foreground text-lg">No deliveries found.</p>
                  <p className="text-muted-foreground text-sm mt-2">Upload a receipt to get started.</p>
                  <Button
                    onClick={() => navigate('/extract-receipt')}
                    className="bg-[#009DE0] hover:bg-[#009DE0]/90 text-white mt-4"
                  >
                    <Plus size={18} className="mr-2" />
                    Upload Receipt
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </MainContent>
    </AppLayout>
  );
}
