import { useState, useMemo } from 'react';
import {
    ClipboardList,
    Search,
    Filter,
    Check,
    X,
    Package,
    Loader2
} from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSupplierProducts } from '@/hooks/useSupplierData';
import { cn } from '@/lib/utils';

export default function ProductCatalog() {
    const [searchQuery, setSearchQuery] = useState('');

    const { data: products, isLoading, error } = useSupplierProducts();

    const filteredProducts = useMemo(() => {
        if (!products) return [];

        let result = [...products];

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (p) => (p.name?.toLowerCase() || '').includes(query)
            );
        }

        return result;
    }, [products, searchQuery]);

    if (error) {
        return (
            <MainContent>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-destructive">Error loading products</p>
                    </div>
                </div>
            </MainContent>
        );
    }

    return (
        <MainContent>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Product Catalog</h1>
                    <p className="text-muted-foreground">Browse available products from Metro Tukku</p>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <>
                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProducts.map((product, index) => (
                                <Card key={product.url || index} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name || 'Product'}
                                                    className="w-16 h-16 object-cover rounded-lg bg-muted"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-foreground truncate">
                                                    {product.name || 'Unknown Product'}
                                                </h3>
                                                {product.code && (
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        Code: {product.code}
                                                    </p>
                                                )}
                                                <div className="mt-2">
                                                    {product.price != null ? (
                                                        <span className="text-lg font-bold text-foreground">
                                                            €{Number(product.price).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            Price not available
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="mt-8">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-foreground">{filteredProducts.length}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {searchQuery ? 'Products found' : 'Total Products'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <ClipboardList className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No products found</h3>
                            <p className="text-muted-foreground">
                                {searchQuery
                                    ? 'Try adjusting your search'
                                    : 'Products will appear here once available'}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainContent>
    );
}
