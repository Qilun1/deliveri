import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle, AlertTriangle, Calendar, Building2, FileText, Star, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { ReceiptUploader } from '@/components/receipt/ReceiptUploader';
import { toast } from 'sonner';
import { VerificationList } from '@/components/receipt/verification/VerificationList';
import { ScannedItem } from '@/components/receipt/ScannedItemsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useReceiptImageUpload } from '@/hooks/useReceiptImageUpload';
import { Delivery } from '@/types/delivery';
import { useMissingItemsReport } from '@/hooks/useMissingItemsReport';

// Supplier type for dropdown
interface SupplierOption {
  id: string;
  name: string;
  is_major_tukku: boolean;
  priority_order: number | null;
  is_connected: boolean;
}

type PageStep = 'upload' | 'processing' | 'verify' | 'complete';

interface ScanResult {
  supplier_name: string;
  date: string;
  order_number: string | null;
  items: ScannedItem[];
  totalValue: number;
}

// Moved outside component to prevent recreation on each render
const NON_PRODUCT_PATTERNS = [
  /^debit/i,
  /^credit/i,
  /^veloitus/i,
  /^maksu/i,
  /^yhteensä/i,
  /^summa/i,
  /^alv/i,
  /^vero/i,
  /^total/i,
  /^subtotal/i,
  /^payment/i,
  /^change/i,
  /^cash/i,
  /^card/i,
  /^kortti/i,
  /^käteinen/i,
  /^pankkikortti/i,
  /^luottokortti/i,
  /^vaihtoraha/i,
  /^palvelumaksu/i,
  /^toimitusmaksu/i,
];

const filterNonProducts = (items: ScannedItem[]): ScannedItem[] => {
  return items.filter(item => {
    const name = item.name.toLowerCase().trim();
    return !NON_PRODUCT_PATTERNS.some(pattern => pattern.test(name));
  });
};

export default function UploadReceiptPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { deliveryId } = useParams();
  const supabase = useAuthenticatedSupabase();

  const [step, setStep] = useState<PageStep>('upload');
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingDeliveryId, setExistingDeliveryId] = useState<string | null>(null);

  const [pagesCompleted, setPagesCompleted] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Scan result state
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [items, setItems] = useState<ScannedItem[]>([]);

  // Supplier selection state
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);

  // Hooks
  const { createReport, isCreatingReport } = useMissingItemsReport();
  const { uploadReceiptImage } = useReceiptImageUpload();

  // Real progress based on pages completed + small initial boost for perceived speed
  useEffect(() => {
    if (step === 'processing') {
      if (totalPages === 0) {
        // Initial state - show small progress to indicate work started
        setFakeProgress(10);
      } else {
        // Calculate real progress based on pages completed
        const realProgress = Math.round((pagesCompleted / totalPages) * 100);
        // Add slight boost at start for better perceived performance
        const adjustedProgress = Math.max(10, Math.min(realProgress, 100));
        setFakeProgress(adjustedProgress);
      }
    }
  }, [step, pagesCompleted, totalPages]);

  // Transition to verify when all pages completed
  useEffect(() => {
    if (pagesCompleted > 0 && pagesCompleted === totalPages && step === 'processing') {
      setFakeProgress(100);
      const timer = setTimeout(() => setStep('verify'), 300);
      return () => clearTimeout(timer);
    }
  }, [pagesCompleted, totalPages, step]);

  // Load suppliers for dropdown
  useEffect(() => {
    const loadSuppliers = async () => {
      if (!user?.id) return;

      setIsLoadingSuppliers(true);
      try {
        // Fetch all suppliers
        const { data: allSuppliers, error: suppliersError } = await supabase
          .from('suppliers')
          .select('id, name, is_major_tukku, priority_order')
          .order('priority_order', { ascending: true, nullsFirst: false })
          .order('name', { ascending: true });

        if (suppliersError) throw suppliersError;

        // Fetch connected suppliers for this restaurant
        const { data: connections, error: connectionsError } = await supabase
          .from('restaurant_supplier_connections')
          .select('supplier_id')
          .eq('restaurant_id', user.id)
          .eq('status', 'active');

        if (connectionsError) throw connectionsError;

        const connectedIds = new Set((connections || []).map(c => c.supplier_id));

        // Map suppliers with connection status
        const supplierOptions: SupplierOption[] = (allSuppliers || []).map(s => ({
          id: s.id,
          name: s.name,
          is_major_tukku: s.is_major_tukku || false,
          priority_order: s.priority_order,
          is_connected: connectedIds.has(s.id),
        }));

        // Sort: connected first, then major tukkus, then by priority/name
        supplierOptions.sort((a, b) => {
          if (a.is_connected !== b.is_connected) return a.is_connected ? -1 : 1;
          if (a.is_major_tukku !== b.is_major_tukku) return a.is_major_tukku ? -1 : 1;
          if (a.priority_order !== b.priority_order) {
            if (a.priority_order === null) return 1;
            if (b.priority_order === null) return -1;
            return a.priority_order - b.priority_order;
          }
          return a.name.localeCompare(b.name);
        });

        setSuppliers(supplierOptions);
      } catch (err) {
        console.error('Error loading suppliers:', err);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, [user?.id, supabase]);

  // Load existing delivery if deliveryId is provided
  useEffect(() => {
    const loadDelivery = async () => {
      if (!deliveryId) return;

      try {
        setIsProcessing(true);
        // Fetch delivery
        const { data: delivery, error: deliveryError } = await supabase
          .from('deliveries')
          .select('*')
          .eq('id', deliveryId)
          .single();

        if (deliveryError) throw deliveryError;

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from('delivery_items')
          .select('*')
          .eq('delivery_id', deliveryId);

        if (itemsError) throw itemsError;

        // Populate state
        setExistingDeliveryId(delivery.id);
        setSupplierName(delivery.supplier_name);
        setDeliveryDate(delivery.delivery_date);
        setOrderNumber(delivery.order_number || '');

        // Map DB items to ScannedItem type
        const mappedItems: ScannedItem[] = (itemsData || []).map(item => ({
          id: item.id,
          name: item.name,
          quantity: Number(item.quantity),
          unit: item.unit,
          pricePerUnit: Number(item.price_per_unit),
          totalPrice: Number(item.total_price),
          receivedQuantity: item.received_quantity ? Number(item.received_quantity) : undefined,
          missingQuantity: item.missing_quantity ? Number(item.missing_quantity) : undefined,
          status: item.status as 'pending' | 'received' | 'missing'
        }));

        setItems(mappedItems);
        setStep('verify');

      } catch (err) {
        console.error('Error loading delivery:', err);
        toast.error('Failed to load delivery');
        navigate('/dashboard');
      } finally {
        setIsProcessing(false);
      }
    };

    loadDelivery();
  }, [deliveryId, navigate, supabase]);

  if (!user) return null;


  const handleFileSelect = async (file: File, base64: string | string[]) => {
    setError(null);
    setIsProcessing(true);
    setStep('processing');

    // Reset state
    setItems([]);
    setPagesCompleted(0);
    setTotalPages(0);
    setScanResult(null);
    setReceiptImageUrl(null);

    // Upload receipt image to storage first (non-blocking on failure)
    try {
      const result = await uploadReceiptImage(file);
      setReceiptImageUrl(result.publicUrl);
    } catch (err) {
      console.warn('Could not save receipt image to storage:', err);
      toast.warning('Could not save receipt image', {
        description: 'Verification will continue, but image won\'t be saved for reference',
      });
      // Continue with AI processing anyway
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      setError('Supabase URL not configured');
      setIsProcessing(false);
      setStep('upload');
      return;
    }

    const images = Array.isArray(base64) ? base64 : [base64];
    const totalCount = images.length;
    setTotalPages(totalCount);

    // Helper to process a single page
    const processPage = async (imgBase64: string, index: number) => {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/extract-receipt`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
            },
            body: JSON.stringify({
              imageBase64: imgBase64,
            }),
          }
        );

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || `Failed to process page ${index + 1}`);
        }

        const data = result.data;

        // Filter out non-product items using module-level function
        const filteredRawItems = filterNonProducts(data.items || []);

        // Add new items with unique IDs based on page index
        const newItems = filteredRawItems.map((item: ScannedItem, i: number) => ({
          ...item,
          id: `page${index}-item-${i}`
        }));

        setItems(prevItems => [...prevItems, ...newItems]);

        // Update header info from first page
        if (index === 0) {
          const extractedSupplierName = data.supplier_name || '';
          setSupplierName(extractedSupplierName);
          setDeliveryDate(data.date || new Date().toISOString().split('T')[0]);
          setOrderNumber(data.order_number || `INV-${Date.now()}`);

          // Auto-match supplier from extracted name
          if (extractedSupplierName && suppliers.length > 0) {
            const normalizedName = extractedSupplierName.toLowerCase().trim();
            const matchedSupplier = suppliers.find(s =>
              s.name.toLowerCase().includes(normalizedName) ||
              normalizedName.includes(s.name.toLowerCase())
            );
            if (matchedSupplier) {
              setSelectedSupplierId(matchedSupplier.id);
            }
          }
        }

        return { success: true, data };
      } catch (err) {
        console.error(`Page ${index + 1} failed:`, err);
        return { success: false, error: err };
      } finally {
        setPagesCompleted(prev => prev + 1);
      }
    };

    // Trigger all pages
    const promises = images.map((img, idx) => processPage(img, idx));
    const results = await Promise.all(promises);

    setIsProcessing(false);

    const successfulCount = results.filter(r => r.success).length;

    if (successfulCount === 0) {
      setError('Failed to process any pages');
      setStep('upload');
      toast.error('Scan failed', { description: 'Could not process the receipt' });
    } else {
      const msg = successfulCount === totalCount
        ? 'Receipt scanned successfully!'
        : `Scanned ${successfulCount} of ${totalCount} pages`;

      toast.success(msg, {
        description: `Found items from ${successfulCount} pages`,
      });
    }
  };

  // Memoize missing value calculation to prevent recalculation on every render
  const missingValue = useMemo(() => {
    return items.reduce((total, item) => {
      if (item.status === 'missing' && item.missingQuantity) {
        return total + (item.missingQuantity * item.pricePerUnit);
      }
      return total;
    }, 0);
  }, [items]);

  const saveDelivery = async (
    targetStatus: 'complete' | 'pending_redelivery' | 'draft',
    overrides?: {
      supplierName?: string;
      deliveryDate?: string;
      orderNumber?: string;
      items?: ScannedItem[];
    }
  ) => {
    // Current state values
    const currentItems = overrides?.items || items;
    const currentSupplierName = overrides?.supplierName ?? supplierName;
    const currentDeliveryDate = overrides?.deliveryDate ?? deliveryDate;
    const currentOrderNumber = overrides?.orderNumber ?? orderNumber;

    // Calculate totals
    const totalValue = currentItems.reduce((sum, item) => sum + (item.totalPrice || (item.pricePerUnit * item.quantity)), 0);
    const missingValue = currentItems.reduce((total, item) => {
      if (item.status === 'missing' && item.missingQuantity) {
        return total + (item.missingQuantity * item.pricePerUnit);
      }
      return total;
    }, 0);

    const finalStatus = targetStatus === 'complete' && missingValue > 0 ? 'pending_redelivery' : targetStatus;

    // Prepare Delivery Header
    const deliveryPayload = {
      ...(existingDeliveryId ? { id: existingDeliveryId } : {}),
      restaurant_id: user.id,
      user_id: user.id,
      supplier_name: currentSupplierName,
      supplier_id: selectedSupplierId || null,
      delivery_date: currentDeliveryDate,
      order_number: currentOrderNumber,
      total_value: totalValue,
      missing_value: missingValue,
      status: finalStatus,
      receipt_image_url: receiptImageUrl,
    };

    // Upsert Delivery
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('deliveries')
      .upsert(deliveryPayload)
      .select()
      .single();

    if (deliveryError) throw deliveryError;

    const newDeliveryId = deliveryData.id;
    setExistingDeliveryId(newDeliveryId);

    // Prepare Delivery Items
    const itemsPayload = currentItems.map(item => ({
      delivery_id: newDeliveryId,
      name: item.name || 'Unknown Item',
      quantity: item.quantity,
      unit: item.unit || 'unit',
      price_per_unit: item.pricePerUnit,
      total_price: item.totalPrice || (item.pricePerUnit * item.quantity),
      received_quantity: item.receivedQuantity ?? item.quantity,
      missing_quantity: item.missingQuantity || 0,
      status: item.status
    }));

    // Delete existing items for this delivery to ensure clean state (sync)
    const { error: deleteError } = await supabase
      .from('delivery_items')
      .delete()
      .eq('delivery_id', newDeliveryId);

    if (deleteError) throw deleteError;

    // Insert Items
    const { error: insertError } = await supabase
      .from('delivery_items')
      .insert(itemsPayload);

    if (insertError) throw insertError;

    return { deliveryId: newDeliveryId, missingValue };
  };

  const handleSaveDraft = async () => {
    try {
      setIsProcessing(true);
      await saveDelivery('draft');
      toast.success('Draft saved successfully');
      navigate('/dashboard');
    } catch (err) {
      console.error('Save draft error:', err);
      toast.error('Failed to save draft');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    // Check if all items are verified
    const unverifiedCount = items.filter((item) => item.status === 'pending').length;
    if (unverifiedCount > 0) {
      toast.error('Please verify all items', {
        description: `${unverifiedCount} item(s) still pending verification`,
      });
      return;
    }

    // Check if supplier is selected (required for report creation)
    if (!selectedSupplierId) {
      toast.error('Please select a supplier', {
        description: 'Supplier selection is required to complete verification',
      });
      return;
    }

    try {
      setIsProcessing(true);
      const { deliveryId: savedDeliveryId, missingValue } = await saveDelivery('complete');

      // Check for missing items and create report if any exist
      const missingItems = items.filter(
        item => item.status === 'missing' && item.missingQuantity && item.missingQuantity > 0
      );

      if (missingItems.length > 0 && selectedSupplierId) {
        try {
          // Create missing items report
          const reportResult = await createReport({
            deliveryId: savedDeliveryId,
            supplierId: selectedSupplierId,
            missingItems: missingItems.map(item => ({
              item_name: item.name,
              expected_quantity: item.quantity,
              received_quantity: item.receivedQuantity ?? 0,
              missing_quantity: item.missingQuantity ?? 0,
              unit: item.unit || null,
              price_per_unit: item.pricePerUnit,
            })),
          });

          setCreatedReportId(reportResult.report.id);

          const supplierOption = suppliers.find(s => s.id === selectedSupplierId);
          toast.success('Missing items report sent!', {
            description: `${missingItems.length} item(s) (${missingValue.toFixed(2)}) reported to ${supplierOption?.name || 'supplier'}`,
          });
        } catch (reportErr) {
          console.error('Error creating missing items report:', reportErr);
          toast.error('Verification saved, but failed to send report', {
            description: 'The delivery was saved but the missing items report could not be created',
          });
        }
      }

      setStep('complete');

      if (missingValue > 0) {
        toast.success('Verification complete!', {
          description: `Discrepancy of ${missingValue.toFixed(2)} reported to supplier`,
        });
      } else {
        toast.success('Delivery verified!', {
          description: 'All items received correctly',
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save verification', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToUpload = () => {
    setStep('upload');
    setItems([]);
    setError(null);
    setExistingDeliveryId(null);
    setReceiptImageUrl(null);
  };

  return (
    <AppLayout>
      <MainContent>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {step === 'upload' && 'Upload Receipt'}
                {step === 'processing' && 'Processing Receipt'}
                {step === 'verify' && 'Verify Delivery'}
                {step === 'complete' && 'Verification Complete'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {step === 'upload' && 'Upload a receipt image or PDF to get started'}
                {step === 'processing' && 'AI is extracting items from your receipt...'}
                {step === 'verify' && 'Review and verify the items you received'}
                {step === 'complete' && 'Your delivery has been verified'}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Upload Step */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto"
              >
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                    <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-medium text-destructive">Error processing receipt</p>
                      <p className="text-sm text-destructive/80 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                <ReceiptUploader onFileSelect={handleFileSelect} disabled={isProcessing} />
              </motion.div>
            )}

            {/* Processing Step */}
            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-24"
              >
                <div className="relative mb-8">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                </div>

                <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mb-2 relative">
                  <motion.div
                    className="absolute top-0 bottom-0 left-0 bg-primary h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${fakeProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>

                <div className="flex items-center justify-between w-64 mb-6 text-xs text-muted-foreground font-mono">
                  <span>{totalPages > 1 ? `Page ${pagesCompleted + 1} of ${totalPages}` : 'Analyzing...'}</span>
                  <span>{fakeProgress}%</span>
                </div>

                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {items.length > 0 ? `Found ${items.length} items...` : 'Scanning receipt...'}
                </h2>
                <p className="text-muted-foreground text-center max-w-md">
                  {totalPages > 1 ? 'Processing multiple pages' : 'Extracting product information'}
                </p>
              </motion.div>
            )}

            {/* Verify Step */}
            {step === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Delivery Info */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Delivery Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Supplier Selection Dropdown */}
                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2">
                        <Building2 size={16} className="text-muted-foreground" />
                        Which supplier is this delivery from? <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={selectedSupplierId}
                        onValueChange={(value) => {
                          setSelectedSupplierId(value);
                          const selected = suppliers.find(s => s.id === value);
                          if (selected) setSupplierName(selected.name);
                        }}
                      >
                        <SelectTrigger className={!selectedSupplierId ? 'border-destructive/50' : ''}>
                          <SelectValue placeholder={isLoadingSuppliers ? 'Loading suppliers...' : 'Select a supplier'} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Connected Suppliers */}
                          {suppliers.some(s => s.is_connected) && (
                            <>
                              <SelectGroup>
                                <SelectLabel>Your Connected Suppliers</SelectLabel>
                                {suppliers.filter(s => s.is_connected).map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    <span className="flex items-center gap-2">
                                      {s.name}
                                      <Badge variant="outline" className="text-xs">Connected</Badge>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                              <SelectSeparator />
                            </>
                          )}

                          {/* Featured Partner - Metro-tukku */}
                          {suppliers.some(s => s.name.toLowerCase().includes('metro')) && (
                            <>
                              <SelectGroup>
                                <SelectLabel className="flex items-center gap-1">
                                  <Star size={12} className="text-yellow-500" />
                                  Featured Partner
                                </SelectLabel>
                                {suppliers.filter(s => s.name.toLowerCase().includes('metro')).map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    <span className="flex items-center gap-2">
                                      {s.name}
                                      <Badge className="bg-yellow-500/10 text-yellow-600 text-xs">Featured</Badge>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                              <SelectSeparator />
                            </>
                          )}

                          {/* Major Tukkus */}
                          {suppliers.some(s => s.is_major_tukku && !s.is_connected && !s.name.toLowerCase().includes('metro')) && (
                            <>
                              <SelectGroup>
                                <SelectLabel>Major Suppliers</SelectLabel>
                                {suppliers
                                  .filter(s => s.is_major_tukku && !s.is_connected && !s.name.toLowerCase().includes('metro'))
                                  .map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                              </SelectGroup>
                              <SelectSeparator />
                            </>
                          )}

                          {/* Other Suppliers */}
                          <SelectGroup>
                            <SelectLabel>All Suppliers</SelectLabel>
                            {suppliers
                              .filter(s => !s.is_connected && !s.is_major_tukku)
                              .map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {!selectedSupplierId && (
                        <p className="text-xs text-destructive">Required - select the supplier for this delivery</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar size={16} className="text-muted-foreground" />
                        Delivery Date
                      </Label>
                      <Input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText size={16} className="text-muted-foreground" />
                        Order Number
                      </Label>
                      <Input
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="INV-XXXX"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Verify Items ({items.length})
                  </h2>
                  <VerificationList
                    items={items}
                    onItemsChange={setItems}
                    onComplete={handleComplete}
                    pagesCompleted={pagesCompleted}
                    totalPages={totalPages}
                  />
                </div>
              </motion.div>
            )}

            {/* Complete Step */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-6">
                  <CheckCircle className="w-12 h-12 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Verification Complete!
                </h2>
                <p className="text-muted-foreground text-center max-w-md mb-2">
                  Your delivery from <span className="font-medium text-foreground">{supplierName}</span> has been verified.
                </p>

                {missingValue > 0 ? (
                  <div className="bg-destructive/10 rounded-xl p-4 mt-4 mb-8 text-center">
                    <p className="text-sm text-destructive">Discrepancy Reported</p>
                    <p className="text-2xl font-bold font-mono text-destructive">
                      {missingValue.toFixed(2)}
                    </p>
                    <p className="text-xs text-destructive/80 mt-1">
                      Missing items report sent to {suppliers.find(s => s.id === selectedSupplierId)?.name || 'supplier'}
                    </p>
                    {createdReportId && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 text-destructive"
                        onClick={() => navigate(`/reports/${createdReportId}`)}
                      >
                        <ExternalLink size={14} className="mr-1" />
                        View Report Details
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="bg-success/10 rounded-xl p-4 mt-4 mb-8 text-center">
                    <p className="text-sm text-success">All Items Received</p>
                    <p className="text-lg font-medium text-success">
                      No discrepancies found
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleBackToUpload}>
                    Scan Another Receipt
                  </Button>
                  <Button onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MainContent>
    </AppLayout>
  );
}
