import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { useAuth } from '@/contexts/AuthContext';
import { Store, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ProfileData {
  name: string;
  contact_email: string;
  contact_phone: string;
  street_address: string;
}

export default function RestaurantProfilePage() {
  const { user, updateUserMetadata } = useAuth();
  const supabase = useAuthenticatedSupabase();

  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    contact_email: '',
    contact_phone: '',
    street_address: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasPlaceholderData, setHasPlaceholderData] = useState(false);

  // Detect placeholder data
  const isPlaceholderName = (name: string) => name.startsWith('Restaurant user_');
  const isPlaceholderEmail = (email: string) => email.includes('contact-user_');

  // Fetch current profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('restaurants')
          .select('name, contact_email, contact_phone, street_address')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          // Check for placeholder data
          const hasPlaceholder = isPlaceholderName(data.name || '') ||
                                 isPlaceholderEmail(data.contact_email || '');
          setHasPlaceholderData(hasPlaceholder);

          // If placeholder data, use empty strings or Clerk fallback
          setProfileData({
            name: hasPlaceholder && isPlaceholderName(data.name || '')
              ? (user.companyName || '')
              : (data.name || ''),
            contact_email: hasPlaceholder && isPlaceholderEmail(data.contact_email || '')
              ? (user.email || '')
              : (data.contact_email || user.email || ''),
            contact_phone: data.contact_phone || '',
            street_address: data.street_address || '',
          });
        } else {
          // No data found, use Clerk defaults
          setProfileData({
            name: user.companyName || '',
            contact_email: user.email || '',
            contact_phone: '',
            street_address: '',
          });
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user?.id, user?.email, user?.companyName]);

  // Save profile data
  const saveProfile = useCallback(async () => {
    if (!user?.id) return;

    // Validate required fields
    if (!profileData.name.trim()) {
      toast.error('Restaurant name is required');
      return;
    }

    setIsSaving(true);
    try {
      // Update Supabase
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: profileData.name.trim(),
          contact_email: profileData.contact_email.trim() || null,
          contact_phone: profileData.contact_phone.trim() || null,
          street_address: profileData.street_address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Sync companyName to Clerk metadata
      await updateUserMetadata({
        companyName: profileData.name.trim(),
      });

      setSaved(true);
      setHasPlaceholderData(false);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Profile saved successfully');
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, profileData, updateUserMetadata]);

  if (!user) return null;

  return (
    <AppLayout>
      <MainContent>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-8">Restaurant Profile</h1>

          {/* Placeholder Data Warning */}
          {hasPlaceholderData && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Your profile has incomplete information. Please update your restaurant details so suppliers can contact you.
              </p>
            </div>
          )}

          {/* Business Information */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Store size={20} />
              Business Information
            </h2>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div>
                    <Label>
                      Restaurant Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., The Blue Kitchen"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={profileData.contact_email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="e.g., orders@bluekitchen.com"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Suppliers will use this email to contact you
                    </p>
                  </div>

                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      type="tel"
                      value={profileData.contact_phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="e.g., +358 40 123 4567"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Street Address</Label>
                    <Input
                      value={profileData.street_address}
                      onChange={(e) => setProfileData(prev => ({ ...prev, street_address: e.target.value }))}
                      placeholder="e.g., Mannerheimintie 10, 00100 Helsinki"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Delivery address for your restaurant
                    </p>
                  </div>

                  <Button
                    onClick={saveProfile}
                    disabled={isSaving || !profileData.name.trim()}
                    className="bg-[#009EE0] hover:bg-[#009EE0]/90 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saved ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      </MainContent>
    </AppLayout>
  );
}
