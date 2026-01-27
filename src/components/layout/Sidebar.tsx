import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/clerk-react';
import {
    Home,
    Package,
    BarChart3,
    Building2,
    Settings,
    ShoppingCart,
    Truck,
    AlertTriangle,
    Users,
    ClipboardList,
    Store,
    Menu,
    LucideIcon
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useUserRole } from '@/contexts/UserRoleContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MenuItem {
    icon: LucideIcon;
    label: string;
    path: string;
}

// Sidebar content component (shared between desktop and mobile)
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const { activeRole } = useUserRole();

    // Restaurant navigation items
    const restaurantMenuItems: MenuItem[] = [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Package, label: 'Deliveries', path: '/deliveries' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: Building2, label: 'Suppliers', path: '/suppliers' },
        { icon: Store, label: 'Profile', path: '/restaurant/profile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    // Supplier navigation items
    const supplierMenuItems: MenuItem[] = [
        { icon: Home, label: 'Dashboard', path: '/supplier/dashboard' },
        { icon: ShoppingCart, label: 'Incoming Orders', path: '/supplier/orders' },
        { icon: Truck, label: 'Outgoing Deliveries', path: '/supplier/deliveries' },
        { icon: AlertTriangle, label: 'Delivery Issues', path: '/supplier/issues' },
        { icon: ClipboardList, label: 'Product Catalog', path: '/supplier/products' },
        { icon: Users, label: 'Connected Restaurants', path: '/supplier/restaurants' },
        { icon: BarChart3, label: 'Analytics', path: '/supplier/analytics' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    // Choose menu based on active role
    const menuItems = activeRole === 'supplier' ? supplierMenuItems : restaurantMenuItems;

    const isActive = (path: string) => {
        if (path === '/dashboard' || path === '/supplier/dashboard') {
            return location.pathname === path || location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    const getRoleDisplayName = () => {
        if (activeRole === 'restaurant') return 'Restaurant';
        if (activeRole === 'supplier') return 'Supplier';
        return null;
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        onNavigate?.();
    };

    return (
        <div className="flex flex-col h-full bg-card border-r border-border">
            {/* App Header - Simplified */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-2 mb-1">
                    <Logo size="md" showSubtitle={false} />
                </div>

                {/* Minimal Role Badge */}
                {activeRole && (
                    <div className="pl-1">
                        <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground font-normal text-[10px] h-5 px-2 hover:bg-muted"
                        >
                            {activeRole === 'restaurant' ? (
                                <Store className="w-3 h-3 mr-1" />
                            ) : (
                                <Truck className="w-3 h-3 mr-1" />
                            )}
                            {getRoleDisplayName()}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.path}
                            onClick={() => handleNavigation(item.path)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                active
                                    ? "bg-[#009DE0]/10 text-[#009DE0]"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "w-5 h-5 transition-colors",
                                    active ? "text-[#009DE0] fill-current" : "text-muted-foreground"
                                )}
                                strokeWidth={active ? 2 : 2}
                            />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Simplified User Section */}
            <div className="p-4 border-t border-border mt-auto">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: 'w-9 h-9',
                            }
                        }}
                    />
                    <div className="flex-1 min-w-0 flex flex-col items-start overflow-hidden">
                        <span className="text-sm font-medium text-foreground truncate w-full text-left">
                            {user?.firstName || 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate w-full text-left">
                            {user?.emailAddresses?.[0]?.emailAddress}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Mobile Menu Button (for TopBar)
export function MobileMenuButton() {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();

    if (!isMobile) return null;

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden -ml-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r border-border">
                <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
}

// Desktop Sidebar
export default function Sidebar() {
    const isMobile = useIsMobile();

    // On mobile, the sidebar is hidden (handled by Sheet)
    // On desktop, it's fixed
    if (isMobile) return null;

    return (
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
            <SidebarContent />
        </aside>
    );
}
