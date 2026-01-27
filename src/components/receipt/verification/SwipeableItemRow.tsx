import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Check, X, GripVertical, AlertCircle, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScannedItem } from '../ScannedItemsTable';

interface SwipeableItemRowProps {
    item: ScannedItem;
    onVerify: (item: ScannedItem) => void;
    onMissing: (item: ScannedItem) => void;
    onUndo: (item: ScannedItem) => void;
    isMobile?: boolean;
}

export function SwipeableItemRow({
    item,
    onVerify,
    onMissing,
    onUndo,
    isMobile = false
}: SwipeableItemRowProps) {
    const controls = useAnimation();
    const x = useMotionValue(0);
    const bgOpacity = useTransform(x, [-100, -50, 0, 50, 100], [1, 0, 0, 0, 1]);
    const [isDragging, setIsDragging] = useState(false);

    // Background colors based on drag direction
    const bgColor = useTransform(x, (value) => {
        if (value > 0) return 'rgba(34, 197, 94, 0.2)'; // Green for verify (right)
        if (value < 0) return 'rgba(239, 68, 68, 0.2)'; // Red for missing (left)
        return 'transparent';
    });

    const borderColor = useTransform(x, (value) => {
        if (value > 0) return 'rgba(34, 197, 94, 0.5)';
        if (value < 0) return 'rgba(239, 68, 68, 0.5)';
        return 'transparent';
    });

    const handleDragEnd = async (_: unknown, info: PanInfo) => {
        setIsDragging(false);
        const offset = info.offset.x;
        const threshold = 100; // Drag threshold

        if (offset > threshold) {
            // Swiped Right -> Verify
            await controls.start({ x: 500, opacity: 0 }); // Slide out
            onVerify(item);
        } else if (offset < -threshold) {
            // Swiped Left -> Missing
            // Return to center first to show modal logic if needed, 
            // or slide out depending on UX. The request implies "Missing" triggers a popup.
            // Usually better to snap back to center THEN show popup, OR show popup then act.
            // Let's snap back for the missing flow so the user can interact with the row/modal context if needed,
            // or if the plan says "row moves to missing section" immediately.
            // Instructions: "Swipe LEFT -> ❌ Missing (triggers quantity popup)"
            // Let's snap back, then trigger logic.
            await controls.start({ x: 0 });
            onMissing(item);
        } else {
            // Snap back
            controls.start({ x: 0 });
        }
    };

    const formattedTotal = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(item.totalPrice);

    const statusColor =
        item.status === 'received' ? 'bg-success/5 border-success/30' :
            item.status === 'missing' ? 'bg-destructive/5 border-destructive/30' :
                'bg-card border-border';

    // If item is already verified/missing, show simplified "Undo" row
    if (item.status !== 'pending') {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                    "relative border rounded-xl overflow-hidden mb-2 transition-colors",
                    statusColor
                )}
            >
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            item.status === 'received' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        )}>
                            {item.status === 'received' ? <Check size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            {item.status === 'missing' && (
                                <p className="text-sm text-destructive font-medium">
                                    {(item.missingQuantity === item.quantity || item.quantity === 1)
                                        ? "Missing"
                                        : `${item.missingQuantity} of ${item.quantity} ${item.unit} missing`}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onUndo(item)} className="text-muted-foreground hover:text-foreground">
                        <Undo2 size={16} className="mr-2" />
                        Undo
                    </Button>
                </div>
            </motion.div>
        );
    }

    // Pending State (Swipeable)
    return (
        <div className="relative mb-3 touch-pan-y">
            {/* Background Layer with Icons */}
            <motion.div
                className="absolute inset-0 rounded-xl flex items-center justify-between px-6 pointer-events-none"
                style={{ backgroundColor: bgColor, borderColor: borderColor, borderWidth: 1, borderStyle: 'solid' }}
            >
                <motion.div style={{ opacity: bgOpacity }} className="flex items-center gap-2 text-success font-bold">
                    <Check size={24} />
                    <span>Received</span>
                </motion.div>
                <motion.div style={{ opacity: bgOpacity }} className="flex items-center gap-2 text-destructive font-bold">
                    <span>Missing</span>
                    <X size={24} />
                </motion.div>
            </motion.div>

            {/* Foreground Swipeable Card */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x, touchAction: 'pan-y' }}
                whileTap={{ scale: 0.98 }}
                className="relative bg-card border border-border rounded-xl shadow-sm z-10 overflow-hidden"
            >
                <div className="p-4 flex items-center gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{item.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{item.quantity} {item.unit}</span>
                            <span>×</span>
                            <span>€{item.pricePerUnit.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                        <p className="font-mono font-bold text-foreground">{formattedTotal}</p>
                    </div>

                    {/* Drag Handle (Desktop) */}
                    <div className="hidden md:flex text-muted-foreground/30 cursor-grab active:cursor-grabbing">
                        <GripVertical size={20} />
                    </div>
                </div>

                {/* Hover Actions (Desktop Only) */}
                {!isMobile && !isDragging && (
                    <div className="absolute inset-0 bg-background/80 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[1px]">
                        <Button
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                            onClick={() => onMissing(item)}
                        >
                            <X size={16} className="mr-2" />
                            Missing
                        </Button>
                        <Button
                            className="bg-success hover:bg-success/90 text-white shadow-sm"
                            onClick={() => onVerify(item)}
                        >
                            <Check size={16} className="mr-2" />
                            Received
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
