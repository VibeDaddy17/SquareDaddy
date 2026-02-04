import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchGame();
  }, [id]);

  const fetchGame = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/games/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGame(data);
      }
    } catch (error) {
      console.error('Error fetching game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSquare = async (squareNumber: number) => {
    if (game.status !== 'pending') {
      Alert.alert('Error', 'This game is no longer accepting new players');
      return;
    }

    if (game.squares[squareNumber] !== null) {
      Alert.alert('Error', 'This square is already taken');
      return;
    }

    Alert.alert(
      'Join Game',
      `Join square ${squareNumber} for $${game.entry_fee}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            setJoining(true);
            try {
              const token = await AsyncStorage.getItem('session_token');
              const response = await fetch(`${BACKEND_URL}/api/games/${id}/join`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ square_number: squareNumber })
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert('Success', result.message);
                await refreshUser();
                await fetchGame();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to join game');
              }
            } catch (error) {
              console.error('Error joining game:', error);
              Alert.alert('Error', 'Failed to join game');
            } finally {
              setJoining(false);
            }
          }
        }
      ]
    );
  };

  const handleLeaveSquares = async () => {
    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave all your squares? Your entry fee will be refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              const token = await AsyncStorage.getItem('session_token');
              const response = await fetch(`${BACKEND_URL}/api/games/${id}/leave`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert('Success', result.message);
                await refreshUser();
                await fetchGame();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to leave game');
              }
            } catch (error) {
              console.error('Error leaving game:', error);
              Alert.alert('Error', 'Failed to leave game');
            } finally {
              setLeaving(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteGame = async () => {
    Alert.alert(
      'Delete Game',
      'Are you sure you want to delete this game? All players will be refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const token = await AsyncStorage.getItem('session_token');
              const response = await fetch(`${BACKEND_URL}/api/games/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                Alert.alert('Success', 'Game deleted successfully', [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]);
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to delete game');
              }
            } catch (error) {
              console.error('Error deleting game:', error);
              Alert.alert('Error', 'Failed to delete game');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const getWinnerForQuarter = (quarter: string) => {
    return game?.winners?.[quarter] || null;
  };

  const getUserColor = (userId: string) => {
    // 10 distinct, accessible colors with good contrast
    const colors = [
      '#E53935', // Red
      '#FB8C00', // Orange
      '#FDD835', // Yellow
      '#7CB342', // Light Green
      '#00897B', // Teal
      '#039BE5', // Light Blue
      '#5E35B1', // Deep Purple
      '#E91E63', // Pink
      '#8D6E63', // Brown
      '#546E7A', // Blue Grey
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  const isCreator = game.creator_id === user?.user_id;
  const userEntries = game.entries?.filter((e: any) => e.user_id === user?.user_id) || [];
  const canJoinMore = userEntries.length < 2 && game.status === 'pending';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#16213e' },
          headerTintColor: '#FFF',
          headerTitle: game.event_name,
          headerRight: () => (
            isCreator && game.status === 'active' ? (
              <TouchableOpacity
                onPress={() => router.push(`/game/admin/${id}`)}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="settings" size={24} color="#FFF" />
              </TouchableOpacity>
            ) : null
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Game Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Total Pot</Text>
              <Text style={styles.infoValue}>${(game.entry_fee * 10).toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="ticket" size={24} color="#2196F3" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Entry Fee</Text>
              <Text style={styles.infoValue}>${game.entry_fee}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: game.status === 'pending' ? '#FFA500' : game.status === 'active' ? '#4CAF50' : '#888' }
              ]}
            />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{game.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Your Entries */}
        {userEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Entries</Text>
            {userEntries.map((entry: any, index: number) => (
              <View key={index} style={styles.entryItem}>
                <Text style={styles.entrySquare}>Square {entry.square_number}</Text>
                {game.status !== 'pending' && game.random_numbers[entry.square_number] !== null && (
                  <Text style={styles.entryNumber}>Number: {game.random_numbers[entry.square_number]}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Squares Grid */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Squares</Text>
          <View style={styles.gridContainer}>
            {game.squares.map((square: any, index: number) => {
              const isOwnedByUser = square?.user_id === user?.user_id;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.square,
                    square !== null && { backgroundColor: getUserColor(square.user_id) },
                    square === null && canJoinMore && styles.emptySquare,
                    isOwnedByUser && styles.ownedSquare,
                  ]}
                  onPress={() => square === null && canJoinMore && handleJoinSquare(index)}
                  disabled={square !== null || !canJoinMore || joining}
                >
                  {isOwnedByUser && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>YOU</Text>
                    </View>
                  )}
                  {game.status !== 'pending' && game.random_numbers[index] !== null ? (
                    // Active game: Show number badge + user name
                    <>
                      <View style={styles.randomNumberBadge}>
                        <Text style={styles.randomNumber}>{game.random_numbers[index]}</Text>
                      </View>
                      <Text style={styles.squareUserActive} numberOfLines={1}>
                        {square?.user_name?.length > 10 
                          ? square.user_name.substring(0, 10) + '...'
                          : square?.user_name}
                      </Text>
                    </>
                  ) : square !== null ? (
                    // Pending game: Show user name only
                    <Text style={styles.squareUser} numberOfLines={2}>
                      {square.user_name.length > 12 
                        ? square.user_name.substring(0, 12) + '...'
                        : square.user_name}
                    </Text>
                  ) : canJoinMore ? (
                    // Empty square: Show "Click to Pick"
                    <Text style={styles.clickToPickText}>Click to Pick</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Scores & Winners */}
        {(game.status === 'active' || game.status === 'completed') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Scores & Winners</Text>
            {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
              const score = game.quarter_scores[quarter];
              const winnerId = getWinnerForQuarter(quarter);
              const winner = game.squares.find((s: any) => s?.user_id === winnerId);
              const payout = game.payouts?.find((p: any) => p.quarter === quarter);
              
              // Calculate winning number if score exists
              let winningNumber = null;
              if (score) {
                const [team1, team2] = score.split('-').map(s => parseInt(s));
                winningNumber = (team1 % 10 + team2 % 10) % 10;
              }

              return (
                <View key={quarter} style={styles.quarterItem}>
                  <View style={styles.quarterHeader}>
                    <Text style={styles.quarterLabel}>{quarter}</Text>
                    {score ? (
                      <Text style={styles.quarterScore}>{score}</Text>
                    ) : (
                      <Text style={styles.quarterNotEntered}>Not entered</Text>
                    )}
                  </View>
                  {score && (
                    <View style={styles.quarterDetails}>
                      <View style={styles.winningNumberContainer}>
                        <Text style={styles.winningNumberLabel}>Winning #:</Text>
                        <View style={styles.winningNumberBadge}>
                          <Text style={styles.winningNumberText}>{winningNumber}</Text>
                        </View>
                      </View>
                      {winner && payout ? (
                        <View style={styles.winnerInfo}>
                          <Ionicons name="trophy" size={16} color="#FFD700" />
                          <Text style={styles.winnerText}>
                            {winner.user_name} wins ${payout.amount.toFixed(2)}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noWinnerText}>No winner (empty square)</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Admin Button */}
        {isCreator && game.status === 'active' && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push(`/game/admin/${id}`)}
          >
            <Ionicons name="settings" size={24} color="#FFF" />
            <Text style={styles.adminButtonText}>Manage Game</Text>
          </TouchableOpacity>
        )}

        {/* Leave Squares Button */}
        {userEntries.length > 0 && game.status === 'pending' && (
          <TouchableOpacity
            style={[styles.leaveButton, leaving && styles.leaveButtonDisabled]}
            onPress={handleLeaveSquares}
            disabled={leaving}
          >
            <Ionicons name="exit-outline" size={24} color="#FFF" />
            <Text style={styles.leaveButtonText}>
              {leaving ? 'Leaving...' : 'Leave All My Squares'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Delete Game Button (Creator Only) */}
        {isCreator && game.status === 'pending' && (
          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
            onPress={handleDeleteGame}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={24} color="#FFF" />
            <Text style={styles.deleteButtonText}>
              {deleting ? 'Deleting...' : 'Delete Game'}
            </Text>
          </TouchableOpacity>
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
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTextContainer: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#AAA',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  entryItem: {
    padding: 12,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    marginBottom: 8,
  },
  entrySquare: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  entryNumber: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  square: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#1a4d7a',
    padding: 4,
    position: 'relative',
  },
  emptySquare: {
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  ownedSquare: {
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  youBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFD700',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  youBadgeText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#000',
  },
  randomNumberBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 36,
    alignItems: 'center',
    marginBottom: 4,
  },
  randomNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  squareUser: {
    fontSize: 10,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  squareUserActive: {
    fontSize: 8,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 2,
  },
  clickToPickText: {
    fontSize: 9,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  quarterItem: {
    padding: 12,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    marginBottom: 8,
  },
  quarterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quarterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  quarterScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  quarterNotEntered: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  quarterDetails: {
    marginTop: 4,
  },
  winningNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  winningNumberLabel: {
    fontSize: 14,
    color: '#AAA',
    marginRight: 8,
  },
  winningNumberBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  winningNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '600',
  },
  noWinnerText: {
    fontSize: 13,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  adminButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  adminButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  leaveButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  leaveButtonDisabled: {
    opacity: 0.5,
  },
  leaveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#F44336',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 18,
    color: '#888',
  },
});