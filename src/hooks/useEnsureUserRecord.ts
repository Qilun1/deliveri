import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { toast } from 'sonner';

export function useEnsureUserRecord() {
    const { user } = useAuth();
    const supabase = useAuthenticatedSupabase();
    const checkedRef = useRef(false);

    useEffect(() => {
        const ensureRecord = async () => {
            // Wait for user and role to be fully loaded
            if (!user?.id || !user?.role) return;

            // Prevent double-checking in strict mode or re-renders
            if (checkedRef.current) return;
            checkedRef.current = true;

            try {
                const table = user.role === 'supplier' ? 'suppliers' : 'restaurants';
                console.log(`[AutoRepair] Checking ${table} record for user ${user.id}`);

                // Check if the canonical business record exists
                const { data, error } = await supabase
                    .from(table)
                    .select('id')
                    .eq('id', user.businessId)
                    .maybeSingle();

                if (error) {
                    console.error('[AutoRepair] Error checking record:', error);
                    return;
                }

                if (!data) {
                    // Only the primary user (whose ID matches the businessId) should create the business record
                    // In the Join flow, the businessId is already set to an existing record.
                    if (user.businessId !== user.id) {
                        console.log('[AutoRepair] Join detected. Waiting for owner to create record or business record exists under different ID.');
                        return;
                    }

                    console.log(`[AutoRepair] Missing business record detected. Creating...`);
                    toast.info('Finalizing your business account setup...');

                    // Create missing record
                    const { error: insertError } = await supabase.from(table).insert({
                        id: user.businessId,
                        name: user.companyName || (user.role === 'supplier' ? 'New Supplier' : 'My Restaurant'),
                        created_at: new Date().toISOString(),
                        // Add table-specific defaults
                        ...(user.role === 'supplier' ? { is_major_tukku: false } : {
                            address: '',
                            phone: ''
                        })
                    });

                    if (insertError) {
                        console.error('[AutoRepair] Failed to create record:', insertError);
                        toast.error('Failed to update account. Please contact support.');
                    } else {
                        console.log('[AutoRepair] Record created successfully.');
                        toast.success('Account setup complete!');
                        // Reload page to ensure connections work? Not strictly necessary if RLS works immediately.
                    }
                } else {
                    console.log('[AutoRepair] Record exists.');
                }
            } catch (err) {
                console.error('[AutoRepair] Unexpected error:', err);
                checkedRef.current = false; // Retry next time
            }
        };

        ensureRecord();
    }, [user, supabase]);
}
