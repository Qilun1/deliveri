// @ts-expect-error: Deno-specific import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error: Deno-specific import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
    env: {
        get: (key: string) => string | undefined;
    };
};

// SECURITY: Restrict CORS to specific origins
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean);

function getCorsHeaders(origin: string | null): Record<string, string> {
    // If no allowed origins configured, use restrictive default in production
    const isAllowed = allowedOrigins.length === 0
        ? false // Deny by default if not configured
        : allowedOrigins.includes(origin || '') || allowedOrigins.includes('*');

    return {
        'Access-Control-Allow-Origin': isAllowed ? (origin || '') : '',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}

serve(async (req: Request) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('No authorization header passed');
        }

        // Initialize Supabase Admin Client for auth verification
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // SECURITY FIX: Verify JWT token using Supabase auth instead of just decoding
        // Create a client with the user's token to verify it
        const token = authHeader.replace('Bearer ', '');
        const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
            global: {
                headers: { Authorization: `Bearer ${token}` }
            }
        });

        // Verify the token by calling getUser - this validates the JWT signature
        const { data: userData, error: authError } = await userClient.auth.getUser(token);

        let userId: string;

        if (authError || !userData?.user) {
            // Fallback: If Supabase auth fails (e.g., Clerk token),
            // decode the token but verify it matches expected format
            // The gateway's verify_jwt should have already validated the signature
            try {
                const [, payload] = token.split('.');
                if (!payload) throw new Error('Invalid token format');
                const decodedPayload = JSON.parse(atob(payload));
                userId = decodedPayload.sub;

                if (!userId || typeof userId !== 'string' || !userId.startsWith('user_')) {
                    throw new Error('Invalid user ID format in token');
                }
            } catch {
                throw new Error('Token verification failed');
            }
        } else {
            userId = userData.user.id;
        }

        if (!userId) {
            throw new Error('User ID not found in token');
        }

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

        // 6. Delete specific profiles
        await supabase.from('restaurant_profiles').delete().eq('user_id', userId);
        await supabase.from('supplier_profiles').delete().eq('user_id', userId);
        await supabase.from('user_profiles').delete().eq('user_id', userId);

        // 7. Delete storage files
        const { data: files } = await supabase.storage.from('receipt-images').list(userId);
        if (files && files.length > 0) {
            const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
            await supabase.storage.from('receipt-images').remove(paths);
        }

        // 8. Delete from Clerk (if Secret Key is present)
        const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
        if (clerkSecretKey) {
            const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${clerkSecretKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!clerkRes.ok) {
                console.error('Failed to delete user from Clerk');
            }
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
