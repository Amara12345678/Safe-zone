import React from 'react';
import { View, Text, StyleSheet, FlatList, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, CheckCircle2, User, AlertTriangle, MapPin } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { verifyMissedCheckins } from '../services/checkinService';
import { translations } from '../utils/translations';

export default function NotificationsScreen() {
  const { userData, language } = useAuth();
  const t = translations[language];
  const [alerts, setAlerts] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!userData?.familyCode) {
      console.log("[DEBUG] No familyCode available yet, skipping alert subscription.");
      return;
    }

    // Trigger lazy evaluation for missed checkins across the family
    verifyMissedCheckins(userData.uid, userData.familyCode);

    // 24-Hour Cleanup Logic (Fixed: No index required)
    const cleanupOldAlerts = async () => {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      
      try {
        // We fetch by familyCode only to avoid composite index requirement
        const snapshot = await firestore()
          .collection('alerts')
          .where('familyCode', '==', String(userData.familyCode))
          .get();
          
        if (!snapshot.empty) {
          const batch = firestore().batch();
          let count = 0;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.timestamp && data.timestamp.toDate() < yesterday) {
              batch.delete(doc.ref);
              count++;
            }
          });
          
          if (count > 0) {
            console.log(`[DEBUG] Cleaning up ${count} stale alerts older than 24h.`);
            await batch.commit();
          }
        }
      } catch (err) {
        console.error("[DEBUG] Error during alert cleanup:", err);
      }
    };

    cleanupOldAlerts();

    console.log(`[DEBUG] Subscribing to alerts for familyCode: ${userData.familyCode}`);

    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const subscriber = firestore()
      .collection('alerts')
      .where('familyCode', '==', String(userData.familyCode))
      .limit(50) // Increased limit to ensure we get recent ones after filtering
      .onSnapshot(
        querySnapshot => {
          if (!querySnapshot) return;
          
          const newAlerts: any[] = [];
          querySnapshot.forEach(documentSnapshot => {
            const data = documentSnapshot.data();
            const alertDate = data.timestamp ? data.timestamp.toDate() : new Date();
            
            // Filter 24h on client side to avoid index error
            if (alertDate >= yesterday) {
              newAlerts.push({
                id: documentSnapshot.id,
                ...data,
                sortTime: alertDate.getTime(),
                time: data.timestamp ? alertDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : t.justNow
              });
            }
          });

          newAlerts.sort((a, b) => b.sortTime - a.sortTime);
          setAlerts(newAlerts);
        },
        error => console.error("[DEBUG] Firestore onSnapshot error:", error)
      );

    return () => subscriber();
  }, [userData?.familyCode]);

  const renderItem = ({ item }: any) => (
    <View style={styles.notificationItem}>
      <View style={[styles.avatarContainer, { backgroundColor: item.type === 'safe' ? '#dcfce7' : '#fee2e2' }]}>
        <User color={item.type === 'safe' ? "#16a34a" : "#ef4444"} size={24} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{item.userName || t.unknownName} <Text style={styles.userStatus}>• {item.userStatus || t.member}</Text></Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <View style={[styles.messageBox, { backgroundColor: item.type === 'safe' ? '#f0fdf4' : '#fef2f2' }]}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
            {item.type === 'safe' ? <CheckCircle2 color="#16a34a" size={16} style={{marginRight: 6}} /> : <AlertTriangle color="#ef4444" size={16} style={{marginRight: 6}} />}
            <Text style={[styles.title, (item.type === 'missed' || item.type === 'sos') && styles.sosTitle]}>{item.title}</Text>
          </View>
          <Text style={styles.message}>{item.message}</Text>
          
          {item.location && (
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}`;
                Linking.openURL(url);
              }}
            >
              <MapPin color="#2563eb" size={16} style={{marginRight: 6}} />
              <Text style={styles.locationText}>{t.viewLocation}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.recentEvents}</Text>
      </View>
      <FlatList
        data={alerts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: 'gray'}}>{t.noNotifications}</Text>}
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
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  userStatus: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#64748b',
  },
  messageBox: {
    padding: 12,
    borderRadius: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  sosTitle: {
    color: '#ef4444',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600'
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: 'bold',
  },
});
