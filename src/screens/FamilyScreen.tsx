import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, User, MapPin } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { translations } from '../utils/translations';

export default function FamilyScreen() {
  const navigation = useNavigation();
  const { userData, user: currentUser, language } = useAuth();
  const t = translations[language];
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyCode) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .where('familyCode', '==', userData.familyCode)
      .onSnapshot(
        (snapshot) => {
          if (snapshot) {
            const fetchedMembers = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMembers(fetchedMembers);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching family:", error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [userData?.familyCode]);

  const handleViewLocation = (member: any) => {
    if (!member.lastLocation) {
      Alert.alert(
        t.noLocation,
        t.noLocationMsg
      );
      return;
    }

    const { lat, lng } = member.lastLocation;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return t.justNowLower;
      if (diffMins < 60) return `${diffMins} ${t.minsAgo}`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} ${t.hoursAgo}`;
      
      return date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  const renderMember = ({ item }: { item: any }) => {
    const isMe = item.id === currentUser?.uid;

    return (
      <View style={[styles.memberCard, isMe && styles.myCard]}>
        <View style={styles.avatarContainer}>
          <User color={isMe ? "#0052cc" : "#64748b"} size={28} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>
            {item.name || t.unknownName} {isMe && <Text style={styles.meBadge}>({t.you})</Text>}
          </Text>
          <Text style={styles.statusText}>{item.status || t.member}</Text>
          {item.locationTimestamp && (
            <Text style={styles.lastSeenText}>{t.lastSeen}: {formatLastSeen(item.locationTimestamp)}</Text>
          )}
        </View>

        {!isMe && (
          <TouchableOpacity 
            style={styles.locationBtn}
            onPress={() => handleViewLocation(item)}
          >
            <MapPin color={item.lastLocation ? "#0052cc" : "#94a3b8"} size={24} />
            <Text style={[styles.locationBtnText, !item.lastLocation && styles.disabledText]}>{t.location}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1a365d" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.familyMembersHead}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0052cc" />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{t.noMembers}</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: 'white',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  listContent: {
    padding: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  myCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#f0f9ff',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  meBadge: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: 'normal',
  },
  statusText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  lastSeenText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  locationBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    padding: 4,
  },
  locationBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0052cc',
    marginTop: 2,
  },
  disabledText: {
    color: '#94a3b8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  }
});
