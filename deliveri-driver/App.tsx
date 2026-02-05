import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase';
import { LoginScreen } from './src/screens/LoginScreen';
import { DeliveryScreen } from './src/screens/DeliveryScreen';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setDriverId(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        await loadDriverId(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadDriverId(session.user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDriverId = async (userId: string) => {
    try {
      const { data: driver, error } = await supabase
        .from('drivers')
        .select('id, is_active')
        .eq('user_id', userId)
        .single();

      if (error || !driver || !driver.is_active) {
        await supabase.auth.signOut();
        return;
      }

      setDriverId(driver.id);
    } catch (error) {
      console.error('Error loading driver:', error);
    }
  };

  const handleLoginSuccess = (id: string) => {
    setDriverId(id);
  };

  const handleLogout = () => {
    setDriverId(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#009EE0" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {driverId ? (
        <DeliveryScreen driverId={driverId} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      <StatusBar style={driverId ? 'light' : 'light'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
