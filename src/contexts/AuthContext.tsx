import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useUser, useClerk, useSession } from '@clerk/clerk-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'restaurant' | 'supplier';

export interface User {
  id: string;
  email: string;
  role: UserRole | null;
  companyName: string;
  businessId: string;
  createdAt: Date;
}

interface BusinessMapping {
  business_id: string;
  business_name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  updateUserMetadata: (metadata: { role?: UserRole; companyName?: string; businessId?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// SECURITY FIX: Create authenticated Supabase client with Clerk token
function createAuthenticatedSupabase(token: string): SupabaseClient {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const [businessMapping, setBusinessMapping] = useState<BusinessMapping | null>(null);
  const [isMappingLoaded, setIsMappingLoaded] = useState(false);

  // SECURITY FIX: Get authenticated token and fetch business mapping
  const fetchBusinessMapping = useCallback(async () => {
    if (!clerkUser?.id || !session) {
      setBusinessMapping(null);
      setIsMappingLoaded(true);
      return;
    }

    try {
      // Get Clerk JWT token for Supabase authentication
      let token = await session.getToken({ template: 'supabase' }).catch(() => null);

      if (!token) {
        // Fallback to default session token
        token = await session.getToken().catch(() => null);
      }

      if (!token) {
        console.warn('No auth token available for business mapping query');
        setBusinessMapping(null);
        setIsMappingLoaded(true);
        return;
      }

      // Create authenticated Supabase client
      const authenticatedSupabase = createAuthenticatedSupabase(token);

      const { data, error } = await authenticatedSupabase
        .from('user_business_mapping')
        .select('business_id, business_name, role')
        .eq('user_id', clerkUser.id)
        .single();

      if (!error && data) {
        setBusinessMapping(data as BusinessMapping);
      } else {
        setBusinessMapping(null);
      }
    } catch (err) {
      console.error('Error fetching business mapping:', err);
      setBusinessMapping(null);
    } finally {
      setIsMappingLoaded(true);
    }
  }, [clerkUser?.id, session]);

  // Fetch business mapping when clerk user changes
  useEffect(() => {
    setIsMappingLoaded(false);
    fetchBusinessMapping();
  }, [fetchBusinessMapping]);

  // Map Clerk user to our User type
  // Priority: database mapping > Clerk metadata > defaults
  const user: User | null = clerkUser
    ? {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      role: businessMapping?.role || (clerkUser.unsafeMetadata?.role as UserRole) || (clerkUser.publicMetadata?.role as UserRole) || null,
      companyName: businessMapping?.business_name || (clerkUser.unsafeMetadata?.companyName as string) || (clerkUser.publicMetadata?.companyName as string) || clerkUser.firstName || '',
      businessId: businessMapping?.business_id || (clerkUser.unsafeMetadata?.businessId as string) || (clerkUser.publicMetadata?.businessId as string) || clerkUser.id,
      createdAt: new Date(clerkUser.createdAt || Date.now()),
    }
    : null;

  const logout = () => {
    signOut();
  };

  const updateUserMetadata = async (metadata: { role?: UserRole; companyName?: string; businessId?: string }) => {
    if (!clerkUser) return;

    try {
      await clerkUser.update({
        unsafeMetadata: {
          ...clerkUser.unsafeMetadata,
          ...metadata,
        },
      });
    } catch (error) {
      console.error('Error updating user metadata:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: !isLoaded || !isMappingLoaded, logout, updateUserMetadata }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
