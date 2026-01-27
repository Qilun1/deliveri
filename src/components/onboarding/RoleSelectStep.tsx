import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ChevronLeft,
    ChevronRight,
    Store,
    Truck,
    Check,
    Building2,
    Phone,
    MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, UserRole as AuthRole } from '@/contexts/AuthContext';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { useUser } from '@clerk/clerk-react';

interface RoleSelectStepProps {
    onNext: () => void;
    onBack: () => void;
}

type UserRole = 'restaurant' | 'supplier' | null;

export default function RoleSelectStep({ onNext, onBack }: RoleSelectStepProps) {
    const { updateUserMetadata } = useAuth();
    const { user: clerkUser } = useUser();
    const supabase = useAuthenticatedSupabase();
    const [selectedRole, setSelectedRole] = useState<UserRole>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Restaurant form state
    const [restaurantName, setRestaurantName] = useState('');
    const [restaurantAddress, setRestaurantAddress] = useState('');
    const [restaurantPhone, setRestaurantPhone] = useState('');

    // Supplier form state
    const [companyName, setCompanyName] = useState('');
    const [supplierSubMode, setSupplierSubMode] = useState<'create' | 'join' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [existingSuppliers, setExistingSuppliers] = useState<{ id: string, name: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const searchSuppliers = async (query: string) => {
        if (!query.trim()) {
            setExistingSuppliers([]);
            return;
        }

        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name')
                .ilike('name', `%${query}%`)
                .limit(5);

            // Deduplicate by name
            const unique: { id: string, name: string }[] = [];
            const seen = new Set();
            for (const s of (data || [])) {
                if (!seen.has(s.name)) {
                    unique.push(s);
                    seen.add(s.name);
                }
            }
            setExistingSuppliers(unique);
        } catch (error) {
            console.error('Error searching suppliers:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (selectedRole === 'restaurant') {
                if (!restaurantName.trim()) {
                    toast.error('Please enter your restaurant name');
                    setIsSubmitting(false);
                    return;
                }
                // Save restaurant data to Clerk metadata
                await updateUserMetadata({
                    role: 'restaurant' as AuthRole,
                    companyName: restaurantName,
                    businessId: clerkUser?.id || '',
                });

                // Sync restaurant profile to Supabase for suppliers to see
                if (clerkUser?.id) {
                    const { error: dbError } = await supabase
                        .from('restaurants')
                        .upsert({
                            id: clerkUser.id,
                            name: restaurantName.trim(),
                            contact_email: clerkUser.primaryEmailAddress?.emailAddress || null,
                            contact_phone: restaurantPhone.trim() || null,
                            street_address: restaurantAddress.trim() || null,
                            updated_at: new Date().toISOString(),
                        }, {
                            onConflict: 'id'
                        });

                    if (dbError) {
                        console.error('Failed to sync restaurant to database:', dbError);
                        // Don't block onboarding, but log the error
                    }
                }

                toast.success('Welcome to DeliVeri!');
                onNext();
            } else if (selectedRole === 'supplier') {
                if (supplierSubMode === 'create') {
                    if (!companyName.trim()) {
                        toast.error('Please enter your company name');
                        setIsSubmitting(false);
                        return;
                    }
                    // Save supplier data to Clerk metadata
                    await updateUserMetadata({
                        role: 'supplier' as AuthRole,
                        companyName: companyName,
                        businessId: clerkUser?.id || '',
                    });

                    // Sync supplier profile to Supabase
                    if (clerkUser?.id) {
                        const { error: dbError } = await supabase
                            .from('suppliers')
                            .upsert({
                                id: clerkUser.id,
                                name: companyName.trim(),
                                contact_email: clerkUser.primaryEmailAddress?.emailAddress || null,
                                updated_at: new Date().toISOString(),
                            }, {
                                onConflict: 'id'
                            });

                        if (dbError) throw dbError;
                    }
                } else if (supplierSubMode === 'join') {
                    if (!companyName.trim()) {
                        toast.error('Please select a company to join');
                        setIsSubmitting(false);
                        return;
                    }

                    // Find the existing business ID for this name
                    const { data: existingBusiness } = await supabase
                        .from('suppliers')
                        .select('id')
                        .eq('name', companyName.trim())
                        .maybeSingle();

                    if (!existingBusiness) {
                        toast.error('The selected company no longer exists. Please create it instead.');
                        setIsSubmitting(false);
                        return;
                    }

                    // Save supplier data to Clerk metadata
                    await updateUserMetadata({
                        role: 'supplier' as AuthRole,
                        companyName: companyName.trim(),
                        businessId: existingBusiness.id,
                    });

                    // For joining, we DON'T create a new row in 'suppliers'
                    // This avoids duplicating business entries.
                }

                toast.success('Welcome to DeliVeri!');
                onNext();
            }
        } catch (error) {
            console.error('Onboarding error:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center space-y-2"
            >
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                    How will you use DeliVeri?
                </h2>
                <p className="text-[#9294a0]">
                    Choose your role to personalize your experience
                </p>
            </motion.div>

            {/* Role selection cards */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
            >
                {/* Restaurant Card */}
                <button
                    onClick={() => setSelectedRole('restaurant')}
                    className={`group relative p-5 rounded-xl border-2 transition-all duration-300 text-left ${selectedRole === 'restaurant'
                        ? 'border-[#009EE0] bg-[#009EE0]/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                >
                    {selectedRole === 'restaurant' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#009EE0] flex items-center justify-center"
                        >
                            <Check className="w-4 h-4 text-white" />
                        </motion.div>
                    )}
                    <div
                        className={`mb-3 p-3 rounded-lg w-fit transition-colors ${selectedRole === 'restaurant' ? 'bg-[#009EE0]/20' : 'bg-white/5'
                            }`}
                    >
                        <Store
                            className={`w-6 h-6 ${selectedRole === 'restaurant' ? 'text-[#009EE0]' : 'text-[#9294a0]'
                                }`}
                        />
                    </div>
                    <h3
                        className={`font-semibold text-base mb-1 ${selectedRole === 'restaurant' ? 'text-[#009EE0]' : 'text-white'
                            }`}
                    >
                        Restaurant
                    </h3>
                    <p className="text-xs text-[#9294a0] leading-relaxed">
                        Track deliveries and verify orders
                    </p>
                </button>

                {/* Supplier Card */}
                <button
                    onClick={() => setSelectedRole('supplier')}
                    className={`group relative p-5 rounded-xl border-2 transition-all duration-300 text-left ${selectedRole === 'supplier'
                        ? 'border-[#00d4aa] bg-[#00d4aa]/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                >
                    {selectedRole === 'supplier' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#00d4aa] flex items-center justify-center"
                        >
                            <Check className="w-4 h-4 text-[#0a0a0f]" />
                        </motion.div>
                    )}
                    <div
                        className={`mb-3 p-3 rounded-lg w-fit transition-colors ${selectedRole === 'supplier' ? 'bg-[#00d4aa]/20' : 'bg-white/5'
                            }`}
                    >
                        <Truck
                            className={`w-6 h-6 ${selectedRole === 'supplier' ? 'text-[#00d4aa]' : 'text-[#9294a0]'
                                }`}
                        />
                    </div>
                    <h3
                        className={`font-semibold text-base mb-1 ${selectedRole === 'supplier' ? 'text-[#00d4aa]' : 'text-white'
                            }`}
                    >
                        Supplier
                    </h3>
                    <p className="text-xs text-[#9294a0] leading-relaxed">
                        Manage orders and deliveries
                    </p>
                </button>
            </motion.div>

            {/* Conditional form based on role */}
            {selectedRole === 'restaurant' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="restaurantName" className="text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#009EE0]" />
                            Restaurant Name *
                        </Label>
                        <Input
                            id="restaurantName"
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                            placeholder="Enter your restaurant name"
                            className="bg-white/5 border-white/10 text-white placeholder:text-[#55556a]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="restaurantAddress" className="text-white flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#009EE0]" />
                            Address (optional)
                        </Label>
                        <Input
                            id="restaurantAddress"
                            value={restaurantAddress}
                            onChange={(e) => setRestaurantAddress(e.target.value)}
                            placeholder="Enter your address"
                            className="bg-white/5 border-white/10 text-white placeholder:text-[#55556a]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="restaurantPhone" className="text-white flex items-center gap-2">
                            <Phone className="w-4 h-4 text-[#009EE0]" />
                            Phone (optional)
                        </Label>
                        <Input
                            id="restaurantPhone"
                            value={restaurantPhone}
                            onChange={(e) => setRestaurantPhone(e.target.value)}
                            placeholder="Enter your phone number"
                            className="bg-white/5 border-white/10 text-white placeholder:text-[#55556a]"
                        />
                    </div>
                </motion.div>
            )}

            {selectedRole === 'supplier' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-4"
                >
                    <div className="grid grid-cols-2 gap-4 pb-2">
                        <button
                            onClick={() => {
                                setSupplierSubMode('create');
                                setCompanyName('');
                            }}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${supplierSubMode === 'create'
                                ? 'border-[#00d4aa] bg-[#00d4aa]/10 text-[#00d4aa]'
                                : 'border-white/10 bg-white/5 text-[#9294a0] hover:border-white/20'
                                }`}
                        >
                            Create New
                        </button>
                        <button
                            onClick={() => {
                                setSupplierSubMode('join');
                                setCompanyName('');
                                setSearchQuery('');
                            }}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${supplierSubMode === 'join'
                                ? 'border-[#00d4aa] bg-[#00d4aa]/10 text-[#00d4aa]'
                                : 'border-white/10 bg-white/5 text-[#9294a0] hover:border-white/20'
                                }`}
                        >
                            Join Existing
                        </button>
                    </div>

                    {supplierSubMode === 'create' && (
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-white flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#00d4aa]" />
                                Company Name *
                            </Label>
                            <Input
                                id="companyName"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="Enter your company name"
                                className="bg-white/5 border-white/10 text-white placeholder:text-[#55556a]"
                            />
                        </div>
                    )}

                    {supplierSubMode === 'join' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="searchSupplier" className="text-white flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-[#00d4aa]" />
                                    Search Company *
                                </Label>
                                <Input
                                    id="searchSupplier"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchSuppliers(e.target.value);
                                    }}
                                    placeholder="Search for an existing company..."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-[#55556a]"
                                />
                            </div>

                            {isSearching ? (
                                <div className="text-center py-2 text-sm text-[#9294a0]">Searching...</div>
                            ) : existingSuppliers.length > 0 ? (
                                <div className="space-y-2">
                                    {existingSuppliers.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setCompanyName(s.name);
                                                setSearchQuery(s.name);
                                                setExistingSuppliers([]);
                                            }}
                                            className={`w-full p-3 rounded-lg border text-left transition-all ${companyName === s.name
                                                ? 'border-[#00d4aa] bg-[#00d4aa]/20 text-white'
                                                : 'border-white/5 bg-white/[0.02] text-[#9294a0] hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="font-medium">{s.name}</div>
                                        </button>
                                    ))}
                                </div>
                            ) : searchQuery && !isSearching ? (
                                <div className="text-center py-2 text-sm text-[#9294a0]">No companies found</div>
                            ) : null}

                            {companyName && (
                                <div className="p-3 rounded-lg bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center">
                                        <Check className="w-5 h-5 text-[#0a0a0f]" />
                                    </div>
                                    <div>
                                        <div className="text-white text-sm font-medium">Selected: {companyName}</div>
                                        <div className="text-[#9294a0] text-xs">You will join this supplier team</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}

            {/* Navigation */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-between pt-4"
            >
                <Button
                    variant="outline"
                    onClick={onBack}
                    className="px-6 py-5 bg-white text-black hover:bg-gray-100 border-transparent hover:text-black"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Back
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!selectedRole || (selectedRole === 'supplier' && !supplierSubMode) || isSubmitting}
                    className={`px-6 py-5 text-white transition-all duration-300 ${selectedRole === 'restaurant'
                        ? 'bg-gradient-to-r from-[#009EE0] to-[#00B5FF] hover:shadow-[0_0_30px_rgba(0,158,224,0.3)]'
                        : selectedRole === 'supplier'
                            ? 'bg-gradient-to-r from-[#00d4aa] to-[#00e6bb] hover:shadow-[0_0_30px_rgba(0,212,170,0.3)]'
                            : 'bg-white/10'
                        }`}
                >
                    {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                    <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
            </motion.div>
        </div>
    );
}
