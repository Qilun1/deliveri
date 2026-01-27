import { useSession } from '@clerk/clerk-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

/**
 * Hook that creates an authenticated Supabase client with Clerk JWT token.
 * This is required for any database operations protected by RLS policies.
 *
 * IMPORTANT: Requires a JWT template named 'supabase' configured in Clerk dashboard.
 */
export function useAuthenticatedSupabase(): SupabaseClient {
  const { session } = useSession();

  return useMemo(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: async (url, options = {}) => {
          // Get fresh Clerk token for each request
          // Try 'supabase' template first, fall back to default session token
          let token = await session?.getToken({ template: 'supabase' }).catch(() => null);

          if (!token) {
            // Fallback: use default session token if 'supabase' template doesn't exist
            token = await session?.getToken().catch(() => null);
            if (token) {
              console.warn('Using default Clerk token. For proper RLS, create a JWT template named "supabase" in Clerk dashboard.');
            }
          }

          const headers = new Headers(options.headers);

          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          } else {
            console.warn('No auth token available - RLS policies may block access');
          }

          return fetch(url, { ...options, headers });
        },
      },
    });
  }, [session]);
}
