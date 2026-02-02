import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function GameAdminScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [scores, setScores] = useState({
    Q1: '',
    Q2: '',
    Q3: '',
    Q4: ''
  });

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
        // Pre-fill existing scores
        setScores({
          Q1: data.quarter_scores.Q1 || '',
          Q2: data.quarter_scores.Q2 || '',
          Q3: data.quarter_scores.Q3 || '',
          Q4: data.quarter_scores.Q4 || ''
        });
      }
    } catch (error) {
      console.error('Error fetching game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateScore = async (quarter: string) => {
    const score = scores[quarter as keyof typeof scores];
    if (!score) {
      Alert.alert('Error', 'Please enter a score');
      return;
    }

    // Validate score format
    const scoreRegex = /^\d+-\d+$/;
    if (!scoreRegex.test(score)) {
      Alert.alert('Error', 'Invalid score format. Use XX-XX (e.g., 21-17)');
      return;
    }

    Alert.alert(
      'Update Score',
      `Update ${quarter} score to ${score}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setUpdating(true);
            try {
              const token = await AsyncStorage.getItem('session_token');
              const response = await fetch(`${BACKEND_URL}/api/games/${id}/score`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  quarter,
                  score
                })
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert(
                  'Success',
                  `Score updated! Winner: ${result.winner_user_id ? 'Found' : 'None'}, Payout: $${result.payout_amount.toFixed(2)}`
                );
                await fetchGame();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.detail || 'Failed to update score');
              }
            } catch (error) {
              console.error('Error updating score:', error);
              Alert.alert('Error', 'Failed to update score');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#16213e' },
          headerTintColor: '#FFF',
          headerTitle: 'Manage Game',
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Game Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{game.event_name}</Text>
            <Text style={styles.subtitle}>Update scores after each quarter</Text>
          </View>

          {/* Score Entry Forms */}
          {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
            const isCompleted = game.quarter_scores[quarter] !== undefined;
            const winnerId = game.winners[quarter];
            const winner = game.squares.find((s: any) => s?.user_id === winnerId);
            const payout = game.payouts?.find((p: any) => p.quarter === quarter);

            return (
              <View key={quarter} style={styles.card}>
                <View style={styles.quarterHeader}>
                  <Text style={styles.quarterTitle}>{quarter}</Text>
                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={styles.completedText}>Done</Text>
                    </View>
                  )}
                </View>

                {isCompleted ? (
                  <View style={styles.completedInfo}>
                    <View style={styles.scoreRow}>
                      <Text style={styles.label}>Score:</Text>
                      <Text style={styles.value}>{game.quarter_scores[quarter]}</Text>
                    </View>
                    {winner && (
                      <View style={styles.winnerRow}>
                        <Ionicons name="trophy" size={20} color="#FFD700" />
                        <Text style={styles.winnerText}>
                          {winner.user_name} wins ${payout?.amount.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={styles.label}>Enter Score (Format: XX-XX)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 21-17"
                      placeholderTextColor="#666"
                      value={scores[quarter as keyof typeof scores]}
                      onChangeText={(text) => setScores({ ...scores, [quarter]: text })}
                      keyboardType="default"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={[styles.updateButton, updating && styles.updateButtonDisabled]}
                      onPress={() => handleUpdateScore(quarter)}
                      disabled={updating}
                    >
                      <Ionicons name="checkmark" size={20} color="#FFF" />
                      <Text style={styles.updateButtonText}>
                        {updating ? 'Updating...' : 'Update Score'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* Payout Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payout Structure</Text>
            <Text style={styles.payoutItem}>• Q1: 20% - ${(game.entry_fee * 10 * 0.2).toFixed(2)}</Text>
            <Text style={styles.payoutItem}>• Q2: 20% - ${(game.entry_fee * 10 * 0.2).toFixed(2)}</Text>
            <Text style={styles.payoutItem}>• Q3: 20% - ${(game.entry_fee * 10 * 0.2).toFixed(2)}</Text>
            <Text style={styles.payoutItem}>• Q4: 40% - ${(game.entry_fee * 10 * 0.4).toFixed(2)}</Text>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
            <Text style={styles.backButtonText}>Back to Game</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
  },
  quarterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quarterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  completedInfo: {
    backgroundColor: '#0f3460',
    padding: 12,
    borderRadius: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#1a4d7a',
    marginBottom: 12,
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.5,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  payoutItem: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 6,
  },
  backButton: {
    flexDirection: 'row',
    backgroundColor: '#0f3460',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  backButtonText: {
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