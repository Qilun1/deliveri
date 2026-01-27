import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  Mail,
  Phone,
  MapPin,
  Building2,
  Star,
  Plus,
  Package,
  AlertTriangle,
  ChevronRight,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { Delivery } from '@/types/delivery';
import { Supplier, SupplierConnection, MissingItemsReport } from '@/types/supplier';
import { useAuth } from '@/contexts/AuthContext';
import { useSupplierConnections } from '@/hooks/useSupplierConnections';
import { useToast } from '@/hooks/use-toast';

// Helper to check if a supplier is Metro-tukku (by name pattern)
const isMetroTukku = (name: string): boolean => {
  return name.toLowerCase().includes('metro') && name.toLowerCase().includes('tukku');
};

// Status badge colors for connection status
const connectionStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

// Status badge colors for missing items reports
const reportStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  acknowledged: { label: 'Acknowledged', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: MessageSquare },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  disputed: { label: 'Disputed', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = useAuthenticatedSupabase();

  // Supplier connections hook
  const {
    connectedSuppliers,
    loadingConnections,
    availableSuppliers,
    loadingAvailable,
    createConnection,
    creatingConnection,
    getSupplierReports,
  } = useSupplierConnections();

  // State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addSupplierSearch, setAddSupplierSearch] = useState('');
  const [supplierDeliveries, setSupplierDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MissingItemsReport | null>(null);

  // Get active connections only for the dropdown
  const activeConnections = useMemo(() => {
    return connectedSuppliers.filter(c => c.status === 'active');
  }, [connectedSuppliers]);

  // Get the currently selected supplier's connection and details
  const selectedConnection = useMemo(() => {
    return connectedSuppliers.find(c => c.supplier_id === selectedSupplierId);
  }, [connectedSuppliers, selectedSupplierId]);

  const selectedSupplier = selectedConnection?.supplier;

  // Get reports for selected supplier
  const selectedSupplierReports = useMemo(() => {
    if (!selectedSupplierId) return [];
    return getSupplierReports(selectedSupplierId);
  }, [selectedSupplierId, getSupplierReports]);

  // Filter connected suppliers by search
  const filteredConnections = useMemo(() => {
    if (!searchQuery) return activeConnections;
    const query = searchQuery.toLowerCase();
    return activeConnections.filter(c =>
      c.supplier?.name?.toLowerCase().includes(query)
    );
  }, [activeConnections, searchQuery]);

  // Group available suppliers
  const groupedAvailableSuppliers = useMemo(() => {
    let filtered = availableSuppliers;
    if (addSupplierSearch) {
      const query = addSupplierSearch.toLowerCase();
      filtered = availableSuppliers.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.address?.toLowerCase().includes(query)
      );
    }

    const majorPartners = filtered.filter(s => s.is_major_tukku);
    const otherSuppliers = filtered.filter(s => !s.is_major_tukku);

    return { majorPartners, otherSuppliers };
  }, [availableSuppliers, addSupplierSearch]);

  // Fetch deliveries for selected supplier
  useEffect(() => {
    const fetchDeliveries = async () => {
      if (!selectedSupplier?.name || !user?.id) {
        setSupplierDeliveries([]);
        return;
      }

      try {
        setLoadingDeliveries(true);
        const { data, error } = await supabase
          .from('deliveries')
          .select('*')
          .eq('user_id', user.id)
          .eq('supplier_name', selectedSupplier.name)
          .order('delivery_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        setSupplierDeliveries(data as Delivery[] || []);
      } catch (err) {
        console.error('Error fetching supplier deliveries:', err);
        setSupplierDeliveries([]);
      } finally {
        setLoadingDeliveries(false);
      }
    };

    fetchDeliveries();
  }, [selectedSupplier?.name, user?.id]);

  // Handle creating a connection
  const handleConnect = async (supplier: Supplier) => {
    const result = await createConnection(supplier.id);

    if (result.success) {
      toast({
        title: 'Connection Request Sent',
        description: `Connection request sent to ${supplier.name}`,
      });
      setAddSupplierOpen(false);
    } else {
      toast({
        title: 'Could not send request',
        description: result.error || 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (loadingConnections) {
    return (
      <AppLayout>
        <MainContent>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#009EE0]" />
          </div>
        </MainContent>
      </AppLayout>
    );
  }

  // Empty state - no suppliers connected
  if (connectedSuppliers.length === 0) {
    return (
      <AppLayout>
        <MainContent>
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">My Suppliers</h1>
              <p className="text-muted-foreground mt-1">
                Connect with suppliers to track deliveries and manage orders
              </p>
            </div>

            {/* Empty State Card */}
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#009EE0]/10 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-[#009EE0]" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Connect with your suppliers
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Start tracking deliveries and managing discrepancies by connecting with your suppliers.
                </p>
                <Button
                  onClick={() => setAddSupplierOpen(true)}
                  className="bg-[#009EE0] hover:bg-[#0080B8] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Connect Supplier
                </Button>
              </CardContent>
            </Card>

            {/* Major Partners Quick-Add */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Suggested Partners
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingAvailable ? (
                  <div className="col-span-full flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  availableSuppliers
                    .filter(s => s.is_major_tukku)
                    .slice(0, 6)
                    .map(supplier => (
                      <SupplierQuickAddCard
                        key={supplier.id}
                        supplier={supplier}
                        onConnect={() => handleConnect(supplier)}
                        isConnecting={creatingConnection}
                      />
                    ))
                )}
              </div>
            </div>

            {/* Add Supplier Sheet */}
            <AddSupplierSheet
              open={addSupplierOpen}
              onOpenChange={setAddSupplierOpen}
              searchQuery={addSupplierSearch}
              onSearchChange={setAddSupplierSearch}
              groupedSuppliers={groupedAvailableSuppliers}
              onConnect={handleConnect}
              isConnecting={creatingConnection}
              isLoading={loadingAvailable}
            />
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">My Suppliers</h1>
            <p className="text-muted-foreground mt-1">
              Manage your supplier connections and track deliveries
            </p>
          </div>

          {/* Supplier Selector */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 flex gap-3">
              {/* Dropdown */}
              <Select
                value={selectedSupplierId || ''}
                onValueChange={(value) => setSelectedSupplierId(value || null)}
              >
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Select a supplier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Active Suppliers</SelectLabel>
                    {filteredConnections.map(connection => (
                      <SelectItem
                        key={connection.id}
                        value={connection.supplier_id}
                        className="flex items-center"
                      >
                        <span className="flex items-center gap-2">
                          {connection.supplier?.name}
                          {connection.supplier?.is_major_tukku && (
                            <Star className="w-3 h-3 text-[#009EE0] fill-[#009EE0]" />
                          )}
                          {isMetroTukku(connection.supplier?.name || '') && (
                            <Badge className="ml-1 text-[10px] bg-[#009EE0]/10 text-[#009EE0] border-[#009EE0]/30">
                              Featured Partner
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Search Filter */}
              <div className="relative flex-1 max-w-xs hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Connect Supplier Button */}
            <Button
              onClick={() => setAddSupplierOpen(true)}
              className="bg-[#009EE0] hover:bg-[#0080B8] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Supplier
            </Button>
          </div>

          {/* Mobile Search */}
          <div className="relative mb-4 sm:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Supplier Detail View */}
          {selectedSupplier ? (
            <div className="space-y-6">
              {/* Supplier Info Card */}
              <Card className={isMetroTukku(selectedSupplier.name) ? 'border-[#009EE0] border-2' : ''}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Logo/Avatar */}
                    <div className="flex-shrink-0">
                      {selectedSupplier.logo_url ? (
                        <img
                          src={selectedSupplier.logo_url}
                          alt={selectedSupplier.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                          isMetroTukku(selectedSupplier.name)
                            ? 'bg-[#009EE0]/10'
                            : 'bg-muted'
                        }`}>
                          <Building2 className={`w-8 h-8 ${
                            isMetroTukku(selectedSupplier.name)
                              ? 'text-[#009EE0]'
                              : 'text-muted-foreground'
                          }`} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            {selectedSupplier.name}
                            {isMetroTukku(selectedSupplier.name) && (
                              <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-[#009EE0] fill-[#009EE0]" />
                                <Badge className="bg-[#009EE0]/10 text-[#009EE0] border-[#009EE0]/30">
                                  Featured Partner
                                </Badge>
                              </span>
                            )}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={connectionStatusConfig[selectedConnection?.status || 'pending'].className}>
                              {connectionStatusConfig[selectedConnection?.status || 'pending'].label}
                            </Badge>
                            {selectedSupplier.is_major_tukku && !isMetroTukku(selectedSupplier.name) && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Major Tukku
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {selectedSupplier.contact_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {selectedSupplier.contact_email}
                          </span>
                        )}
                        {selectedSupplier.contact_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {selectedSupplier.contact_phone}
                          </span>
                        )}
                        {selectedSupplier.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {selectedSupplier.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Past Deliveries Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="w-5 h-5 text-[#009EE0]" />
                    Past Deliveries
                  </CardTitle>
                  <CardDescription>
                    Recent deliveries from {selectedSupplier.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingDeliveries ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : supplierDeliveries.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No deliveries found</p>
                      <Button
                        variant="link"
                        onClick={() => navigate('/extract-receipt')}
                        className="text-[#009EE0] mt-2"
                      >
                        Upload a receipt
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {supplierDeliveries.map(delivery => (
                        <div
                          key={delivery.id}
                          onClick={() => navigate(`/delivery/${delivery.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="font-medium text-foreground">
                              {new Date(delivery.delivery_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {delivery.order_number ? `Order #${delivery.order_number}` : 'No order number'}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {Number(delivery.total_value || 0).toFixed(2)} EUR
                              </p>
                              {Number(delivery.missing_value || 0) > 0 && (
                                <p className="text-sm text-destructive">
                                  -{Number(delivery.missing_value).toFixed(2)} missing
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        className="w-full text-[#009EE0]"
                        onClick={() => navigate(`/deliveries?supplier=${encodeURIComponent(selectedSupplier.name)}`)}
                      >
                        View all deliveries
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Missing Items Reports Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Missing Items Reports
                  </CardTitle>
                  <CardDescription>
                    Track discrepancies and resolutions with {selectedSupplier.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedSupplierReports.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <p className="text-muted-foreground">No missing items reported</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        All deliveries from this supplier are complete
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedSupplierReports.map(report => {
                        const StatusIcon = reportStatusConfig[report.status].icon;
                        return (
                          <div
                            key={report.id}
                            onClick={() => setSelectedReport(report)}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                report.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                report.status === 'acknowledged' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                report.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30' :
                                'bg-red-100 dark:bg-red-900/30'
                              }`}>
                                <StatusIcon className={`w-4 h-4 ${
                                  report.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                                  report.status === 'acknowledged' ? 'text-blue-600 dark:text-blue-400' :
                                  report.status === 'resolved' ? 'text-green-600 dark:text-green-400' :
                                  'text-red-600 dark:text-red-400'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {report.items_count} item{report.items_count !== 1 ? 's' : ''} reported
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(report.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <Badge className={reportStatusConfig[report.status].className}>
                                  {reportStatusConfig[report.status].label}
                                </Badge>
                                <p className="text-sm font-medium text-destructive mt-1">
                                  {report.total_missing_value.toFixed(2)} EUR
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* No Supplier Selected */
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Select a supplier from the dropdown to view details
                </p>
              </CardContent>
            </Card>
          )}

          {/* Add Supplier Sheet */}
          <AddSupplierSheet
            open={addSupplierOpen}
            onOpenChange={setAddSupplierOpen}
            searchQuery={addSupplierSearch}
            onSearchChange={setAddSupplierSearch}
            groupedSuppliers={groupedAvailableSuppliers}
            onConnect={handleConnect}
            isConnecting={creatingConnection}
            isLoading={loadingAvailable}
          />

          {/* Missing Items Report Detail Dialog */}
          <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Missing Items Report</DialogTitle>
                <DialogDescription>
                  Report details and status
                </DialogDescription>
              </DialogHeader>
              {selectedReport && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={reportStatusConfig[selectedReport.status].className}>
                      {reportStatusConfig[selectedReport.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Items Count</span>
                    <span className="font-medium">{selectedReport.items_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Missing Value</span>
                    <span className="font-medium text-destructive">
                      {selectedReport.total_missing_value.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reported On</span>
                    <span className="font-medium">
                      {new Date(selectedReport.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedReport.acknowledged_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Acknowledged On</span>
                      <span className="font-medium">
                        {new Date(selectedReport.acknowledged_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedReport.resolved_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Resolved On</span>
                      <span className="font-medium">
                        {new Date(selectedReport.resolved_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedReport.notes && (
                    <div className="pt-4 border-t">
                      <span className="text-sm text-muted-foreground">Notes</span>
                      <p className="mt-1 text-foreground">{selectedReport.notes}</p>
                    </div>
                  )}
                  {selectedReport.delivery_id && (
                    <Button
                      className="w-full bg-[#009EE0] hover:bg-[#0080B8] text-white"
                      onClick={() => {
                        setSelectedReport(null);
                        navigate(`/delivery/${selectedReport.delivery_id}`);
                      }}
                    >
                      View Delivery
                    </Button>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </MainContent>
    </AppLayout>
  );
}

// Supplier Quick-Add Card Component
interface SupplierQuickAddCardProps {
  supplier: Supplier;
  onConnect: () => void;
  isConnecting: boolean;
}

function SupplierQuickAddCard({ supplier, onConnect, isConnecting }: SupplierQuickAddCardProps) {
  const isMetro = isMetroTukku(supplier.name);

  return (
    <Card className={`hover:shadow-md transition-shadow ${isMetro ? 'border-[#009EE0] border-2' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          {supplier.logo_url ? (
            <img
              src={supplier.logo_url}
              alt={supplier.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isMetro ? 'bg-[#009EE0]/10' : 'bg-muted'
            }`}>
              <Building2 className={`w-6 h-6 ${isMetro ? 'text-[#009EE0]' : 'text-muted-foreground'}`} />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {supplier.name}
              {isMetro && (
                <Star className="w-4 h-4 text-[#009EE0] fill-[#009EE0]" />
              )}
            </h3>
            {isMetro && (
              <Badge className="mt-1 bg-[#009EE0]/10 text-[#009EE0] border-[#009EE0]/30">
                Featured Partner
              </Badge>
            )}
          </div>
        </div>
        <Button
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full bg-[#009EE0] hover:bg-[#0080B8] text-white"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Connect
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Add Supplier Sheet Component
interface AddSupplierSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  groupedSuppliers: {
    majorPartners: Supplier[];
    otherSuppliers: Supplier[];
  };
  onConnect: (supplier: Supplier) => void;
  isConnecting: boolean;
  isLoading: boolean;
}

function AddSupplierSheet({
  open,
  onOpenChange,
  searchQuery,
  onSearchChange,
  groupedSuppliers,
  onConnect,
  isConnecting,
  isLoading,
}: AddSupplierSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[80vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle>Connect with a Supplier</SheetTitle>
          <SheetDescription>
            Choose a supplier to send a connection request
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Supplier List */}
          <ScrollArea className="h-[calc(85vh-200px)] sm:h-[calc(80vh-200px)]">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6 pr-4">
                {/* Major Partners */}
                {groupedSuppliers.majorPartners.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#009EE0]" />
                      Major Partners
                    </h3>
                    <div className="space-y-2">
                      {groupedSuppliers.majorPartners.map(supplier => (
                        <SupplierListItem
                          key={supplier.id}
                          supplier={supplier}
                          onConnect={() => onConnect(supplier)}
                          isConnecting={isConnecting}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Suppliers */}
                {groupedSuppliers.otherSuppliers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Other Suppliers
                    </h3>
                    <div className="space-y-2">
                      {groupedSuppliers.otherSuppliers.map(supplier => (
                        <SupplierListItem
                          key={supplier.id}
                          supplier={supplier}
                          onConnect={() => onConnect(supplier)}
                          isConnecting={isConnecting}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {groupedSuppliers.majorPartners.length === 0 && groupedSuppliers.otherSuppliers.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? `No suppliers found for "${searchQuery}"`
                        : 'No suppliers available'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Supplier List Item Component
interface SupplierListItemProps {
  supplier: Supplier;
  onConnect: () => void;
  isConnecting: boolean;
}

function SupplierListItem({ supplier, onConnect, isConnecting }: SupplierListItemProps) {
  const isMetro = isMetroTukku(supplier.name);

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isMetro ? 'border-[#009EE0] bg-[#009EE0]/5' : 'hover:bg-muted/50'
    }`}>
      <div className="flex items-center gap-3">
        {supplier.logo_url ? (
          <img
            src={supplier.logo_url}
            alt={supplier.name}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isMetro ? 'bg-[#009EE0]/20' : 'bg-muted'
          }`}>
            <Building2 className={`w-5 h-5 ${isMetro ? 'text-[#009EE0]' : 'text-muted-foreground'}`} />
          </div>
        )}
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
            {supplier.name}
            {isMetro && (
              <>
                <Star className="w-3 h-3 text-[#009EE0] fill-[#009EE0]" />
                <Badge className="text-[10px] bg-[#009EE0]/10 text-[#009EE0] border-[#009EE0]/30">
                  Featured Partner
                </Badge>
              </>
            )}
          </p>
          {supplier.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {supplier.address}
            </p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        onClick={onConnect}
        disabled={isConnecting}
        className="bg-[#009EE0] hover:bg-[#0080B8] text-white"
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Connect'
        )}
      </Button>
    </div>
  );
}
