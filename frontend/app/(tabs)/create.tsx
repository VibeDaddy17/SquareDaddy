import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CreateScreen() {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateGame = async () => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return;
    }

    const fee = entryFee === '' ? 0 : parseFloat(entryFee);
    if (isNaN(fee) || fee < 0) {
      Alert.alert('Error', 'Please enter a valid entry fee (0 or greater)');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('session_token');
      const response = await fetch(`${BACKEND_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_name: eventName,
          entry_fee: fee
        })
      });

      if (response.ok) {
        const game = await response.json();
        Alert.alert('Success', 'Game created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setEventName('');
              setEntryFee('');
              router.push(`/game/${game.game_id}`);
            }
          }
        ]);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to create game');
      }
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert('Error', 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Game</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="add-circle" size={60} color="#4CAF50" />
            </View>

            <Text style={styles.description}>
              Create a new sports squares game. Set the event name and entry fee, then share with friends!
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Event Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Super Bowl LIX"
                placeholderTextColor="#666"
                value={eventName}
                onChangeText={setEventName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Entry Fee ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 20"
                placeholderTextColor="#666"
                value={entryFee}
                onChangeText={setEntryFee}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#2196F3" />
              <Text style={styles.infoText}>
                Total pot will be ${entryFee ? (parseFloat(entryFee) * 10).toFixed(2) : '0.00'}
              </Text>
            </View>

            <View style={styles.payoutInfo}>
              <Text style={styles.payoutTitle}>Payout Structure:</Text>
              <Text style={styles.payoutItem}>• Q1: 20% (${entryFee ? (parseFloat(entryFee) * 10 * 0.2).toFixed(2) : '0.00'})</Text>
              <Text style={styles.payoutItem}>• Q2: 20% (${entryFee ? (parseFloat(entryFee) * 10 * 0.2).toFixed(2) : '0.00'})</Text>
              <Text style={styles.payoutItem}>• Q3: 20% (${entryFee ? (parseFloat(entryFee) * 10 * 0.2).toFixed(2) : '0.00'})</Text>
              <Text style={styles.payoutItem}>• Q4: 40% (${entryFee ? (parseFloat(entryFee) * 10 * 0.4).toFixed(2) : '0.00'})</Text>
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateGame}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Game'}
              </Text>
            </TouchableOpacity>
          </View>
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
  header: {
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
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#1a4d7a',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
    flex: 1,
  },
  payoutInfo: {
    backgroundColor: '#0f3460',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  payoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  payoutItem: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 4,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});