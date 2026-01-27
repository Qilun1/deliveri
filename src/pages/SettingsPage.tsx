import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuthenticatedSupabase } from '@/hooks/useAuthenticatedSupabase';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, User, Bell, AlertTriangle, Loader2, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LocationData {
  city: string;
  street_address: string;
  postal_code: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { signOut, session } = useClerk();
  const supabase = useAuthenticatedSupabase();

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Location state
  const [locationData, setLocationData] = useState<LocationData>({
    city: '',
    street_address: '',
    postal_code: '',
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  // Fetch current location data
  useEffect(() => {
    const fetchLocationData = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingLocation(true);
        const tableName = user.role === 'restaurant' ? 'restaurants' : 'suppliers';

        const { data, error } = await supabase
          .from(tableName)
          .select('city, street_address, postal_code')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        if (data) {
          setLocationData({
            city: data.city || '',
            street_address: data.street_address || '',
            postal_code: data.postal_code || '',
          });
        }
      } catch (err) {
        console.error('Error fetching location data:', err);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchLocationData();
  }, [user?.id, user?.role]);

  // Save location data
  const saveLocationData = useCallback(async () => {
    if (!user?.id) return;

    // Validate city for restaurants
    if (user.role === 'restaurant' && !locationData.city.trim()) {
      toast.error('City is required for restaurants');
      return;
    }

    setIsSavingLocation(true);
    try {
      const tableName = user.role === 'restaurant' ? 'restaurants' : 'suppliers';

      // Try update first
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          city: locationData.city.trim() || null,
          street_address: locationData.street_address.trim() || null,
          postal_code: locationData.postal_code.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        // If no row exists, insert
        if (updateError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from(tableName)
            .insert({
              id: user.id,
              name: user.companyName,
              city: locationData.city.trim() || null,
              street_address: locationData.street_address.trim() || null,
              postal_code: locationData.postal_code.trim() || null,
            });

          if (insertError) throw insertError;
        } else {
          throw updateError;
        }
      }

      setLocationSaved(true);
      setTimeout(() => setLocationSaved(false), 2000);
      toast.success('Location saved successfully');
    } catch (err) {
      console.error('Error saving location data:', err);
      toast.error('Failed to save location');
    } finally {
      setIsSavingLocation(false);
    }
  }, [user?.id, user?.role, user?.companyName, locationData]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;

    setIsDeleting(true);
    try {
      // Get the Supabase token from Clerk
      const token = await session?.getToken({ template: 'supabase' });

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) throw error;

      toast.success('Account deleted successfully');

      // Sign out and redirect
      localStorage.clear();
      await signOut();
      navigate('/');

    } catch (err) {
      console.error('Error deleting account:', err);
      toast.error('Failed to delete account. Please try again.');
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <MainContent>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

          {/* Appearance */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
              Appearance
            </h2>
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
            </div>
          </section>

          {/* Account */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User size={20} />
              Account
            </h2>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input defaultValue={user.companyName} className="mt-2" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user.email} disabled className="mt-2" />
              </div>
              <div>
                <Label>Account Type</Label>
                <div className="mt-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
                  {user.role === 'restaurant' ? 'Restaurant' : 'Supplier'}
                  <span className="text-xs ml-2">(Cannot be changed)</span>
                </div>
              </div>
              <Button className="bg-[#009EE0] hover:bg-[#009EE0]/90 text-white">Save Changes</Button>
            </div>
          </section>

          {/* Location */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Location
            </h2>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              {isLoadingLocation ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div>
                    <Label>
                      City {user.role === 'restaurant' && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      value={locationData.city}
                      onChange={(e) => setLocationData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g., Helsinki"
                      className="mt-2"
                    />
                    {user.role === 'restaurant' && !locationData.city && (
                      <p className="text-xs text-muted-foreground mt-1">Required for restaurant discovery</p>
                    )}
                  </div>
                  <div>
                    <Label>Street Address</Label>
                    <Input
                      value={locationData.street_address}
                      onChange={(e) => setLocationData(prev => ({ ...prev, street_address: e.target.value }))}
                      placeholder="e.g., Mannerheimintie 10"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input
                      value={locationData.postal_code}
                      onChange={(e) => setLocationData(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="e.g., 00100"
                      className="mt-2"
                    />
                  </div>
                  <Button
                    onClick={saveLocationData}
                    disabled={isSavingLocation}
                    className="bg-[#009EE0] hover:bg-[#009EE0]/90 text-white"
                  >
                    {isSavingLocation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : locationSaved ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      'Save Location'
                    )}
                  </Button>
                </>
              )}
            </div>
          </section>

          {/* Notifications */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bell size={20} />
              Notifications
            </h2>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">Show notifications in the app</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="text-lg font-semibold text-destructive mb-4 flex items-center gap-2">
              <AlertTriangle size={20} />
              Danger Zone
            </h2>
            <div className="bg-destructive-muted rounded-xl border border-destructive/20 p-6">
              <p className="text-sm text-foreground mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>

              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="py-4">
                    <Label className="mb-2 block">
                      Type <span className="font-bold">DELETE</span> to confirm
                    </Label>
                    <Input
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full"
                    />
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                      setDeleteConfirmation('');
                      setIsDeleting(false);
                    }}>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Account'
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </div>
      </MainContent>
    </AppLayout>
  );
}
