import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface ProfileData {
  user: any;
  entries: any[];
  payouts: any[];
  created_games: any[];
  total_winnings: number;
}

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      fetchProfile();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    refreshUser();
    fetchProfile();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#FF5252" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
        }
      >
        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#4CAF50" />
              </View>
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#4CAF50" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.card}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={24} color="#4CAF50" />
            <Text style={styles.balanceLabel}>Mock Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>${user?.mock_balance?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.balanceNote}>*This is mock money for testing</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
            <Text style={styles.statValue}>${profileData?.total_winnings?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.statLabel}>Total Winnings</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="ticket" size={32} color="#2196F3" />
            <Text style={styles.statValue}>{profileData?.entries?.length || 0}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="game-controller" size={32} color="#9C27B0" />
            <Text style={styles.statValue}>{profileData?.created_games?.length || 0}</Text>
            <Text style={styles.statLabel}>Games Created</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cash" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{profileData?.payouts?.length || 0}</Text>
            <Text style={styles.statLabel}>Payouts</Text>
          </View>
        </View>

        {/* Recent Payouts */}
        {profileData && profileData.payouts.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Payouts</Text>
            {profileData.payouts.slice(0, 5).map((payout, index) => (
              <View key={index} style={styles.payoutItem}>
                <View>
                  <Text style={styles.payoutQuarter}>{payout.quarter}</Text>
                  <Text style={styles.payoutDate}>
                    {new Date(payout.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.payoutAmount}>${payout.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 18,
    color: '#AAA',
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  balanceNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  payoutQuarter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  payoutDate: {
    fontSize: 12,
    color: '#AAA',
    marginTop: 2,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});