import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import { Audio, InterruptionModeAndroid } from 'expo-av';

let alarmSound: Audio.Sound | null = null;

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('fake-call', [
    {
      identifier: 'accept',
      buttonTitle: 'Accept',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'decline',
      buttonTitle: 'Decline',
      options: { opensAppToForeground: false },
    },
  ]);
}

/**
 * Helper to calculate the next Date occurrence of a HH:mm time string.
 */
function getNextOccurrenceDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  target.setMinutes(target.getMinutes() + 1);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

const SOS_VIBRATION_PATTERN = [0, 500, 200, 500]; // Intense SOS pattern
const CALL_VIBRATION_PATTERN = [0, 1000, 500, 1000]; // Rhythmic call pattern

export function startVibration(type: 'sos' | 'call') {
  const pattern = type === 'sos' ? SOS_VIBRATION_PATTERN : CALL_VIBRATION_PATTERN;
  Vibration.vibrate(pattern, true);
}

export function stopVibration() {
  Vibration.cancel();
}

let isLoadingSound = false;
let isStopRequested = false;

export async function playAlarmSound() {
  if (isLoadingSound) return;
  isLoadingSound = true;
  isStopRequested = false; // Reset stop request flag when starting

  try {
    // 1. Force cleanup of any existing sound
    if (alarmSound) {
      try {
        await alarmSound.stopAsync();
        await alarmSound.unloadAsync();
      } catch (e) { /* ignore */ }
      alarmSound = null;
    }

    // 2. Configure Audio Mode for Alarms
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const soundFile = require('../../assets/sounds/sos_siren.wav');

    // 3. Create sound but don't auto-play yet
    const { sound } = await Audio.Sound.createAsync(
      soundFile,
      { shouldPlay: false, isLooping: true, volume: 1.0 }
    );
    
    // If the user pressed STOP while we were loading the audio file, abort immediately!
    if (isStopRequested) {
      console.log("[DEBUG] Stop requested while loading, aborting playback.");
      await sound.unloadAsync();
      return;
    }

    // 4. Play Sound
    alarmSound = sound;
    await alarmSound.playAsync();
    console.log("[DEBUG] Started playing siren alarm (looped).");
  } catch (error) {
    console.error("[DEBUG] Error playing alarm sound:", error);
  } finally {
    isLoadingSound = false;
  }
}

export async function playRingtoneSound() {
  if (isLoadingSound) return;
  isLoadingSound = true;
  isStopRequested = false;

  try {
    if (alarmSound) {
      try {
        await alarmSound.stopAsync();
        await alarmSound.unloadAsync();
      } catch (e) { /* ignore */ }
      alarmSound = null;
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const soundFile = Platform.OS === 'ios'
      ? require('../../assets/sounds/iphone_ringtone.mp3')
      : require('../../assets/sounds/android_ringtone.mp3');

    const { sound } = await Audio.Sound.createAsync(
      soundFile,
      { shouldPlay: false, isLooping: true, volume: 1.0 }
    );
    
    if (isStopRequested) {
      await sound.unloadAsync();
      return;
    }

    alarmSound = sound;
    await alarmSound.playAsync();
    console.log("[DEBUG] Started playing ringtone (looped).");
  } catch (error) {
    console.error("[DEBUG] Error playing ringtone:", error);
  } finally {
    isLoadingSound = false;
  }
}

export async function stopAlarmSound() {
  try {
    isStopRequested = true; // Signals any loading sounds to abort
    console.log("[DEBUG] Attempting to stop alarm sound...");
    
    // Critically important: Clear notifications to stop Native Android channel alarms
    await Notifications.dismissAllNotificationsAsync();

    if (alarmSound) {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
      alarmSound = null;
      console.log("[DEBUG] Alarm sound successfully stopped.");
    } else {
      console.log("[DEBUG] No active alarm sound to stop.");
    }
    stopVibration();
  } catch (e) {
    console.error("[DEBUG] Error stopping alarm sound:", e);
  }
}

export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return { status: false, token: null };
    }

    // Get the Expo Push Token for this device
    let token = null;
    try {
      const projectId = '71876d06-f4b0-471b-ab1b-026a01865add';
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      token = tokenData.data;
      console.log("[DEBUG] Expo Push Token retrieved:", token);
    } catch (tokenErr) {
      console.error("[DEBUG] Error fetching Expo Push Token:", tokenErr);
    }

    if (Platform.OS === 'android') {
      const settings = await Notifications.getPermissionsAsync();
      if (!(settings as any).canScheduleExactAlarms) {
        console.warn("[DEBUG] Exact alarms not allowed.");
      }

      // 1. Regular Check-in Alarm Channel
      await Notifications.setNotificationChannelAsync('checkin-alarms', {
        name: 'Check-in Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#FF0000',
        sound: 'default',
        bypassDnd: true,
        lockscreenVisibility: 1,
      });

      // 2. SOS Critical Alarm Channel
      console.log("[DEBUG] Creating SOS FINAL SIREN Channel...");
      await Notifications.setNotificationChannelAsync('sos-final-siren', {
        name: '🆘 SOS СЭРҮҮЛЭГ (ЧАНГА)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000],
        lightColor: '#FF0000',
        sound: 'sos_siren.wav', 
        bypassDnd: true,
        lockscreenVisibility: 1, 
        showBadge: true,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        }
      });

      // 3. Fake Call Channel
      await Notifications.setNotificationChannelAsync('fake-calls', {
        name: '📞 Fake Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 500],
        lightColor: '#22C55E',
        sound: Platform.OS === 'android' ? 'sos_siren.wav' : 'default',
        bypassDnd: true,
        lockscreenVisibility: 1,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        }
      });
    }
    await setupNotificationCategories();
    return { status: true, token };
  } catch (e) {
    console.warn("Notification permissions failed:", e);
    return { status: false, token: null };
  }
}

export async function scheduleCheckinReminder(scheduleTime: string) {
  try {
    const targetDate = getNextOccurrenceDate(scheduleTime);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ АЮУЛГҮЙ ТОВЧ ДАРАХ ЦАГ! (ALARM)",
        body: `Аюулгүй товч дарах цаг 1 минут өнгөрлөө (${scheduleTime})! Яаралтай АЮУЛГҮЙ БАЙНА дарна уу.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        android: {
          channelId: 'checkin-alarms',
          fullScreenIntent: true,
        },
        data: { scheduleTime },
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      } as any,
    });
    return id;
  } catch (e) {
    console.error("Scheduling reminder failed:", e);
    return null;
  }
}

export async function triggerLocalSOSAlarm() {
  try {
    console.log("[DEBUG] Triggering SOS FINAL SIREN test...");
    
    // Play the Loop Siren Manually for foreground/immediate effect
    await playAlarmSound();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🆘 ТЕСТ: SOS ЯАРАЛТАЙ ДОХИО!",
        body: "Энэ бол SOS сэрүүлэг хэрхэн дуугарахыг шалгах тест юм. (Чанга дуу гарч буйг шалгана уу)",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        android: {
          channelId: 'sos-final-siren',
          fullScreenIntent: true, 
        },
      } as any,
      trigger: null, 
    });
    return id;
  } catch (e) {
    console.error("Test SOS alarm failed:", e);
  }
}

export async function cancelAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("Cancel all reminders failed:", e);
  }
}

export async function cancelReminderForTime(scheduleTime: string) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.scheduleTime === scheduleTime) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (e) {
    console.warn("Cancel reminder failed:", e);
  }
}

export async function scheduleWeeklyReminders(schedules: string[]) {
  await cancelAllReminders();
  for (const timeStr of schedules) {
    await scheduleCheckinReminder(timeStr);
  }
}

export async function triggerFakeCallNotification(caller: string) {
  try {
    console.log(`[DEBUG] Scheduling fake call from ${caller}...`);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "📞 Дуудлага ирж байна...",
        body: `${caller} залгаж байна`,
        sound: Platform.OS === 'ios' ? 'sos_siren.wav' : true, // Set specific ios sound filename here
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'fake-call',
        data: { type: 'fake-call', caller },
        android: {
          channelId: 'fake-calls',
          fullScreenIntent: true,
        },
      } as any,
      trigger: null,
    });
    console.log(`[DEBUG] Fake call scheduled with ID: ${id}`);
    return id;
  } catch (e) {
    console.warn("Fake call notification failed:", e);
  }
}

export async function sendImmediateTestNotification() {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 ТЕСТ МЭДЭГДЭЛ",
        body: "Энэ бол энгийн сануулга мэдэгдэл ирж буй тест юм.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        android: {
          channelId: 'checkin-alarms',
        },
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      } as any,
    });
    return id;
  } catch (e) {
    console.warn("Test notification failed:", e);
  }
}

export async function checkExactAlarmPermission() {
  if (Platform.OS !== 'android') return true;
  const settings = await Notifications.getPermissionsAsync();
  return (settings as any).canScheduleExactAlarms === true;
}
