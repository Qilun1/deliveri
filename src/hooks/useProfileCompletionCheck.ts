import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedSupabase } from './useAuthenticatedSupabase';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'profilePromptDismissedAt';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useProfileCompletionCheck() {
  const { user } = useAuth();
  const supabase = useAuthenticatedSupabase();
  const [needsProfileUpdate, setNeedsProfileUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if the prompt was recently dismissed
  const wasRecentlyDismissed = useCallback(() => {
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (!dismissedAt) return false;

    const dismissedTime = parseInt(dismissedAt, 10);
    const now = Date.now();
    return now - dismissedTime < DISMISS_DURATION_MS;
  }, []);

  // Dismiss the prompt for 24 hours
  const dismissPrompt = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setNeedsProfileUpdate(false);
  }, []);

  // Clear the dismissal (used after successful profile update)
  const clearDismissal = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    async function checkProfile() {
      if (!user?.id) {
        setIsChecking(false);
        return;
      }

      // Only check for restaurants
      if (user.role !== 'restaurant') {
        setIsChecking(false);
        return;
      }

      // Skip if recently dismissed
      if (wasRecentlyDismissed()) {
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('name, contact_email')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking profile:', error);
          setIsChecking(false);
          return;
        }

        if (data) {
          // Detect placeholder patterns
          const hasPlaceholderName = data.name?.startsWith('Restaurant user_');
          const hasPlaceholderEmail = data.contact_email?.includes('contact-user_');
          setNeedsProfileUpdate(hasPlaceholderName || hasPlaceholderEmail);
        }
      } catch (err) {
        console.error('Error checking profile completion:', err);
      } finally {
        setIsChecking(false);
      }
    }

    checkProfile();
  }, [supabase, user?.id, user?.role, wasRecentlyDismissed]);

  return {
    needsProfileUpdate,
    isChecking,
    dismissPrompt,
    clearDismissal
  };
}
