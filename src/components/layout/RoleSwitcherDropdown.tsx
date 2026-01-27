import { useNavigate } from 'react-router-dom';
import { Store, Truck, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserRole } from '@/contexts/UserRoleContext';

export function RoleSwitcherDropdown() {
    const navigate = useNavigate();
    const { activeRole, switchRole } = useUserRole();

    const handleSwitch = (role: 'restaurant' | 'supplier') => {
        if (role === activeRole) return;

        switchRole(role);

        // Navigate to the appropriate dashboard
        if (role === 'restaurant') {
            navigate('/dashboard');
        } else {
            navigate('/supplier/dashboard');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 min-w-[140px] justify-between border-border"
                >
                    <span className="flex items-center gap-2">
                        {activeRole === 'restaurant' ? (
                            <>
                                <Store className="w-4 h-4 text-[#009EE0]" />
                                <span>Restaurant</span>
                            </>
                        ) : (
                            <>
                                <Truck className="w-4 h-4 text-[#00d4aa]" />
                                <span>Supplier</span>
                            </>
                        )}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem
                    onClick={() => handleSwitch('restaurant')}
                    className="cursor-pointer"
                >
                    <Store className="w-4 h-4 mr-2 text-[#009EE0]" />
                    <span className="flex-1">Restaurant</span>
                    {activeRole === 'restaurant' && (
                        <Check className="w-4 h-4 text-[#009EE0]" />
                    )}
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleSwitch('supplier')}
                    className="cursor-pointer"
                >
                    <Truck className="w-4 h-4 mr-2 text-[#00d4aa]" />
                    <span className="flex-1">Supplier</span>
                    {activeRole === 'supplier' && (
                        <Check className="w-4 h-4 text-[#00d4aa]" />
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
