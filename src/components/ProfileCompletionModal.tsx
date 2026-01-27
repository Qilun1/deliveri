import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { toast } from 'sonner';
import { Loader2, Check, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface ProfileData {
  name: string;
  contact_email: string;
  contact_phone: string;
  street_address: string;
}

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileCompletionModal({
  isOpen,
  onClose,
  onSaved,
}: ProfileCompletionModalProps) {
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

  // Detect placeholder data
  const isPlaceholderName = (name: string) => name.startsWith('Restaurant user_');
  const isPlaceholderEmail = (email: string) => email.includes('contact-user_');

  // Fetch current profile data when modal opens
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('name, contact_email, contact_phone, street_address')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          // If placeholder data, use empty strings or Clerk fallback
          setProfileData({
            name: isPlaceholderName(data.name || '')
              ? (user.companyName || '')
              : (data.name || ''),
            contact_email: isPlaceholderEmail(data.contact_email || '')
              ? (user.email || '')
              : (data.contact_email || user.email || ''),
            contact_phone: data.contact_phone || '',
            street_address: data.street_address || '',
          });
        } else {
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
  }, [isOpen, user?.id, user?.email, user?.companyName]);

  const handleSave = async () => {
    if (!user?.id) return;

    if (!profileData.name.trim()) {
      toast.error('Restaurant name is required');
      return;
    }

    setIsSaving(true);
    try {
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
      toast.success('Profile updated successfully');
      setTimeout(() => {
        setSaved(false);
        onSaved();
      }, 1000);
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[#009EE0]" />
            Complete Your Restaurant Profile
          </DialogTitle>
          <DialogDescription>
            Please update your restaurant information so suppliers can identify and contact you.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label>
                Restaurant Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={profileData.name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., The Blue Kitchen"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={profileData.contact_email}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, contact_email: e.target.value }))
                }
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
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, contact_phone: e.target.value }))
                }
                placeholder="e.g., +358 40 123 4567"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Street Address</Label>
              <Input
                value={profileData.street_address}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, street_address: e.target.value }))
                }
                placeholder="e.g., Mannerheimintie 10, 00100 Helsinki"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Delivery address for your restaurant
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Remind Me Later
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading || !profileData.name.trim()}
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
              'Save Profile'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
