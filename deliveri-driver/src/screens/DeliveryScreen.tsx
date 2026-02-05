import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { LocationTracker, TrackingSession } from '../services/LocationTracker';

interface Delivery {
  id: string;
  restaurant_id: string;
  tracking_status: string | null;
  created_at: string;
  restaurants: {
    name: string;
    address: string | null;
  } | null;
}

interface DeliveryScreenProps {
  driverId: string;
  onLogout: () => void;
}

export function DeliveryScreen({ driverId, onLogout }: DeliveryScreenProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [isStartingTracking, setIsStartingTracking] = useState(false);

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('outgoing_deliveries')
        .select(`
          id,
          restaurant_id,
          tracking_status,
          created_at,
          restaurants (
            name,
            address
          )
        `)
        .eq('driver_id', driverId)
        .in('tracking_status', ['pending', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch deliveries:', error);
        return;
      }

      setDeliveries(data || []);

      // Check for active delivery
      const activeDelivery = data?.find(d => d.tracking_status === 'in_transit');
      if (activeDelivery) {
        setActiveDeliveryId(activeDelivery.id);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();

    // Subscribe to delivery updates
    const channel = supabase
      .channel('driver-deliveries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outgoing_deliveries',
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [driverId]);

  const handleStartTracking = async (delivery: Delivery) => {
    if (activeDeliveryId && activeDeliveryId !== delivery.id) {
      Alert.alert(
        'Active Delivery',
        'You already have an active delivery. Please complete it first.'
      );
      return;
    }

    setIsStartingTracking(true);

    try {
      const session: TrackingSession = {
        deliveryId: delivery.id,
        driverId: driverId,
        restaurantId: delivery.restaurant_id,
      };

      const success = await LocationTracker.startTracking(session);

      if (success) {
        setActiveDeliveryId(delivery.id);
        Alert.alert('Tracking Started', 'Your location is now being shared');
      } else {
        Alert.alert(
          'Permission Required',
          'Location permission is required to track deliveries'
        );
      }
    } catch (error) {
      console.error('Failed to start tracking:', error);
      Alert.alert('Error', 'Failed to start tracking');
    } finally {
      setIsStartingTracking(false);
    }
  };

  const handleStopTracking = async () => {
    Alert.alert(
      'Complete Delivery',
      'Are you sure you want to mark this delivery as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            await LocationTracker.stopTracking();
            setActiveDeliveryId(null);
            fetchDeliveries();
            Alert.alert('Delivery Complete', 'Tracking has stopped');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          if (activeDeliveryId) {
            await LocationTracker.stopTracking();
          }
          await supabase.auth.signOut();
          onLogout();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009EE0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Deliveries</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => {
            setIsRefreshing(true);
            fetchDeliveries();
          }} />
        }
      >
        {deliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Active Deliveries</Text>
            <Text style={styles.emptyText}>
              New deliveries will appear here when assigned to you
            </Text>
          </View>
        ) : (
          deliveries.map((delivery) => (
            <View key={delivery.id} style={styles.deliveryCard}>
              <View style={styles.deliveryInfo}>
                <Text style={styles.restaurantName}>
                  {delivery.restaurants?.name || 'Unknown Restaurant'}
                </Text>
                <Text style={styles.address}>
                  {delivery.restaurants?.address || 'No address'}
                </Text>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      delivery.tracking_status === 'in_transit'
                        ? styles.statusActive
                        : styles.statusPending,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {delivery.tracking_status === 'in_transit'
                        ? 'In Transit'
                        : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>

              {delivery.tracking_status === 'in_transit' ? (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={handleStopTracking}
                >
                  <Text style={styles.buttonText}>Complete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.startButton,
                    isStartingTracking && styles.buttonDisabled,
                  ]}
                  onPress={() => handleStartTracking(delivery)}
                  disabled={isStartingTracking}
                >
                  {isStartingTracking ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Start</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {activeDeliveryId && (
        <View style={styles.trackingBanner}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingText}>Location tracking active</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#009EE0',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  deliveryInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusActive: {
    backgroundColor: '#E3F2FD',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  startButton: {
    backgroundColor: '#009EE0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackingBanner: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  trackingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
