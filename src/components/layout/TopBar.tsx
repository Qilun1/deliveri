import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, HelpCircle, BookOpen, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileMenuButton } from './Sidebar';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface TopBarProps {
    onUploadClick?: () => void;
}

export default function TopBar({ onUploadClick }: TopBarProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const getBreadcrumb = () => {
        const path = location.pathname;
        if (path === '/dashboard' || path === '/') return 'Dashboard';
        if (path === '/deliveries') return 'Deliveries';
        if (path === '/upload') return 'Upload Receipt';
        if (path === '/analytics') return 'Analytics';
        if (path === '/suppliers') return 'Suppliers';
        if (path === '/settings') return 'Settings';
        if (path === '/price-comparison') return 'Price Comparison';
        if (path === '/onboarding') return 'Onboarding';
        // Supplier paths
        if (path === '/supplier/dashboard') return 'Supplier Dashboard';
        if (path === '/supplier/orders') return 'Incoming Orders';
        if (path === '/supplier/deliveries') return 'Outgoing Deliveries';
        if (path === '/supplier/issues') return 'Delivery Issues';
        if (path === '/supplier/products') return 'Product Catalog';
        if (path === '/supplier/restaurants') return 'Connected Restaurants';
        if (path === '/supplier/analytics') return 'Supplier Analytics';
        if (path.startsWith('/verify/')) return 'Dashboard / Verify Delivery';
        if (path.startsWith('/deliveries/')) return 'Deliveries / Delivery Details';
        return 'Dashboard';
    };

    const handleViewOnboarding = () => {
        localStorage.setItem('force_show_onboarding', 'true');
        localStorage.removeItem('deliveri_onboarding_completed');
        navigate('/onboarding');
    };

    return (
        <>
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="flex items-center justify-between px-4 md:px-8 py-4">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Button */}
                        <MobileMenuButton />

                        {/* Breadcrumb */}
                        <nav className="text-sm text-muted-foreground">
                            <span className="text-foreground font-medium">{getBreadcrumb()}</span>
                        </nav>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 md:gap-3">

                        {/* Search */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSearchOpen(true)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <Search className="w-5 h-5" />
                        </Button>

                        {/* Help Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <HelpCircle className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[220px]">
                                <DropdownMenuLabel>Help & Resources</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleViewOnboarding}>
                                    <Sparkles className="w-4 h-4 mr-2 text-[#009EE0]" />
                                    View Onboarding
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Documentation
                                    <ExternalLink className="w-3 h-3 ml-auto" />
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Notifications */}
                        <NotificationCenter />
                    </div>
                </div>
            </header>

            {/* Global Search Modal */}
            <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </>
    );
}
