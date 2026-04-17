import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, CheckCircle2 } from 'lucide-react-native';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'sos',
    title: 'SOS Alert!',
    message: 'Sarah triggered an SOS signal. Location: 47.9189, 106.9176',
    time: '2 minutes ago'
  },
  {
    id: '2',
    type: 'safe',
    title: 'Check-in',
    message: 'John checked in safely for the day.',
    time: '3 hours ago'
  }
];

export default function NotificationsScreen() {
  const renderItem = ({ item }: any) => (
    <View style={styles.notificationItem}>
      <View style={styles.iconContainer}>
        {item.type === 'sos' ? (
          <ShieldAlert color="#e11d48" size={24} />
        ) : (
          <CheckCircle2 color="#16a34a" size={24} />
        )}
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, item.type === 'sos' && styles.sosTitle]}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity & Alerts</Text>
      </View>
      <FlatList
        data={MOCK_NOTIFICATIONS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  sosTitle: {
    color: '#e11d48',
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
