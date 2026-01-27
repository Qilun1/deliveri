import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, ChevronDown, ChevronUp, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ScannedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  receivedQuantity: number | null;
  missingQuantity: number | null;
  status: 'pending' | 'received' | 'missing';
  note?: string;
}

interface ScannedItemsTableProps {
  items: ScannedItem[];
  onItemsChange: (items: ScannedItem[]) => void;
  editable?: boolean;
}

export function ScannedItemsTable({ items, onItemsChange, editable = true }: ScannedItemsTableProps) {
  const [expandedMissingId, setExpandedMissingId] = useState<string | null>(null);
  const [missingInputValues, setMissingInputValues] = useState<Record<string, string>>({});
  const [verifiedExpanded, setVerifiedExpanded] = useState(false);

  const updateItem = (id: string, updates: Partial<ScannedItem>) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onItemsChange(newItems);
  };

  const handleMarkReceived = (item: ScannedItem) => {
    updateItem(item.id, {
      status: 'received',
      receivedQuantity: item.quantity,
      missingQuantity: null
    });
    toast.success('Item verified');
  };

  const handleMarkMissingStart = (item: ScannedItem) => {
    setExpandedMissingId(item.id);
    setMissingInputValues(prev => ({
      ...prev,
      [item.id]: item.quantity.toString()
    }));
  };

  const handleMarkMissingConfirm = (item: ScannedItem) => {
    const inputValue = parseFloat(missingInputValues[item.id]);

    if (isNaN(inputValue) || inputValue < 0) return;

    if (inputValue === 0) {
      // Treated as fully received
      handleMarkReceived(item);
    } else {
      // Capped at max quantity
      const finalMissing = Math.min(inputValue, item.quantity);

      updateItem(item.id, {
        status: 'missing',
        missingQuantity: finalMissing,
        receivedQuantity: item.quantity - finalMissing
      });
    }

    setExpandedMissingId(null);
  };

  const handleUndo = (item: ScannedItem) => {
    updateItem(item.id, {
      status: 'pending',
      receivedQuantity: null,
      missingQuantity: null
    });
    toast('Item moved back to verification');
  };

  const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'missing');
  const verifiedItems = items.filter(i => i.status === 'received');

  const getMissingValue = () => {
    return items.reduce((total, item) => {
      if (item.status === 'missing' && item.missingQuantity) {
        return total + (item.missingQuantity * item.pricePerUnit);
      }
      return total;
    }, 0);
  };

  const getVerifiedCount = () => {
    return items.filter((item) => item.status !== 'pending').length;
  };

  const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const missingValue = getMissingValue();

  // Helper to render a row content (shared between main list and missing state)
  const renderRowContent = (item: ScannedItem, isMobile = false) => {
    const isMissingInputExpanded = expandedMissingId === item.id;
    const isMissingConfigured = item.status === 'missing';

    return (
      <>
        {/* Desktop Columns */}
        {!isMobile && (
          <>
            <td className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{item.name}</span>
                {item.note && (
                  <span className="text-xs text-muted-foreground italic">({item.note})</span>
                )}
              </div>
            </td>
            <td className="p-4 text-center">
              <span className="font-mono text-foreground">{item.quantity}</span>
            </td>
            <td className="p-4 text-center">
              <span className="text-muted-foreground">{item.unit}</span>
            </td>
            <td className="p-4 text-right">
              <span className="font-mono text-muted-foreground">€{item.pricePerUnit.toFixed(2)}</span>
            </td>
            <td className="p-4 text-right">
              <span className="font-mono font-medium text-foreground">€{item.totalPrice.toFixed(2)}</span>
            </td>
            {editable && (
              <td className="p-4 text-right">

                {isMissingConfigured ? (
                  <div className="flex items-center justify-end gap-2 text-destructive font-medium">
                    <AlertCircle size={16} />
                    <span>{item.missingQuantity} Missing</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 ml-1"
                      onClick={() => handleUndo(item)}
                    >
                      <Undo2 size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-success hover:bg-success/10"
                      onClick={() => handleMarkReceived(item)}
                      title="Mark as received"
                    >
                      <Check size={18} />
                    </Button>

                    <Popover
                      open={isMissingInputExpanded}
                      onOpenChange={(open) => !open && setExpandedMissingId(null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleMarkMissingStart(item)}
                          title="Report missing items"
                        >
                          <X size={18} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="end">
                        <div className="p-4 bg-card border-none">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm">Report Missing Items</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setExpandedMissingId(null)}
                              >
                                <X size={14} />
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max={item.quantity}
                                className="w-full text-center text-lg h-10"
                                value={missingInputValues[item.id] || ''}
                                onChange={(e) => setMissingInputValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                                autoFocus
                              />
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                / {item.quantity} {item.unit}
                              </span>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedMissingId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="bg-destructive hover:bg-destructive/90 text-white"
                                onClick={() => handleMarkMissingConfirm(item)}
                              >
                                Confirm
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </td>
            )}
          </>
        )}

        {/* Mobile View */}
        {isMobile && (
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-foreground">{item.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} {item.unit} @ €{item.pricePerUnit.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold text-foreground">€{item.totalPrice.toFixed(2)}</p>
              </div>
            </div>

            {editable && !isMissingConfigured && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-success/30 text-success hover:bg-success/10 hover:text-success"
                  onClick={() => handleMarkReceived(item)}
                >
                  <Check size={16} className="mr-1" />
                  Received
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleMarkMissingStart(item)}
                >
                  <X size={16} className="mr-1" />
                  Missing
                </Button>
              </div>
            )}

            {isMissingConfigured && (
              <div className="flex items-center justify-between bg-destructive/10 p-2 rounded text-destructive text-sm font-medium">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{item.missingQuantity} Missing</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 hover:bg-destructive/20"
                  onClick={() => handleUndo(item)}
                >
                  Undo
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Mobile-only inline expansion */}
        {isMissingInputExpanded && isMobile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "w-full bg-muted/30 border-t border-border overflow-hidden",
              !isMobile ? "col-span-6" : ""
            )}
          >
            <div className="p-4 flex items-center justify-between gap-4">
              <span className="text-sm font-medium">How many are missing?</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max={item.quantity}
                  className="w-20 h-8 text-center"
                  value={missingInputValues[item.id] || ''}
                  onChange={(e) => setMissingInputValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                />
                <span className="text-sm text-muted-foreground">/ {item.quantity} {item.unit}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedMissingId(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleMarkMissingConfirm(item)}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Desktop Table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 text-sm font-semibold text-foreground">Item</th>
                <th className="text-center p-4 text-sm font-semibold text-foreground">Ordered</th>
                <th className="text-center p-4 text-sm font-semibold text-foreground">Unit</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">Price/Unit</th>
                <th className="text-right p-4 text-sm font-semibold text-foreground">Total</th>
                {editable && (
                  <th className="text-right p-4 text-sm font-semibold text-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {pendingItems.map((item) => (
                  <motion.tr
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'border-b border-border last:border-0 transition-colors',
                      item.status === 'missing' ? 'bg-destructive/5' : 'hover:bg-muted/5'
                    )}
                  >
                    {/* Because tr cannot wrap the motion div cleanly for the expansion, 
                         we might need to render expansion as a separate row or handle inside 
                         but for simple layout using a responsive approach below */}
                    {renderRowContent(item)}
                  </motion.tr>
                ))}
              </AnimatePresence>
              {pendingItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No pending items to verify.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        <AnimatePresence mode="popLayout">
          {pendingItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'rounded-xl border border-border bg-card overflow-hidden',
                item.status === 'missing' && 'border-destructive/30 bg-destructive/5'
              )}
            >
              {renderRowContent(item, true)}
            </motion.div>
          ))}
        </AnimatePresence>
        {pendingItems.length === 0 && (
          <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
            No pending items
          </div>
        )}
      </div>

      {/* Verified Items Section */}
      {verifiedItems.length > 0 && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <button
            onClick={() => setVerifiedExpanded(!verifiedExpanded)}
            className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-success" />
              <span>Verified Items ({verifiedItems.length})</span>
            </div>
            {verifiedExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {verifiedExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="divide-y divide-border">
                  {verifiedItems.map(item => (
                    <div key={item.id} className="p-3 flex items-center justify-between group hover:bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-success">
                          <Check size={14} />
                        </div>
                        <span className="text-sm font-medium">{item.name}</span>
                        <Badge variant="outline" className="text-xs font-normal">
                          {item.quantity} {item.unit}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUndo(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Undo2 size={14} className="mr-1" />
                        Undo
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Summary */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-lg font-semibold text-foreground">{items.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-lg font-semibold text-foreground">
              {getVerifiedCount()} / {items.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Order Total</p>
            <p className="text-lg font-semibold font-mono text-foreground">€{totalValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Missing Value</p>
            <p className={cn(
              'text-lg font-semibold font-mono',
              missingValue > 0 ? 'text-destructive' : 'text-success'
            )}>
              €{missingValue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
