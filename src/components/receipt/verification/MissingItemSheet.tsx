import { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { ScannedItem } from '../ScannedItemsTable';

interface MissingItemSheetProps {
    isOpen: boolean;
    onClose: () => void;
    item: ScannedItem | null;
    onConfirm: (item: ScannedItem, missingQuantity: number) => void;
}

export function MissingItemSheet({
    isOpen,
    onClose,
    item,
    onConfirm,
}: MissingItemSheetProps) {
    const [quantity, setQuantity] = useState<number>(0);

    useEffect(() => {
        if (isOpen && item) {
            // Default to 1 missing if none set, or current missing amount
            setQuantity(item.missingQuantity || 1);
        }
    }, [isOpen, item]);

    if (!item) return null;

    const handleConfirm = () => {
        onConfirm(item, quantity);
        onClose();
    };

    const setFull = () => setQuantity(item.quantity);

    const increment = () => setQuantity(Math.min(quantity + 1, item.quantity));
    const decrement = () => setQuantity(Math.max(quantity - 1, 0));

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle>Report Missing Items</DrawerTitle>
                        <DrawerDescription>
                            How many <span className="font-medium text-foreground">{item.name}</span> are missing?
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 space-y-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={decrement}
                                    className="h-12 w-12 rounded-full"
                                >
                                    <Minus size={20} />
                                </Button>

                                <div className="text-center">
                                    <div className="text-5xl font-bold font-mono tracking-tighter">
                                        {quantity}
                                    </div>
                                    <div className="text-muted-foreground text-sm mt-1">
                                        / {item.quantity} {item.unit}
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={increment}
                                    className="h-12 w-12 rounded-full"
                                >
                                    <Plus size={20} />
                                </Button>
                            </div>
                        </div>

                        {/* Quick Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 3, 6].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    onClick={() => setQuantity(Math.min(quantity + num, item.quantity))}
                                    disabled={quantity >= item.quantity}
                                    className="h-12"
                                >
                                    +{num}
                                </Button>
                            ))}
                            <Button
                                variant={quantity === item.quantity ? 'default' : 'outline'}
                                onClick={setFull}
                                className="h-12"
                            >
                                All
                            </Button>
                        </div>
                    </div>

                    <DrawerFooter>
                        <Button onClick={handleConfirm} size="lg" className="w-full">
                            Confirm {quantity} Missing
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" className="w-full">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
