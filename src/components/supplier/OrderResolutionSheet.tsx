import { useState, useEffect } from 'react';
import { Truck, Package, Check, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useResolveReport, useSupplierReportDetails, type MissingItemsReportWithRestaurant } from '@/hooks/useSupplierReports';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OrderResolutionSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    report: MissingItemsReportWithRestaurant | null;
}

export function OrderResolutionSheet({
    open,
    onOpenChange,
    report,
}: OrderResolutionSheetProps) {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [deliveryDate, setDeliveryDate] = useState<string>(
        format(new Date(), 'yyyy-MM-dd')
    );
    const [notes, setNotes] = useState('');
    const resolveReport = useResolveReport();

    // Fetch the full report details including items
    const { data: reportDetails, isLoading: isLoadingDetails } = useSupplierReportDetails(
        open ? report?.id : undefined
    );

    // Use fetched items if available, otherwise fall back to report.items
    const items = reportDetails?.items || report?.items || [];

    // Auto-select all missing items when the items are loaded
    useEffect(() => {
        if (open && items.length > 0 && selectedItems.length === 0) {
            setSelectedItems(items.map((item) => item.id));
        } else if (!open) {
            // Reset selection when sheet closes
            setSelectedItems([]);
            setNotes('');
        }
    }, [open, items, selectedItems.length]);

    if (!report) return null;

    const toggleItem = (itemId: string) => {
        setSelectedItems((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId]
        );
    };

    const toggleAll = () => {
        if (selectedItems.length === items.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(items.map((item) => item.id));
        }
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item to redeliver');
            return;
        }

        try {
            const selectedItemNames = items
                .filter((item) => selectedItems.includes(item.id))
                .map((item) => `${item.item_name} (${item.missing_quantity} ${item.unit || 'units'})`)
                .join(', ');

            const resolutionNote = `Redelivery scheduled for ${format(new Date(deliveryDate), 'MMM d, yyyy')}. Items: ${selectedItemNames}${notes ? `. Notes: ${notes}` : ''}`;

            await resolveReport.mutateAsync({
                reportId: report.id,
                resolutionType: 'redelivery_scheduled',
                note: resolutionNote,
            });

            toast.success('Redelivery scheduled successfully');
            onOpenChange(false);
            setSelectedItems([]);
            setNotes('');
        } catch {
            toast.error('Failed to schedule redelivery');
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[#009EE0]" />
                        Schedule Redelivery
                    </SheetTitle>
                    <SheetDescription>
                        Select the items to redeliver to {reportDetails?.restaurant?.name || report.restaurant?.name || 'the restaurant'}
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    {/* Delivery Date */}
                    <div className="space-y-2">
                        <Label htmlFor="delivery-date" className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Redelivery Date
                        </Label>
                        <Input
                            id="delivery-date"
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            min={format(new Date(), 'yyyy-MM-dd')}
                        />
                    </div>

                    {/* Items Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Items to Redeliver
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleAll}
                                className="text-xs"
                            >
                                {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>

                        {isLoadingDetails ? (
                            <div className="flex items-center justify-center p-8 bg-muted/30 rounded-lg">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : items.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Missing Qty</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className="cursor-pointer hover:bg-muted/30"
                                                onClick={() => toggleItem(item.id)}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedItems.includes(item.id)}
                                                        onCheckedChange={() => toggleItem(item.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {item.item_name}
                                                </TableCell>
                                                <TableCell className="text-right text-red-600">
                                                    {item.missing_quantity} {item.unit || ''}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                                No specific items listed in this report
                            </p>
                        )}

                        {selectedItems.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                {selectedItems.length} of {items.length} items selected for redelivery
                            </p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Additional Notes (optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any notes for the delivery driver or restaurant..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <SheetFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={resolveReport.isPending || selectedItems.length === 0 || isLoadingDetails}
                        className="bg-[#009EE0] hover:bg-[#0088C4]"
                    >
                        {resolveReport.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Check className="w-4 h-4 mr-2" />
                        )}
                        Schedule Redelivery
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
