import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile & Family</Text>
        <Text style={styles.subtitle}>Manage your safe network</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite Code</Text>
          <Text style={styles.inviteCode}>SGNL-8X92</Text>
          <Text style={styles.helperText}>Share this code with your family members to add them to your safe zone.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 2,
    marginBottom: 12,
  },
  helperText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
  },
});
