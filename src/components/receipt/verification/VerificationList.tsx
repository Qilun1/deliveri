import { useState, useMemo } from 'react';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScannedItem } from '../ScannedItemsTable';
import { SwipeableItemRow } from './SwipeableItemRow';
import { MissingItemSheet } from './MissingItemSheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VerificationListProps {
    items: ScannedItem[];
    onItemsChange: (items: ScannedItem[]) => void;
    onComplete: () => void;
    pagesCompleted: number;
    totalPages: number;
}

export function VerificationList({
    items,
    onItemsChange,
    onComplete,
    pagesCompleted,
    totalPages
}: VerificationListProps) {
    const [missingSheetItem, setMissingSheetItem] = useState<ScannedItem | null>(null);

    const pendingItems = useMemo(() => items.filter(i => i.status === 'pending'), [items]);
    const receivedItems = useMemo(() => items.filter(i => i.status === 'received'), [items]);
    const missingItems = useMemo(() => items.filter(i => i.status === 'missing'), [items]);

    const updateItem = (id: string, updates: Partial<ScannedItem>) => {
        onItemsChange(items.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const handleVerify = (item: ScannedItem) => {
        updateItem(item.id, {
            status: 'received',
            receivedQuantity: item.quantity,
            missingQuantity: null
        });
        // Optional: play subtle sound or haptic here if requested (User said NO sound/haptic)
    };

    const handleMissingStart = (item: ScannedItem) => {
        if (item.quantity === 1) {
            handleMissingConfirm(item, 1);
        } else {
            setMissingSheetItem(item);
        }
    };

    const handleMissingConfirm = (item: ScannedItem, missingQty: number) => {
        if (missingQty === 0) {
            handleVerify(item);
        } else {
            updateItem(item.id, {
                status: 'missing',
                missingQuantity: missingQty,
                receivedQuantity: item.quantity - missingQty
            });
        }
    };

    const handleUndo = (item: ScannedItem) => {
        updateItem(item.id, {
            status: 'pending',
            receivedQuantity: null,
            missingQuantity: null
        });
    };

    const isScanning = pagesCompleted < totalPages;
    const totalValue = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const totalMissingValue = items.reduce((sum, i) => {
        return i.status === 'missing' && i.missingQuantity
            ? sum + (i.missingQuantity * i.pricePerUnit)
            : sum;
    }, 0);
    const totalReceivedValue = totalValue - totalMissingValue; // Approximately (includes pending as potential received usually, but here verified is strictly verified)

    // Real verified value
    const verifiedValue = receivedItems.reduce((sum, i) => sum + i.totalPrice, 0) +
        missingItems.reduce((sum, i) => sum + ((i.receivedQuantity || 0) * i.pricePerUnit), 0);

    // Format currency
    const format = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);

    return (
        <>
            <div className="pb-40 space-y-8">
                {/* Pending Items */}
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
                        To Verify ({pendingItems.length})
                    </h3>

                    <AnimatePresence mode="popLayout" initial={false}>
                        {pendingItems.map(item => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <SwipeableItemRow
                                    item={item}
                                    onVerify={handleVerify}
                                    onMissing={handleMissingStart}
                                    onUndo={handleUndo}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Loading Indicator */}
                    {isScanning && (
                        <div className="py-4 flex flex-col items-center justify-center text-center animate-pulse">
                            <div className="flex items-center gap-2 text-primary">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm font-medium">Scanning page {pagesCompleted + 1} of {totalPages}...</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">New items will appear above</p>
                        </div>
                    )}

                    {!isScanning && pendingItems.length === 0 && (
                        <div className="py-12 text-center bg-muted/20 border-2 border-dashed border-muted rounded-xl">
                            <CheckCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">All items verified</p>
                        </div>
                    )}
                </div>

                {/* Verified / Missing Sections */}
                {(receivedItems.length > 0 || missingItems.length > 0) && (
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Received */}
                        {receivedItems.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-success uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    Received ({receivedItems.length})
                                </h3>
                                <div className="space-y-1">
                                    {receivedItems.map(item => (
                                        <SwipeableItemRow
                                            key={item.id}
                                            item={item}
                                            onVerify={handleVerify}
                                            onMissing={handleMissingStart}
                                            onUndo={handleUndo}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Missing */}
                        {missingItems.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-destructive uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    Missing ({missingItems.length})
                                </h3>
                                <div className="space-y-1">
                                    {missingItems.map(item => (
                                        <SwipeableItemRow
                                            key={item.id}
                                            item={item}
                                            onVerify={handleVerify}
                                            onMissing={handleMissingStart}
                                            onUndo={handleUndo}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sticky Footer Summary (Clean & Minimal) */}
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-base px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-success font-medium flex items-center gap-2">
                                <CheckCircle size={18} className="fill-success/20" />
                                {receivedItems.length} Received
                            </span>
                            <span className="text-muted-foreground text-sm">
                                ({format(verifiedValue)})
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-destructive font-medium flex items-center gap-2">
                                <AlertTriangle size={18} className="fill-destructive/10" />
                                {missingItems.length} Missing
                            </span>
                            {missingItems.length > 0 && (
                                <span className="text-destructive/80 text-sm">
                                    ({format(totalMissingValue)})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Button Row */}
                    <Button
                        size="lg"
                        className="w-full text-lg h-12 shadow-sm bg-[#009DE0] hover:bg-[#009DE0]/90 text-white border-0"
                        onClick={onComplete}
                        disabled={pendingItems.length > 0}
                    >
                        {pendingItems.length > 0
                            ? `Verify ${pendingItems.length} Remaining Items...`
                            : 'Complete Verification'}
                    </Button>
                </div>
            </div>

            <MissingItemSheet
                isOpen={!!missingSheetItem}
                onClose={() => setMissingSheetItem(null)}
                item={missingSheetItem}
                onConfirm={handleMissingConfirm}
            />
        </>
    );
}
