import { useState, useMemo, useEffect } from 'react';
import { Package, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Delivery } from '@/types/delivery';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useProfileCompletionCheck } from '@/hooks/useProfileCompletionCheck';
import { useNavigate } from 'react-router-dom';
import MainContent from '@/components/layout/MainContent';
import { ProfileCompletionModal } from '@/components/ProfileCompletionModal';
import { format, isToday } from 'date-fns';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const { userId } = useClerkAuth();
  const navigate = useNavigate();
  const supabase = useAuthenticatedSupabase();
  const { needsProfileUpdate, dismissPrompt, clearDismissal } = useProfileCompletionCheck();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Show profile completion modal when needed
  useEffect(() => {
    if (needsProfileUpdate) {
      setShowProfileModal(true);
    }
  }, [needsProfileUpdate]);

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
          .eq('status', 'draft')
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

  const pendingDeliveries = useMemo(() => {
    return deliveries.filter(d => d.status === 'draft');
  }, [deliveries]);

  const handleProfileModalClose = () => {
    setShowProfileModal(false);
    dismissPrompt(); // Sets 24-hour dismissal
  };

  const handleProfileSaved = () => {
    setShowProfileModal(false);
    clearDismissal(); // Clear dismissal since profile is now complete
  };

  if (!user) return null;

  return (
    <AppLayout>
      <MainContent>
        <div className="max-w-6xl mx-auto pb-20">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Welcome back, {user.companyName}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your deliveries today.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Right Column (Desktop) / Top (Mobile) - Upload Card */}
            <div className="lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:sticky lg:top-6 mb-8 lg:mb-0">
              <button
                onClick={() => navigate('/extract-receipt')}
                className="w-full text-left group relative overflow-hidden bg-[#009DE0] hover:bg-[#009DE0]/90 transition-all duration-300 rounded-2xl p-6 shadow-lg shadow-[#009DE0]/20 hover:shadow-xl hover:shadow-[#009DE0]/30 hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                  <Package size={120} />
                </div>

                <div className="relative z-10 flex flex-col h-full min-h-[160px] justify-between">
                  <div className="p-3 bg-white/20 w-fit rounded-xl backdrop-blur-sm mb-4">
                    <Plus className="w-8 h-8 text-white" />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Upload Receipt
                    </h3>
                    <p className="text-blue-50 font-medium leading-relaxed">
                      Scan a new delivery receipt to start verification
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Left Column (Desktop) - Main Content */}
            <div className="lg:col-span-2 lg:row-start-1 space-y-10">

              {/* Pending Verifications Section */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  Pending Verifications
                  {pendingDeliveries.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                      {pendingDeliveries.length}
                    </span>
                  )}
                </h2>

                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#009DE0]" />
                  </div>
                ) : pendingDeliveries.length > 0 ? (
                  <div className="space-y-3">
                    {pendingDeliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        onClick={() => navigate(`/verify-delivery/${delivery.id}`)}
                        className="group bg-card border border-border rounded-xl p-5 hover:border-[#009DE0]/50 hover:shadow-sm transition-all cursor-pointer relative"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-muted/50 rounded-lg text-muted-foreground">
                              <Package size={18} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{delivery.supplier_name}</h3>
                              <p className="text-xs text-muted-foreground font-mono">{delivery.order_number || 'N/A'}</p>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {isToday(new Date(delivery.delivery_date)) ? 'Today' : format(new Date(delivery.delivery_date), 'MMM d')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pl-12">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{delivery.items?.length || 0} items</span>
                            <span>•</span>
                            <span>€{Number(delivery.total_value || 0).toFixed(2)}</span>
                          </div>
                          <span className="text-sm font-medium text-[#009DE0] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Verify <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/10 border border-dashed border-border rounded-xl p-8 text-center">
                    <p className="text-muted-foreground font-medium">All caught up! No pending verifications.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </MainContent>

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={showProfileModal}
        onClose={handleProfileModalClose}
        onSaved={handleProfileSaved}
      />
    </AppLayout>
  );
}
