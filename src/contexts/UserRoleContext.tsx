import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type ViewMode = 'restaurant' | 'supplier';

interface UserRoleContextType {
    activeRole: ViewMode;
    switchRole: (role: ViewMode) => void;
    hasRestaurantRole: boolean;
    hasSupplierRole: boolean;
    loading: boolean;
    isOnboarded: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

const STORAGE_KEY = 'deliveri-active-role';

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    // Sync activeRole with AuthContext user role
    const [activeRole, setActiveRole] = useState<ViewMode>(() => {
        if (user?.role) return user.role;

        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'restaurant' || stored === 'supplier') {
                return stored;
            }
        }
        return 'restaurant';
    });

    useEffect(() => {
        if (user?.role) {
            setActiveRole(user.role);
        }
    }, [user?.role]);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, activeRole);
    }, [activeRole]);

    const switchRole = (role: ViewMode) => {
        // Roles are now permanent, but we keep the function for compatibility
        // with any existing UI that might try to call it, though it won't do anything
        // if the user has a permanent role.
        if (user?.role) {
            return;
        }
        setActiveRole(role);
    };

    return (
        <UserRoleContext.Provider
            value={{
                activeRole,
                switchRole,
                // Always allow both roles (can be restricted later based on user data)
                hasRestaurantRole: true,
                hasSupplierRole: true,
                loading: false,
                isOnboarded: true,
            }}
        >
            {children}
        </UserRoleContext.Provider>
    );
}

export function useUserRole() {
    const context = useContext(UserRoleContext);
    if (!context) {
        throw new Error('useUserRole must be used within UserRoleProvider');
    }
    return context;
}
