import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform } from 'react-native';

// Channel used for the silent "protection active" persistent notification
const PROTECTION_CHANNEL_ID = 'safesignal-protection';

export async function createProtectionChannel() {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: PROTECTION_CHANNEL_ID,
    name: 'SafeSignal Хамгаалалт',
    importance: AndroidImportance.LOW, // Silent — does NOT make notification sounds
    vibration: false,
    visibility: AndroidVisibility.PUBLIC,
  });
}

/**
 * Starts an Android Foreground Service showing a small persistent notification.
 * This keeps the JS runtime alive even after the user swipes the app from recents,
 * so that the Firestore SOS listener (registered in index.ts) keeps running.
 */
export async function startProtectionService(
  userId: string,
  familyCode: string,
  userName: string
) {
  if (Platform.OS !== 'android') return;
  try {
    await createProtectionChannel();
    await notifee.displayNotification({
      id: 'safesignal-protection-service',
      title: '🛡️ SafeSignal',
      body: `${userName} — Гэр бүлийнхний аюулгүй байдлыг хянаж байна`,
      android: {
        channelId: PROTECTION_CHANNEL_ID,
        asForegroundService: true, // THIS is what keeps the service alive
        ongoing: true,             // User cannot swipe it away
        smallIcon: 'ic_launcher',
        color: '#0052cc',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      },
      // Pass user data to the foreground service handler in index.ts
      data: { userId, familyCode, userName },
    });
    console.log('[ForegroundService] Protection service started.');
  } catch (e) {
    console.error('[ForegroundService] Failed to start protection service:', e);
  }
}

/**
 * Stops the foreground service. Call this on logout.
 */
export async function stopProtectionService() {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.stopForegroundService();
    console.log('[ForegroundService] Protection service stopped.');
  } catch (e) {
    console.error('[ForegroundService] Failed to stop protection service:', e);
  }
}
