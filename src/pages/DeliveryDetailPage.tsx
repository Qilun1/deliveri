import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, FileText, CheckCircle2, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { Delivery } from '@/types/delivery';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DeliveryDetailPage() {
    const { deliveryId } = useParams();
    const navigate = useNavigate();
    const supabase = useAuthenticatedSupabase();
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDelivery = async () => {
            if (!deliveryId) return;

            try {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('deliveries')
                    .select(`
            *,
            items:delivery_items(*)
          `)
                    .eq('id', deliveryId)
                    .single();

                if (error) throw error;
                setDelivery(data as Delivery);
            } catch (err) {
                console.error('Error fetching delivery:', err);
                toast.error('Failed to load delivery details');
                navigate('/deliveries');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDelivery();
    }, [deliveryId, navigate]);

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

    if (!delivery) return null;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground">Draft</Badge>;
            case 'complete':
                return <Badge className="bg-success/10 text-success border-success/20">Verified</Badge>;
            case 'pending_redelivery':
                return <Badge variant="destructive">Discrepancy</Badge>;
            case 'resolved':
                return <Badge className="bg-success text-success-foreground">Resolved</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <AppLayout>
            <MainContent>
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-foreground">
                                    Delivery Details
                                </h1>
                                {getStatusBadge(delivery.status)}
                            </div>
                            <p className="text-muted-foreground">
                                Order {delivery.order_number || 'N/A'} from {delivery.supplier_name}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Info Cards */}
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3 text-muted-foreground">
                                <Building2 size={18} />
                                <span className="text-sm font-medium">Supplier</span>
                            </div>
                            <p className="text-lg font-semibold">{delivery.supplier_name}</p>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3 text-muted-foreground">
                                <Calendar size={18} />
                                <span className="text-sm font-medium">Delivery Date</span>
                            </div>
                            <p className="text-lg font-semibold">
                                {format(new Date(delivery.delivery_date), 'PPP')}
                            </p>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-3 text-muted-foreground">
                                <FileText size={18} />
                                <span className="text-sm font-medium">Order Number</span>
                            </div>
                            <p className="text-lg font-semibold">{delivery.order_number || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Discrepancy Alert */}
                    {Number(delivery.missing_value) > 0 && (
                        <div className="mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-4">
                            <div className="p-2 rounded-full bg-destructive/20">
                                <AlertTriangle className="text-destructive" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-destructive">Discrepancy Reported</h3>
                                <p className="text-sm text-destructive/80 mt-1">
                                    A discrepancy totaling €{Number(delivery.missing_value).toFixed(2)} was detected during verification.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Package size={18} className="text-muted-foreground" />
                                <h2 className="font-semibold">Items</h2>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {delivery.items?.length || 0} items total
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/10 text-muted-foreground">
                                        <th className="text-left py-3 px-6 font-medium">Item Name</th>
                                        <th className="text-center py-3 px-4 font-medium">Ordered</th>
                                        <th className="text-center py-3 px-4 font-medium">Received</th>
                                        <th className="text-center py-3 px-4 font-medium">Status</th>
                                        <th className="text-right py-3 px-6 font-medium">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {delivery.items?.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/5 transition-colors">
                                            <td className="py-4 px-6 font-medium">{item.name}</td>
                                            <td className="py-4 px-4 text-center">
                                                {item.quantity} {item.unit}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {item.received_quantity ?? item.quantity} {item.unit}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {item.status === 'received' ? (
                                                    <div className="flex items-center justify-center gap-1.5 text-success">
                                                        <CheckCircle2 size={14} />
                                                        <span>Received</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1.5 text-destructive underline decoration-dotted">
                                                        <AlertTriangle size={14} />
                                                        <span>{item.missing_quantity} Missing</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right font-mono">
                                                €{Number(item.total_price).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted/20 border-t border-border">
                                        <td colSpan={4} className="py-4 px-6 text-right font-medium">Total Value</td>
                                        <td className="py-4 px-6 text-right font-bold text-lg">
                                            €{Number(delivery.total_value).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        {delivery.status === 'draft' && (
                            <Button onClick={() => navigate(`/verify-delivery/${delivery.id}`)}>
                                Continue Verification
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => navigate('/deliveries')}>
                            Back to List
                        </Button>
                    </div>
                </div>
            </MainContent>
        </AppLayout>
    );
}
