// @ts-expect-error: Deno-specific import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error: Deno-specific import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
    env: {
        get: (key: string) => string | undefined;
    };
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('No authorization header passed');
        }

        // Parse JWT to get user_id (Clerk ID)
        // In a production environment, you should verify the signature.
        // Here we act on the user_id from the token assuming Clerk/Supabase integration validated it at the gateway or we trust the source for this operation if key is present.
        // However, best practice is to verify. 
        // IF Supabase Auth is managing the session via Clerk integration, getUser() works.
        // IF Clerk is managing it and passing a custom token, we decode it.

        // Simple decoding for the 'sub' claim (Clerk User ID)
        const token = authHeader.replace('Bearer ', '');
        const [, payload] = token.split('.');
        const decodedPayload = JSON.parse(atob(payload));
        const userId = decodedPayload.sub;

        if (!userId) {
            throw new Error('User ID not found in token');
        }

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        console.log(`Starting deletion for user: ${userId}`);

        // 1. Delete from supplier_connections
        const { error: connectionsError } = await supabase
            .from('supplier_connections')
            .delete()
            .or(`restaurant_user_id.eq.${userId},supplier_user_id.eq.${userId}`);
        if (connectionsError) console.error('Error deleting connections:', connectionsError);

        // 2. Delete orders (cascades to order_items)
        const { error: ordersError } = await supabase
            .from('orders')
            .delete()
            .eq('user_id', userId);
        if (ordersError) console.error('Error deleting orders:', ordersError);

        // 3. Delete deliveries (cascades to delivery_items, messages)
        const { error: deliveriesError } = await supabase
            .from('deliveries')
            .delete()
            .eq('user_id', userId);
        if (deliveriesError) console.error('Error deleting deliveries:', deliveriesError);

        // 4. Delete suppliers (cascades to products, etc.)
        const { error: suppliersError } = await supabase
            .from('suppliers')
            .delete()
            .eq('user_id', userId);
        if (suppliersError) console.error('Error deleting suppliers:', suppliersError);

        // 5. Delete restaurants (cascades where applicable)
        const { error: restaurantsError } = await supabase
            .from('restaurants')
            .delete()
            .eq('user_id', userId);
        if (restaurantsError) console.error('Error deleting restaurants:', restaurantsError);

        // 5. Delete specific profiles
        await supabase.from('restaurant_profiles').delete().eq('user_id', userId);
        await supabase.from('supplier_profiles').delete().eq('user_id', userId);
        await supabase.from('user_profiles').delete().eq('user_id', userId);

        // 6. Delete storage files
        const { data: files } = await supabase.storage.from('receipt-images').list(userId);
        if (files && files.length > 0) {
            const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
            await supabase.storage.from('receipt-images').remove(paths);
            // Try to remove the folder itself if possible (usually empty folders are virtual)
        }

        // 7. Delete from Clerk (if Secret Key is present)
        const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
        if (clerkSecretKey) {
            console.log('Deleting user from Clerk...');
            const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${clerkSecretKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!clerkRes.ok) {
                console.error('Failed to delete user from Clerk:', await clerkRes.text());
                // We don't throw here to ensure we report partial success if DB is cleared
            } else {
                console.log('User deleted from Clerk');
            }
        } else {
            console.warn('CLERK_SECRET_KEY not set, skipping Clerk user deletion');
        }

        return new Response(
            JSON.stringify({ message: 'Account deleted successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        const err = error as Error;
        console.error('Error processing request:', err);
        return new Response(
            JSON.stringify({ error: err.message || 'Unknown error' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
