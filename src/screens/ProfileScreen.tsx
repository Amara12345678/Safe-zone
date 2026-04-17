import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { LogOut, Clock, Users, Edit2, Plus, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { updateCheckinSchedule, joinFamily, updateUserProfile } from '../services/userService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleWeeklyReminders } from '../services/notificationService';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, userData, refreshUserData } = useAuth();
  
  const [showPicker, setShowPicker] = useState(false);
  const [editingIndex, setEditingIndex] = useState(0);
  const [tempDate, setTempDate] = useState(new Date());
  const [schedule, setSchedule] = useState<string[]>(['12:00', '18:00']);

  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [showEditStatusOptions, setShowEditStatusOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const statuses = ['Хүү', 'Охин', 'Аав', 'Ээж', 'Эмээ', 'Өвөө'];

  React.useEffect(() => {
    if (userData?.checkinSchedule) {
      setSchedule(userData.checkinSchedule);
    }
  }, [userData]);

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    
    if (selectedDate && user) {
      try {
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;

        const newSchedule = [...schedule];
        newSchedule[editingIndex] = timeString;
        newSchedule.sort(); 
        
        setSchedule(newSchedule);
        await updateCheckinSchedule(user.uid, newSchedule);
        
        // IMMEDIATE RE-SCHEDULING of alarms
        await scheduleWeeklyReminders(newSchedule);
        
        await refreshUserData();
        Alert.alert("Амжилттай", "Чекин хийх цагийг шинэчиллээ.");
      } catch (e: any) {
        Alert.alert("Алдаа", "Хадгалахад алдаа гарлаа: " + e.message);
      }
    }
  };

  const handleJoinFamily = async () => {
    if (!user || !joinCode.trim()) {
      Alert.alert("Анхаар", "Урилгын кодоо оруулна уу.");
      return;
    }
    
    try {
      setIsJoining(true);
      await joinFamily(user.uid, joinCode.trim().toUpperCase());
      await refreshUserData();
      setJoinCode('');
      Alert.alert("Амжилттай", "Та гэр бүлдээ амжилттай нэгдлээ!");
    } catch (e: any) {
      Alert.alert("Алдаа", "Холбогдоход алдаа гарлаа: " + e.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleEditProfile = () => {
    setEditName(userData?.name || '');
    setEditStatus(userData?.status || 'Гишүүн');
    setShowEditModal(true);
  };

  const saveProfileEdit = async () => {
    if (!user) return;
    if (editName.trim().length === 0) {
      Alert.alert("Анхаар", "Нэрээ оруулна уу.");
      return;
    }
    try {
      setIsSaving(true);
      await updateUserProfile(user.uid, editName.trim(), editStatus);
      await refreshUserData();
      setShowEditModal(false);
    } catch (e: any) {
      Alert.alert("Алдаа", "Хадгалахад алдаа гарлаа: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Системээс гарах", 
      "Та үнэхээр гарахдаа итгэлтэй байна уу?", 
      [
        { text: "Үгүй", style: "cancel" },
        { 
          text: "Гарах", 
          style: "destructive",
          onPress: async () => {
            await signOut(getAuth());
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={true}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Профайл</Text>
            <Text style={styles.subtitle}>{userData?.name || 'Нэргүй'} • {userData?.status || 'Гишүүн'}</Text>
          </View>
          <TouchableOpacity onPress={handleEditProfile} style={styles.editIconBtn}>
            <Edit2 color="#2563eb" size={24} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={[styles.card, { paddingVertical: 16 }]} onPress={() => setShowInviteModal(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ padding: 10, backgroundColor: '#f0fdf4', borderRadius: 10, marginRight: 12 }}>
                <Plus color="#16a34a" size={24} />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a365d' }}>Гэр бүл үүсгэх</Text>
                <Text style={{ fontSize: 13, color: '#64748b' }}>Шинэ гишүүн урих код авах</Text>
              </View>
            </View>
            <Text style={{ fontSize: 24, color: '#cbd5e1' }}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, { paddingVertical: 16 }]} onPress={() => navigation.navigate('Family')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ padding: 10, backgroundColor: '#eff6ff', borderRadius: 10, marginRight: 12 }}>
                <Users color="#2563eb" size={24} />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1a365d' }}>Миний Гэр бүл</Text>
                <Text style={{ fontSize: 13, color: '#64748b' }}>Гэр бүлийн гишүүдээ харах</Text>
              </View>
            </View>
            <Text style={{ fontSize: 24, color: '#cbd5e1' }}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Өөр гэр бүлд нэгдэх</Text>
          <Text style={styles.helperText}>Урилгын кодоо доор бичээд гэр бүлдээ нэгдээрэй.</Text>
          
          <View style={styles.joinForm}>
            <TextInput
              style={styles.joinInput}
              placeholder="Код оруулах (Жнь: SGNL-XX)"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              editable={!isJoining}
            />
            <TouchableOpacity 
              style={[styles.joinButton, isJoining && { opacity: 0.5 }]} 
              onPress={handleJoinFamily}
              disabled={isJoining}
            >
              <Users color="white" size={18} />
              <Text style={styles.joinButtonText}>Нэгдэх</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Чекин (Safe) хийх цагууд</Text>
          <Text style={styles.helperText}>Эдгээр цагуудад танд Чекин хийх сануулга очих бөгөөд 10 минут хоцорвол гэр бүлийнхэнд тань анхааруулна.</Text>
          
          <View style={styles.timeRowContainer}>
            {schedule.map((time, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.timeButton}
                onPress={() => {
                  setEditingIndex(idx);
                  const [h, m] = time.split(':').map(Number);
                  const d = new Date();
                  d.setHours(h, m, 0, 0);
                  setTempDate(d);
                  setShowPicker(true);
                }}
              >
                <Clock color="#2563eb" size={20} />
                <Text style={styles.timeButtonText}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {showPicker && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'android' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            textColor="#1e293b" // Force dark color for visibility
          />
        )}

        {/* Edit Profile Modal */}
        <Modal visible={showEditModal} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Мэдээлэл засах</Text>
              
              {!showEditStatusOptions ? (
                <View style={{width: '100%'}}>
                  <Text style={styles.inputLabel}>Таны нэр</Text>
                  <TextInput 
                    style={styles.fullInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Нэрээ оруулна уу"
                  />
                  
                  <Text style={styles.inputLabel}>Гэр бүлийн статус</Text>
                  <TouchableOpacity 
                    style={styles.fullInput}
                    onPress={() => setShowEditStatusOptions(true)}
                  >
                    <Text style={{fontSize: 16}}>{editStatus}</Text>
                  </TouchableOpacity>

                  <View style={[styles.modalBtns, {marginTop: 20}]}>
                    <TouchableOpacity onPress={() => setShowEditModal(false)}>
                      <Text style={styles.modalCancel}>Цуцлах</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveProfileEdit} disabled={isSaving}>
                      <Text style={styles.modalOk}>{isSaving ? 'Уншиж байна...' : 'Хадгалах'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{width: '100%'}}>
                  <Text style={styles.modalSub}>Статусаа сонгоно уу</Text>
                  <ScrollView style={{maxHeight: 200, width: '100%'}}>
                    {statuses.map((s, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={{padding: 15, borderBottomWidth: 1, borderColor: '#f1f5f9'}}
                        onPress={() => {
                          setEditStatus(s);
                          setShowEditStatusOptions(false);
                        }}
                      >
                        <Text style={{fontSize: 16, textAlign: 'center'}}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Invite Code Modal */}
        <Modal visible={showInviteModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingVertical: 40 }]}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowInviteModal(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
              
              <Text style={[styles.cardTitle, { fontSize: 20 }]}>Таны урилгын код</Text>
              <Text style={[styles.inviteCode, { fontSize: 40 }]}>{userData?.familyCode || 'УНШИЖ БАЙНА...'}</Text>
              <Text style={[styles.helperText, { paddingHorizontal: 20 }]}>
                Энэхүү кодыг гэр бүлийнхэндээ илгээснээр тэд тантай нэг сүлжээнд нэгдэж, аюулгүйн хүрээлэл тань томорно.
              </Text>
              
              <TouchableOpacity 
                style={[styles.joinButton, { width: '80%', marginTop: 30 }]} 
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={styles.joinButtonText}>Ойлголоо</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.logoutText}>Системээс гарах</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  editIconBtn: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
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
    marginBottom: 30,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 16,
    marginTop: 20, // Replaced marginTop: 'auto' so it plays nicely below cards in scroll
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timeRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  timeButtonText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  joinForm: {
    width: '100%',
    marginTop: 15,
  },
  joinInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  joinButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  modalSub: { color: 'gray', marginBottom: 20 },
  modalInput: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    borderBottomWidth: 2,
    borderColor: '#2563eb',
    padding: 10,
    width: 120,
    textAlign: 'center',
    marginBottom: 30
  },
  modalBtns: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 20 },
  modalCancel: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  modalOk: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  inputLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    marginTop: 10,
    fontWeight: 'bold',
  },
  fullInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  }
});
