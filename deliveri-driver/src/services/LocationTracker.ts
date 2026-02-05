import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';

const LOCATION_TASK_NAME = 'DELIVERI_BACKGROUND_LOCATION';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];

    if (location) {
      await LocationTracker.sendLocationUpdate(location);
    }
  }
});

export interface TrackingSession {
  deliveryId: string;
  driverId: string;
  restaurantId: string;
}

class LocationTrackerService {
  private currentSession: TrackingSession | null = null;
  private isTracking = false;
  private foregroundSubscription: Location.LocationSubscription | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      console.error('Foreground location permission denied');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission denied - tracking will only work in foreground');
    }

    return true;
  }

  async startTracking(session: TrackingSession): Promise<boolean> {
    if (this.isTracking) {
      console.warn('Already tracking');
      return true;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    this.currentSession = session;

    // Update delivery status to in_transit
    const { error: updateError } = await supabase
      .from('outgoing_deliveries')
      .update({
        tracking_status: 'in_transit',
        tracking_started_at: new Date().toISOString(),
      })
      .eq('id', session.deliveryId);

    if (updateError) {
      console.error('Failed to update delivery status:', updateError);
    }

    // Start foreground tracking
    this.foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Or every 10 meters
      },
      (location) => {
        this.sendLocationUpdate(location);
      }
    );

    // Start background tracking
    const backgroundStatus = await Location.getBackgroundPermissionsAsync();
    if (backgroundStatus.status === 'granted') {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Update every 10 seconds in background
        distanceInterval: 20, // Or every 20 meters
        deferredUpdatesInterval: 10000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'DeliVeri - Tracking Active',
          notificationBody: 'Your location is being shared for delivery tracking',
          notificationColor: '#009EE0',
        },
      });
    }

    this.isTracking = true;
    return true;
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    // Stop foreground tracking
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }

    // Stop background tracking
    const isTaskRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTaskRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    // Update delivery status
    if (this.currentSession) {
      const { error } = await supabase
        .from('outgoing_deliveries')
        .update({
          tracking_status: 'delivered',
          tracking_ended_at: new Date().toISOString(),
        })
        .eq('id', this.currentSession.deliveryId);

      if (error) {
        console.error('Failed to update delivery status:', error);
      }
    }

    this.currentSession = null;
    this.isTracking = false;
  }

  async sendLocationUpdate(location: Location.LocationObject): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    const { latitude, longitude, speed, heading, accuracy } = location.coords;

    const { error } = await supabase.from('delivery_locations').insert({
      delivery_id: this.currentSession.deliveryId,
      driver_id: this.currentSession.driverId,
      latitude,
      longitude,
      speed: speed ?? null,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
    });

    if (error) {
      console.error('Failed to send location update:', error);
    }
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }

  getCurrentSession(): TrackingSession | null {
    return this.currentSession;
  }
}

export const LocationTracker = new LocationTrackerService();
