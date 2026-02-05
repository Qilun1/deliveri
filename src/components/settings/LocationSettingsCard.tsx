import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Navigation, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LocationSettingsCardProps {
  latitude?: number | null;
  longitude?: number | null;
  deliveryInstructions?: string | null;
  onSave: (data: {
    latitude: number | null;
    longitude: number | null;
    delivery_instructions?: string | null;
  }) => Promise<void>;
  showDeliveryInstructions?: boolean;
  title?: string;
  description?: string;
}

export function LocationSettingsCard({
  latitude: initialLatitude,
  longitude: initialLongitude,
  deliveryInstructions: initialInstructions,
  onSave,
  showDeliveryInstructions = true,
  title = "Delivery Location",
  description = "Set your location for accurate delivery tracking and ETA calculations.",
}: LocationSettingsCardProps) {
  const [latitude, setLatitude] = useState<string>(initialLatitude?.toString() || '');
  const [longitude, setLongitude] = useState<string>(initialLongitude?.toString() || '');
  const [instructions, setInstructions] = useState<string>(initialInstructions || '');
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update state when props change
  useEffect(() => {
    setLatitude(initialLatitude?.toString() || '');
    setLongitude(initialLongitude?.toString() || '');
    setInstructions(initialInstructions || '');
  }, [initialLatitude, initialLongitude, initialInstructions]);

  // Get current location using browser geolocation
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(8));
        setLongitude(position.coords.longitude.toFixed(8));
        setIsLocating(false);
        toast.success('Location detected successfully');
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('Failed to get your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const handleSave = async () => {
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    // Validate coordinates if provided
    if (lat !== null && (lat < -90 || lat > 90)) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    if (lng !== null && (lng < -180 || lng > 180)) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        latitude: lat,
        longitude: lng,
        delivery_instructions: instructions || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving location:', err);
      toast.error('Failed to save location settings');
    } finally {
      setIsSaving(false);
    }
  };

  const hasLocation = latitude && longitude;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#009EE0]" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-detect location button */}
        <Button
          variant="outline"
          onClick={getCurrentLocation}
          disabled={isLocating}
          className="w-full"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Detecting location...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 mr-2" />
              Use Current Location
            </>
          )}
        </Button>

        {/* Manual coordinate input */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="0.00000001"
              placeholder="e.g., 60.1699"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="0.00000001"
              placeholder="e.g., 24.9384"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>

        {/* Location status */}
        {hasLocation ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm">
            <Check className="w-4 h-4" />
            Location set: {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            No location set. Delivery tracking and ETA will not be available.
          </div>
        )}

        {/* Delivery instructions */}
        {showDeliveryInstructions && (
          <div className="space-y-2">
            <Label htmlFor="instructions">Delivery Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="e.g., Ring doorbell twice, use back entrance, etc."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Special instructions for drivers delivering to this location.
            </p>
          </div>
        )}

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#009EE0] hover:bg-[#009EE0]/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            'Save Location Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
