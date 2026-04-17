import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, Image } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, User, PhoneCall, Shield, AlertTriangle, Activity, X, Phone, PhoneOff, HeartPulse, Flame } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';
import { triggerSOS, sendTestFamilyNotification } from '../services/sosService';
import { updateExpoPushToken } from '../services/userService';
import { logCheckin, getTodayCheckinsCount } from '../services/checkinService';
import {
  checkExactAlarmPermission,
  triggerLocalSOSAlarm,
  stopAlarmSound,
  playAlarmSound,
  requestNotificationPermissions,
  scheduleWeeklyReminders,
  cancelReminderForTime,
  sendImmediateTestNotification,
  triggerFakeCallNotification,
  startVibration,
  stopVibration
} from '../services/notificationService';

const SAFETY_TIPS = [
  { text: "Танихгүй хүнтэй ярилцаж болохгүй шүү 🛑", icon: "Shield" },
  { text: "Гэртээ харихдаа замаа анхаараарай 🚶", icon: "MapPin" },
  { text: "Утсаа байнга цэнэглэж байгаарай 🔋", icon: "Activity" },
  { text: "Гэр бүлийнхэн тань таныг хамгаалж байна ❤️", icon: "HeartPulse" },
];

export default function HomeScreen() {
  const { user, userData } = useAuth();
  const [loadingSOS, setLoadingSOS] = React.useState(false);
  const [loadingSafe, setLoadingSafe] = React.useState(false);
  const [checkinsCount, setCheckinsCount] = React.useState(0);
  const [isAlarmSounding, setIsAlarmSounding] = React.useState(false);
  const [isFakeCallIncoming, setIsFakeCallIncoming] = React.useState(false);
  const [isFakeCallConnected, setIsFakeCallConnected] = React.useState(false);
  const [fakeCaller, setFakeCaller] = React.useState('');
  const [isStatusModalVisible, setIsStatusModalVisible] = React.useState(false); // Added
  const [targetTime, setTargetTime] = React.useState(''); // Added
  const [activeTipIndex, setActiveTipIndex] = React.useState(0);
  const [callSeconds, setCallSeconds] = React.useState(0);
  const [selfToken, setSelfToken] = React.useState('Ачаалж байна...');
  const [lastEvent, setLastEvent] = React.useState('Мэдэгдэл ирээгүй');
  const callTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastHandledAlertIdRef = React.useRef(new Set<string>()); // Use a Set to track all handled alerts
  const hasShownPermissionAlert = React.useRef(false); // To prevent nagging for permissions

  React.useEffect(() => {
    if (user?.uid) {
      getTodayCheckinsCount(user.uid).then(setCheckinsCount);
      // Ask for location upfront right after login/registration as requested
      Location.requestForegroundPermissionsAsync();

      // Setup Notifications & Alarms
      const setupAlarms = async () => {
        const { status, token } = await requestNotificationPermissions();
        if (status) {
          // Sync push token to Firestore for alert delivery
          if (token) {
            setSelfToken(token); // Display in debug panel
            await updateExpoPushToken(user.uid, token);
            console.log("[DEBUG] Push token synced to Firestore.");
          } else {
            setSelfToken("Токен олдсонгүй");
          }

          // Check for Exact Alarms on Android
          const hasExactPermission = await checkExactAlarmPermission();
          if (Platform.OS === 'android' && !hasExactPermission && !hasShownPermissionAlert.current) {
            hasShownPermissionAlert.current = true;
            Alert.alert(
              "Сэрүүлгийн зөвшөөрөл",
              "Андройдын шинэ хувилбарууд дээр сэрүүлэг ажиллуулахын тулд 'Alarms & Reminders' зөвшөөрөл шаардлагатай. Та тохиргоо руу орж зөвшөөрөл өгнө үү.",
              [
                { text: "Цуцлах", style: "cancel" },
                { text: "Тохиргоо нээх", onPress: () => Linking.openSettings() }
              ]
            );
          }

          if (userData?.checkinSchedule) {
            await scheduleWeeklyReminders(userData.checkinSchedule);
          }
        } else if (!hasShownPermissionAlert.current) {
          hasShownPermissionAlert.current = true;
          Alert.alert(
            "Мэдэгдэл зөвшөөрөх",
            "Сэрүүлэг ажиллуулахын тулд мэдэгдэл илгээх зөвшөөрөл шаардлагатай. Та утасныхаа тохиргоо руу орж зөвшөөрөл өгнө үү."
          );
        }
      };
      setupAlarms();

      // Listen for incoming notifications to play the siren if it's an SOS
      const subscription = Notifications.addNotificationReceivedListener(notification => {
        const data = notification.request.content.data;
        const channelId = (notification.request.content as any).android?.channelId;
        
        console.log("[DEBUG] Notification Received in Foreground:", JSON.stringify(data));
        setLastEvent(`Foreground: ${JSON.stringify(data)}`);

        if (channelId === 'sos-final-siren' || data?.type === 'sos') {
          console.log("[DEBUG] SOS Notification detected, starting siren!");
          setIsAlarmSounding(true);
          playAlarmSound();
          startVibration('sos');
        } else if (data?.type === 'fake-call') {
          setFakeCaller(data.caller as string || 'Unknown');
          setIsFakeCallIncoming(true);
          playAlarmSound(); 
          startVibration('call');
        }
      });

      // Listen for when a user interacts with a notification (Background -> Foreground)
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        console.log("[DEBUG] User interacted with notification:", JSON.stringify(data));
        setLastEvent(`Tapped: ${JSON.stringify(data)}`);
        
        if (data?.type === 'sos') {
          console.log("[DEBUG] User tapped SOS notification, starting siren!");
          setIsAlarmSounding(true);
          playAlarmSound();
          startVibration('sos');
        }
      });

      return () => {
        subscription.remove();
        responseSubscription.remove();
        if (callTimerRef.current) clearInterval(callTimerRef.current);
      };
    }
  }, [user, userData?.checkinSchedule]);

  // Firestore SOS Sync: Listen for new SOS events directly in the database
  // This is a 100% reliable backup for when Push Notifications fail
  React.useEffect(() => {
    if (!user || !userData?.familyCode) return;

    console.log(`[DEBUG] Starting Firestore Real-time SOS Sync for family: ${userData.familyCode}`);
    
    const unsubscribe = firestore()
      .collection('alerts')
      .where('familyCode', '==', String(userData.familyCode))
      .where('type', '==', 'sos')
      .onSnapshot((snapshot: any) => {
        if (!snapshot) return;
        
        // Define "recent" as within the last 2 minutes for tighter control
        const recentLimit = new Date();
        recentLimit.setMinutes(recentLimit.getMinutes() - 2);

        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const alertId = doc.id;
          const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();

          // Only trigger if:
          // 1. It's not our own SOS
          // 2. It's very recent (last 2 mins)
          // 3. We haven't handled THIS specific alert ID already
          if (
            !lastHandledAlertIdRef.current.has(alertId) &&
            data.userId !== user.uid &&
            timestamp > recentLimit
          ) {
            console.log(`[DEBUG] REAL-TIME SOS DETECTED via Firestore sync! AlertID: ${alertId}`);
            lastHandledAlertIdRef.current.add(alertId); // Mark as handled immediately
            setLastEvent(`Real-time SOS from: ${data.userName}`);
            
            // Show immediate Local Notification so the name is visible
            Notifications.scheduleNotificationAsync({
              content: {
                title: '🔴 SOS ЯАРАЛТАЙ ТУСЛАМЖ!',
                body: `${data.userName || 'Гэр бүлийн гишүүн'} SOS дохио өглөө! Яаралтай туслаарай.`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: { type: 'sos', alertId },
                android: {
                  channelId: 'sos-final-siren',
                  color: '#dc2626',
                }
              } as any,
              trigger: null,
            });

            setIsAlarmSounding(true);
            playAlarmSound();
            startVibration('sos');
          } else if (!lastHandledAlertIdRef.current.has(alertId)) {
            // Even if we don't trigger siren (e.g. too old), mark it handled 
            // so if someone edits it later, it doesn't suddenly fire
            lastHandledAlertIdRef.current.add(alertId);
          }
        });
      }, (err: any) => {
        console.error("[DEBUG] Firestore SOS Sync Error:", err);
      });

    return () => unsubscribe();
  }, [user, userData?.familyCode]);

  React.useEffect(() => {
    if (isFakeCallConnected) {
      callTimerRef.current = setInterval(() => {
        setCallSeconds(s => s + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallSeconds(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isFakeCallConnected]);

  React.useEffect(() => {
    const tipInterval = setInterval(() => {
      setActiveTipIndex(prev => (prev + 1) % SAFETY_TIPS.length);
    }, 8000); // Rotate every 8 seconds

    return () => clearInterval(tipInterval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSOS = async () => {
    if (!user || !userData?.familyCode) return;

    // Check location permission before attempt
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert(
          'Байршлын зөвшөөрөл',
          'SOS дохиотой хамт байршлаа илгээхийн тулд байршил тогтоох зөвшөөрөл шаардлагатай. Та тохиргоо руу орж зөвшөөрөл өгнө үү.'
        );
      }
    }

    try {
      setLoadingSOS(true);
      await triggerSOS(user.uid, userData.familyCode);
      Alert.alert('Амжилттай', 'Гэр бүлийнхэнд тань яаралтай дохио болон байршлыг амжилттай илгээлээ!');
    } catch (e: any) {
      Alert.alert('Алдаа', 'Дохио илгээхэд алдаа гарлаа: ' + e.message);
    } finally {
      setLoadingSOS(false);
    }
  };

  const handleStopSiren = async () => {
    setIsAlarmSounding(false);
    await stopAlarmSound();
    stopVibration();
  };

  const emergencyStopSiren = async () => {
    console.log("[DEBUG] EMERGENCY STOP TRIGGERED");
    setIsAlarmSounding(false);
    setIsFakeCallIncoming(false);
    setIsFakeCallConnected(false);
    await stopAlarmSound();
    stopVibration();
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    Alert.alert("Систем", "Бүх сэрүүлгийг хүчээр зогсоолоо.");
  };

  const handleTestNotification = async () => {
    if (!user || !userData?.familyCode) return;
    
    Alert.alert(
      "Холболт шалгах",
      "Гэр бүлийн бусад гишүүд рүү тест мэдэгдэл илгээх үү?",
      [
        { text: "Цуцлах", style: "cancel" },
        { 
          text: "Илгээх", 
          onPress: async () => {
            const result = await sendTestFamilyNotification(user.uid, userData.familyCode!, userData.name || 'Нэргүй');
            if (result.success) {
              Alert.alert("Амжилттай", `Тест мэдэгдлийг ${result.count} гишүүнд илгээлээ.`);
            } else {
              Alert.alert("Алдаа", result.error);
            }
          }
        }
      ]
    );
  };

  const handleSafeCheckin = async () => {
    if (!user) return;

    if (!userData?.familyCode) {
      Alert.alert("Анхааруулга", "Та гэр бүлийн бүлэгт нэгдээгүй байна. Профайл хэсгээс гэр бүл үүсгэх эсвэл нэгдэнэ үү.");
      return;
    }

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    let isValidTime = false;
    let targetSchedule = "";

    const schedules = userData.checkinSchedule || ['12:00', '18:00'];

    for (const timeStr of schedules) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduledTotalMinutes = hours * 60 + minutes;

      if (currentTotalMinutes >= scheduledTotalMinutes &&
        currentTotalMinutes <= scheduledTotalMinutes + 10) {
        isValidTime = true;
        targetSchedule = timeStr;
        break;
      }
    }

    if (!isValidTime) {
      Alert.alert(
        "Буруу цаг!",
        "Одоо Чекин хийх цаг биш байна! Та зөвхөн тохируулсан цагаасаа хойш 10 минутын дотор л Чекин (SAFE) дарах боломжтой."
      );
      return;
    }

    setTargetTime(targetSchedule);
    setIsStatusModalVisible(true);
  };

  const confirmSafeCheckin = async (status: string) => {
    if (!user || !userData?.familyCode) return;
    
    setIsStatusModalVisible(false);
    setLoadingSafe(true);
    try {
      const success = await logCheckin(user.uid, userData.familyCode, targetTime, status);
      if (success) {
        await cancelReminderForTime(targetTime);
        setCheckinsCount(prev => prev + 1);
        Alert.alert("Амжилттай!", `Одоо таны байдал: ${status}`);
      }
    } catch (e: any) {
      if (e.message === 'already_checked_in') {
        Alert.alert("Анхааруулга", "Та энэ цагийн чекинээ аль хэдийн хийсэн байна.");
      } else {
        Alert.alert("Алдаа", "Чекин хийхэд алдаа гарлаа.");
      }
    } finally {
      setLoadingSafe(false);
    }
  };

  const handleEmergencyCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleFakeCall = async () => {
    console.log("[DEBUG] Fake Call button pressed");
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      Alert.alert("Зөвшөөрөл", "Мэдэгдэл илгээх зөвшөөрөл шаардлагатай байна.");
      return;
    }

    const callers = ["Аав", "Ээж", "Цагдаа"];
    const randomCaller = callers[Math.floor(Math.random() * callers.length)];

    try {
      await triggerFakeCallNotification(randomCaller);
      console.log(`[DEBUG] Fake call scheduled for ${randomCaller}`);
    } catch (e) {
      Alert.alert("Алдаа", "Хуурамч дуудлага хийхэд алдаа гарлаа.");
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Fake Call Overlay */}
        <Modal
          visible={isFakeCallIncoming || isFakeCallConnected}
          animationType="slide"
          transparent={false}
        >
          <LinearGradient
            colors={['#1a202c', '#2d3748']}
            style={styles.callOverlay}
          >
            <View style={styles.callContent}>
              <View style={styles.callerAvatarBig}>
                <User color="white" size={80} />
              </View>
              <Text style={styles.callerNameBig}>{fakeCaller}</Text>
              <Text style={styles.callStatusText}>
                {isFakeCallConnected ? formatTime(callSeconds) : "Дуудлага ирж байна..."}
              </Text>

              <View style={styles.callActionsRow}>
                {!isFakeCallConnected ? (
                  <>
                    <TouchableOpacity
                      style={[styles.callBtn, styles.declineBtn]}
                      onPress={async () => {
                        await stopAlarmSound();
                        setIsFakeCallIncoming(false);
                      }}
                    >
                      <PhoneOff color="white" size={32} />
                      <Text style={styles.callBtnLabel}>Цуцлах</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.callBtn, styles.acceptBtn]}
                      onPress={async () => {
                        await stopAlarmSound();
                        setIsFakeCallIncoming(false);
                        setIsFakeCallConnected(true);
                      }}
                    >
                      <Phone color="white" size={32} />
                      <Text style={styles.callBtnLabel}>Авах</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.callBtn, styles.declineBtn, { width: 80, height: 80 }]}
                    onPress={() => {
                      setIsFakeCallConnected(false);
                      setFakeCaller('');
                    }}
                  >
                    <PhoneOff color="white" size={32} />
                    <Text style={styles.callBtnLabel}>Дуусгах</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        </Modal>

        {/* Check-in Status Picker Modal */}
        <Modal
          visible={isStatusModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsStatusModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.statusPickerContent}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusTitle}>Одоо хаана байна вэ?</Text>
                <TouchableOpacity onPress={() => setIsStatusModalVisible(false)}>
                  <X color="#64748b" size={24} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.statusOptionsGrid}>
                <TouchableOpacity 
                  style={[styles.statusOption, {backgroundColor: '#dcfce7'}]}
                  onPress={() => confirmSafeCheckin('Хичээл дээрээ байна')}
                >
                  <Text style={styles.statusEmoji}>🏫</Text>
                  <Text style={styles.statusOptionText}>Хичээл дээр</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.statusOption, {backgroundColor: '#e0f2fe'}]}
                  onPress={() => confirmSafeCheckin('Ажил дээрээ байна')}
                >
                  <Text style={styles.statusEmoji}>💼</Text>
                  <Text style={styles.statusOptionText}>Ажил дээр</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.statusOption, {backgroundColor: '#fef3c7'}]}
                  onPress={() => confirmSafeCheckin('Гэр рүүгээ явж байна')}
                >
                  <Text style={styles.statusEmoji}>🏠</Text>
                  <Text style={styles.statusOptionText}>Гэр рүүгээ</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.statusOption, {backgroundColor: '#f1f5f9'}]}
                  onPress={() => confirmSafeCheckin('Замдаа явж байна')}
                >
                  <Text style={styles.statusEmoji}>🚶</Text>
                  <Text style={styles.statusOptionText}>Замдаа</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.simpleSafeBtn}
                onPress={() => confirmSafeCheckin('Аюулгүй (SAFE)')}
              >
                <Text style={styles.simpleSafeText}>Зүгээр л SAFE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Persistent Alarm Banner / Stop Button */}
        {isAlarmSounding && (
          <View style={styles.alarmActiveBanner}>
            <Activity color="white" size={32} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.alarmBannerTitle}>🆘 SOS ДОХИО ИРЛЭЭ!</Text>
              <Text style={styles.alarmBannerText}>Сэрүүлэг дуугарч байна...</Text>
            </View>
            <TouchableOpacity
              style={styles.stopAlarmButton}
              onPress={handleStopSiren}
            >
              <Text style={styles.stopAlarmText}>ЗОГСООХ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.profileIconContainer}>
            <View style={styles.profileBadge}>
              <User color="#4a5568" size={24} />
            </View>
            <View style={styles.goldMedal}>
              <Text style={styles.medalText}>★</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Shield color="#0052cc" size={24} fill="#0052cc" />
            <Text style={styles.logoText}>SAFEZONE</Text>
          </View>

          <TouchableOpacity style={styles.bellContainer}>
            <Bell color="#4a5568" size={28} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Banner */}
        <View style={styles.bannerOuter}>
          <LinearGradient
            colors={['#e0f2fe', '#f0f9ff']}
            style={styles.bannerInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.bannerIconBox}>
              <Shield color="#0052cc" size={24} />
            </View>
            <View style={styles.bannerTextBox}>
              <Text style={styles.bannerStatusLabel}>Гэр бүлийн төлөв: АЮУЛГҮЙ</Text>
              <Text style={styles.bannerTipText}>{SAFETY_TIPS[activeTipIndex].text}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* SAFE Button */}
        <TouchableOpacity
          style={styles.safeButtonOuter}
          onPress={handleSafeCheckin}
          disabled={loadingSafe}
        >
          <LinearGradient
            colors={['#5ced73', '#39b54a']}
            style={styles.safeButtonInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Text style={styles.safeTitle}>{loadingSafe ? "УНШИЖ БАЙНА..." : "SAFE"}</Text>
            <Text style={styles.safeSubtitle}>Tap to check in</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* SOS Button */}
        <TouchableOpacity
          style={styles.sosButtonOuter}
          delayLongPress={3000}
          onLongPress={handleSOS}
          onPress={() => Alert.alert('Анхаар', 'Уучлаарай, SOS дохио явуулахын тулд энэ товч дээр 3 секунд дарж барина уу!')}
          disabled={loadingSOS}
        >
          <LinearGradient
            colors={['#ff5e5e', '#d32f2f']}
            style={styles.sosButtonInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Text style={styles.sosTitle}>{loadingSOS ? "ИЛГЭЭЖ БАЙНА..." : "SOS"}</Text>
            {!loadingSOS && <Text style={styles.sosHoldText}>(Hold 3 Sec)</Text>}
            <Text style={styles.sosSubtitle}>Tap to send alert</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Fake Call Button */}
        <TouchableOpacity style={styles.fakeCallOuter} onPress={handleFakeCall}>
          <LinearGradient
            colors={['#c5e346', '#9cba25']}
            style={styles.fakeCallInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <PhoneCall color="white" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.fakeCallText}>Fake Call</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Emergency Services */}
        <View style={styles.emergencyRow}>
          <TouchableOpacity
            style={styles.emergencyItem}
            onPress={() => handleEmergencyCall('103')}
          >
            <View style={[styles.emergencyIconBox, { borderColor: '#ef4444', borderWidth: 1 }]}>
              <Image
                source={require('../../assets/images/icons/ambulance.png')}
                style={styles.vehicleIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.emergencyNumber}>103</Text>
            <Text style={styles.emergencyText}>Түргэн</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyItem}
            onPress={() => handleEmergencyCall('102')}
          >
            <View style={[styles.emergencyIconBox, { borderColor: '#2563eb', borderWidth: 1 }]}>
              <Image
                source={require('../../assets/images/icons/police.png')}
                style={styles.vehicleIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.emergencyNumber}>102</Text>
            <Text style={styles.emergencyText}>Цагдаа</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyItem}
            onPress={() => handleEmergencyCall('101')}
          >
            <View style={[styles.emergencyIconBox, { borderColor: '#f97316', borderWidth: 1 }]}>
              <Image
                source={require('../../assets/images/icons/fire.png')}
                style={styles.vehicleIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.emergencyNumber}>101</Text>
            <Text style={styles.emergencyText}>Гал түймэр</Text>
          </TouchableOpacity>
        </View>

        {/* Diagnostic Buttons */}
        <TouchableOpacity 
          style={styles.testButton}
          onPress={handleTestNotification}
        >
          <Bell color="#2563eb" size={20} />
          <Text style={styles.testButtonText}>Гэр бүлийн холболт шалгах</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.testButton}
          onPress={sendImmediateTestNotification}
        >
          <Bell color="#2563eb" size={20} />
          <Text style={styles.testButtonText}>Миний утас (Local Test)</Text>
        </TouchableOpacity>

        {/* SOS Alarm Test Button */}
        <TouchableOpacity
          style={styles.sosTestButton}
          onPress={async () => {
            setIsAlarmSounding(true);
            await triggerLocalSOSAlarm();
            startVibration('sos');
          }}
        >
          <Activity color="#dc2626" size={24} />
          <Text style={styles.sosTestButtonText}>SOS Сэрүүлэг Турших (Local)</Text>
        </TouchableOpacity>

        {/* SYSTEM DIAGNOSTIC PANEL */}
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>🛠 СИСТЕМ ОНОШИЛГОО</Text>

          <TouchableOpacity 
            style={[styles.testButton, { backgroundColor: '#7f1d1d', borderColor: '#ef4444', marginBottom: 15 }]} 
            onPress={emergencyStopSiren}
          >
            <Shield color="#f87171" size={18} />
            <Text style={[styles.testButtonText, { color: '#f87171' }]}>БҮХ ДУУГ ХҮЧЭЭР ЗОГСООХ</Text>
          </TouchableOpacity>

          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Миний Код:</Text>
            <Text style={styles.debugValue}>{userData?.familyCode || '---'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Миний Токен:</Text>
            <Text style={styles.debugValue} numberOfLines={1} ellipsizeMode="middle">
              {selfToken}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Нэр/UID:</Text>
            <Text style={styles.debugValue}>{userData?.name} / {user?.uid.substring(0,6)}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Сүүлийн Event:</Text>
          </View>
          <Text style={styles.debugLog}>{lastEvent}</Text>
        </View>

        <View style={{height: 40}} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.awardsContainer}>
            <Text style={styles.sectionTitle}>FAMILY AWARDS</Text>
            <View style={styles.awardsRow}>
              <View style={styles.awardItem}>
                <View style={styles.goldAwardIcon}>
                  <Text style={styles.awardIconText}>1st</Text>
                </View>
                <Text style={styles.awardTextBadge}>MONTHLY HERO</Text>
              </View>
              <View style={styles.awardItem}>
                <View style={styles.goldAwardIcon}>
                  <User color="#856404" size={20} />
                </View>
                <Text style={styles.awardTextBadge}>RESPONSIBLE FATHER</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.sectionTitleRight}>Daily Check-in: {checkinsCount}/2</Text>
            <View style={styles.progressIcons}>
              <View style={[styles.progressShield, checkinsCount >= 1 ? styles.progressShieldActive : styles.progressShieldInactive]}>
                {checkinsCount >= 1 && <Text style={styles.shieldCheck}>✓</Text>}
              </View>
              <View style={[styles.progressShield, checkinsCount >= 2 ? styles.progressShieldActive : styles.progressShieldInactive]}>
                {checkinsCount >= 2 && <Text style={styles.shieldCheck}>✓</Text>}
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min((checkinsCount / 2) * 100, 100)}%` }]} />
              <Text style={styles.progressText}>{Math.min((checkinsCount / 2) * 100, 100)}%</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dae8fc',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  profileIconContainer: {
    position: 'relative',
  },
  profileBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  goldMedal: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffd700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b8860b',
  },
  medalText: {
    color: '#b8860b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a365d',
    marginLeft: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bellContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  notificationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  safeButtonOuter: {
    width: '100%',
    height: 140,
    borderRadius: 70,
    backgroundColor: '#e6f4ea',
    padding: 8,
    marginBottom: 20,
    shadowColor: '#39b54a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  safeButtonInner: {
    flex: 1,
    borderRadius: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
  },
  safeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  sosButtonOuter: {
    width: '90%',
    height: 130,
    borderRadius: 65,
    backgroundColor: '#ffebee',
    padding: 8,
    marginBottom: 20,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  sosButtonInner: {
    flex: 1,
    borderRadius: 57,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
  },
  sosHoldText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sosSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  fakeCallOuter: {
    width: '50%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f4f9d0',
    padding: 4,
    marginBottom: 30,
    shadowColor: '#9cba25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  fakeCallInner: {
    flex: 1,
    borderRadius: 21,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fakeCallText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emergencyRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  emergencyItem: {
    alignItems: 'center',
  },
  emergencyIconBox: {
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a5568',
    marginTop: 2,
  },
  emergencyNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a365d',
    marginTop: 4,
  },
  vehicleIcon: {
    width: 60,
    height: 60,
  },
  bottomSection: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  awardsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 10,
  },
  sectionTitleRight: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 10,
    textAlign: 'center',
  },
  awardsRow: {
    flexDirection: 'row',
  },
  awardItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  goldAwardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef08a',
    borderWidth: 2,
    borderColor: '#eab308',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  awardIconText: {
    fontWeight: 'bold',
    color: '#856404',
  },
  awardTextBadge: {
    backgroundColor: '#fef08a',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#856404',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
  },
  progressIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressShield: {
    width: 30,
    height: 35,
    borderRadius: 5,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressShieldActive: {
    backgroundColor: '#4ade80',
    borderWidth: 0,
  },
  progressShieldInactive: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  shieldCheck: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  progressBarBg: {
    width: '80%',
    height: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    position: 'relative',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 5,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4a5568',
    top: -1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 20,
    marginTop: 10,
  },
  testButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sosTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 20,
  },
  sosTestButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  alarmActiveBanner: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#fee2e2',
  },
  alarmBannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alarmBannerText: {
    color: '#fee2e2',
    fontSize: 14,
  },
  stopAlarmButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  stopAlarmText: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 14,
  },
  callOverlay: {
    flex: 1,
  },
  callContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  callerAvatarBig: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  callerNameBig: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  callStatusText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 100,
    letterSpacing: 2,
  },
  callActionsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    paddingHorizontal: 40,
  },
  callBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  acceptBtn: {
    backgroundColor: '#10b981',
  },
  declineBtn: {
    backgroundColor: '#ef4444',
  },
  callBtnLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 50,
    position: 'absolute',
    bottom: -30,
    width: 100,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusPickerContent: {
    backgroundColor: 'white',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statusOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusOption: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
  },
  statusEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    textAlign: 'center',
  },
  simpleSafeBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  simpleSafeText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 15,
  },
  bannerOuter: {
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 25,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'white',
    shadowColor: '#0052cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerStatusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  bannerTipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  debugPanel: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  debugTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 1,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  debugLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugValue: {
    color: '#e2e8f0',
    fontSize: 12,
    maxWidth: '60%',
  },
  debugLog: {
    color: '#4ade80',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
});
