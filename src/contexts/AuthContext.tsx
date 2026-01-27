import { createContext, useContext, ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

export type UserRole = 'restaurant' | 'supplier';

export interface User {
  id: string;
  email: string;
  role: UserRole | null;
  companyName: string;
  businessId: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  updateUserMetadata: (metadata: { role?: UserRole; companyName?: string; businessId?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();

  // Map Clerk user to our User type
  // For now, we use publicMetadata for role/companyName, with defaults
  const user: User | null = clerkUser
    ? {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      role: (clerkUser.unsafeMetadata?.role as UserRole) || (clerkUser.publicMetadata?.role as UserRole) || null,
      companyName: (clerkUser.unsafeMetadata?.companyName as string) || (clerkUser.publicMetadata?.companyName as string) || clerkUser.firstName || '',
      businessId: (clerkUser.unsafeMetadata?.businessId as string) || (clerkUser.publicMetadata?.businessId as string) || clerkUser.id,
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
    <AuthContext.Provider value={{ user, isLoading: !isLoaded, logout, updateUserMetadata }}>
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
