import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Game {
  game_id: string;
  creator_id: string;
  event_name: string;
  entry_fee: number;
  status: string;
  squares: any[];
  created_at: string;
  user_entries?: any[];
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGames = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/games`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGames();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#888';
      default:
        return '#888';
    }
  };

  const getFilledSquares = (squares: any[]) => {
    return squares.filter(s => s !== null).length;
  };

  const renderGame = ({ item }: { item: Game }) => {
    const filledSquares = getFilledSquares(item.squares);
    const isUserInGame = item.user_entries && item.user_entries.length > 0;

    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => router.push(`/game/${item.game_id}`)}
      >
        <View style={styles.gameHeader}>
          <Text style={styles.eventName}>{item.event_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.gameInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>${item.entry_fee} per square</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color="#2196F3" />
            <Text style={styles.infoText}>{filledSquares}/10 squares filled</Text>
          </View>
          {isUserInGame && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.infoText, { color: '#4CAF50' }]}>
                You're in ({item.user_entries?.length} entries)
              </Text>
            </View>
          )}
        </View>

        {item.creator_id === user?.user_id && (
          <View style={styles.adminBadge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.adminText}>Your Game</Text>
            {item.status === 'active' && (
              <Text style={styles.adminSubtext}> • Tap to enter scores</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
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
        <Text style={styles.title}>Squares</Text>
        <TouchableOpacity onPress={fetchGames}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {games.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="grid-outline" size={80} color="#555" />
          <Text style={styles.emptyText}>No games available</Text>
          <Text style={styles.emptySubtext}>Create your first game!</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={item => item.game_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
          }
        />
      )}
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
  listContent: {
    padding: 16,
  },
  gameCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  gameInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#AAA',
    marginLeft: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
    flexWrap: 'wrap',
  },
  adminText: {
    fontSize: 14,
    color: '#FFD700',
    marginLeft: 6,
    fontWeight: '600',
  },
  adminSubtext: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: '#888',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});