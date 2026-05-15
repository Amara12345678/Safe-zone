import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import firestore from '@react-native-firebase/firestore';
import * as Notifications from 'expo-notifications';
import App from './App';

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFEE FOREGROUND SERVICE — Runs even after app is swiped from recent apps
// ─────────────────────────────────────────────────────────────────────────────
//
// When startProtectionService() is called from HomeScreen, Notifee starts an
// Android Foreground Service and calls this handler. The returned Promise NEVER
// resolves — that is intentional: it keeps the service (and its Firestore
// listener) alive indefinitely.
//
// When a new SOS alert is detected while the app is backgrounded / swiped away:
//   1. An immediate notification plays sos_siren.wav via the native channel.
//   2. Nine more notifications are scheduled at 30-second intervals.
//   → Total coverage: ~5 minutes of repeating SOS alarm without any server.
//
notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    const { userId, familyCode, userName } = (notification.data || {}) as {
      userId?: string;
      familyCode?: string;
      userName?: string;
    };

    if (!familyCode || !userId) {
      console.warn('[ForegroundService] Missing userId/familyCode in notification data.');
      return;
    }

    console.log(`[ForegroundService] Started for family: ${familyCode}`);

    const handledAlertIds = new Set<string>();

    // Real-time Firestore listener — survives swipe-to-dismiss thanks to the service
    firestore()
      .collection('alerts')
      .where('familyCode', '==', familyCode)
      .where('type', '==', 'sos')
      .onSnapshot(async (snapshot) => {
        if (!snapshot) return;

        const recentLimit = new Date();
        recentLimit.setMinutes(recentLimit.getMinutes() - 2);

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const alertId = doc.id;
          const timestamp = data.timestamp?.toDate?.() ?? new Date();

          if (
            !handledAlertIds.has(alertId) &&
            data.userId !== userId &&
            timestamp > recentLimit
          ) {
            handledAlertIds.add(alertId);
            const senderName = data.userName || 'Гэр бүлийн гишүүн';
            console.log(`[ForegroundService] SOS detected! Scheduling alarm burst for alertId: ${alertId}`);

            // Schedule 10 notifications × 30 sec = 5 minutes of repeating alarm
            for (let i = 0; i < 10; i++) {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '🔴 SOS ЯАРАЛТАЙ ТУСЛАМЖ!',
                    body: `${senderName} SOS дохио өглөө! Яаралтай апп нээж туслаарай.`,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    data: { type: 'sos', alertId, fromService: true },
                    android: {
                      channelId: 'sos-final-siren',
                      fullScreenIntent: true,
                      color: '#dc2626',
                    },
                  } as any,
                  trigger:
                    i === 0
                      ? null // Fire immediately
                      : ({
                          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                          seconds: i * 30,
                        } as any),
                });
              } catch (e) {
                console.error(`[ForegroundService] Failed to schedule notification ${i}:`, e);
              }
            }
          } else if (!handledAlertIds.has(alertId)) {
            // Mark old alerts as handled so they don't re-trigger later
            handledAlertIds.add(alertId);
          }
        }
      },
      (err) => {
        console.error('[ForegroundService] Firestore listener error:', err);
      });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FCM BACKGROUND MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: When the app is fully killed (terminated), Audio/Vibration APIs cannot
// be called from JavaScript. The SOS alarm sound is handled natively by the
// Android notification channel 'sos-final-siren' OR by the Foreground Service
// above. This handler is kept to satisfy Firebase's requirement.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[DEBUG] FCM background message received (app killed):', remoteMessage.data?.type);
  // Sound is played natively by the 'sos-final-siren' Android channel.
  // No JS audio APIs are called here as they do not work when the app is terminated.
});

// ─────────────────────────────────────────────────────────────────────────────
// Register the root component
// ─────────────────────────────────────────────────────────────────────────────
registerRootComponent(App);
