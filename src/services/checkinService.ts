import firestore from '@react-native-firebase/firestore';
import * as Location from 'expo-location';

export const logCheckin = async (userId: string, familyCode: string, scheduleTime: string, statusMessage?: string) => {
    if (!userId || !familyCode) {
      console.log("[DEBUG] Missing userId or familyCode, skipping logCheckin.");
      return false;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch current location for the check-in
      let coords = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
        }
      } catch (e) {
        console.log("[DEBUG] Location fetch failed during check-in:", e);
      }
    
    // Write to checkins tracker
    // To prevent double check-ins for the same time slot:
    const existing = await firestore()
      .collection('checkins')
      .where('userId', '==', String(userId))
      .where('date', '==', String(today))
      .where('scheduleTime', '==', String(scheduleTime))
      .get();
      
    if (!existing.empty) {
      throw new Error("already_checked_in");
    }

    await firestore().collection('checkins').add({
      userId,
      familyCode,
      date: today,
      scheduleTime,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });

    const usersSnapshot = await firestore()
      .collection('users')
      .where('familyCode', '==', familyCode)
      .get();

    // Find the current user's details for the alert
    let userName = 'Нэргүй';
    let userStatus = 'Гишүүн';
    const tokens: string[] = [];
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (doc.id === userId) {
        userName = data.name || 'Нэргүй';
        userStatus = data.status || 'Гишүүн';
      } else if (data.expoPushToken) {
        tokens.push(data.expoPushToken);
      }
    });

    // Write to alerts for the feed
    try {
      await firestore().collection('alerts').add({
        type: 'safe',
        userId,
        userName,
        userStatus,
        familyCode,
        timestamp: firestore.FieldValue.serverTimestamp(),
        title: 'Аюулгүй (SAFE)',
        message: statusMessage || 'Аюулгүй (SAFE) товч дарлаа.',
        status: 'resolved',
      });
      console.log(`[DEBUG] Successfully wrote SAFE alert for user ${userName} in family ${familyCode}`);
      
      // Sync location to user profile
      if (coords) {
        await firestore().collection('users').doc(userId).update({
          lastLocation: coords,
          locationTimestamp: firestore.FieldValue.serverTimestamp(),
          points: firestore.FieldValue.increment(1),
        });
      } else {
        await firestore().collection('users').doc(userId).update({
          points: firestore.FieldValue.increment(1),
        });
      }
    } catch (alertError) {
      console.error("[DEBUG] Error writing SAFE alert:", alertError);
    }

    // tokens were moved up

    if (tokens.length > 0) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: tokens,
          sound: 'default',
          title: '✅ Аюулгүй (SAFE)',
          body: `Гэр бүлийн гишүүн амжилттай Аюулгүй товч дарлаа. ${statusMessage ? `(${statusMessage})` : ''}`,
        }),
      });
    }

    return true;
  } catch (error) {
    console.error('Error logging check-in:', error);
    throw error;
  }
};

export const getTodayCheckinsCount = async (userId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await firestore()
      .collection('checkins')
      .where('userId', '==', userId)
      .where('date', '==', today)
      .get();
    
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return 0;
  }
};

export const hasCheckedInForSchedule = async (userId: string, date: string, scheduleTime: string) => {
  try {
    const existing = await firestore()
      .collection('checkins')
      .where('userId', '==', String(userId))
      .where('date', '==', String(date))
      .where('scheduleTime', '==', String(scheduleTime))
      .get();
    return !existing.empty;
  } catch (error) {
    console.error('Error checking exist check-in:', error);
    return false;
  }
};

export const verifyMissedCheckins = async (checkingUserId: string, familyCode: string) => {
    if (!familyCode) {
      console.log("[DEBUG] Missing familyCode, skipping verifyMissedCheckins.");
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // 1. Get all users in the family
    const usersSnapshot = await firestore()
      .collection('users')
      .where('familyCode', '==', String(familyCode))
      .get();
      
    for (const doc of usersSnapshot.docs) {
      const uId = doc.id;
      const data = doc.data();
      const userName = data.name || 'Нэргүй';
      const userStatus = data.status || 'Гишүүн';
      const schedules: string[] = data.checkinSchedule || [];
      
      // Look at each schedule e.g., '12:00'
      for (const timeStr of schedules) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // Is it > 10 mins past the scheduled time?
        const diffMinutes = (now.getTime() - scheduledTime.getTime()) / 60000;
        
        if (diffMinutes >= 10 && diffMinutes < 1440) { // Past 10 min, but same day loosely
          // Did they check in around this time or at all today?
          // Simplification for MVP: We see if they have *enough* checkins today to cover this schedule index, 
          // OR we check if a "missed" alert already exists for this specific time to avoid spamming.
          
          const missedAlertQuery = await firestore()
            .collection('alerts')
            .where('userId', '==', uId)
            .where('type', '==', 'missed')
            .where('scheduleTime', '==', timeStr)
            .where('date', '==', today)
            .get();
            
          if (missedAlertQuery.empty) {
            // Did they actually check in? 
            const checkins = await firestore()
              .collection('checkins')
              .where('userId', '==', uId)
              .where('date', '==', today)
              .get();
              
            // If they have fewer checkins than the index of this schedule, they missed it.
            // (A true robust app would match the checkin timestamp closely to the schedule)
            const scheduleIndex = schedules.indexOf(timeStr);
            if (checkins.size <= scheduleIndex) {
               // They MISSED IT! Write an alert!
               try {
                 await firestore().collection('alerts').add({
                   type: 'missed',
                   userId: uId,
                   userName,
                   userStatus,
                   familyCode,
                   timestamp: firestore.FieldValue.serverTimestamp(),
                   title: '⚠️ Аюулгүй товч дарагдсангүй!',
                   message: `10 минутын дотор Аюулгүй товч дарсангүй!! (${timeStr})`,
                   status: 'warning',
                   scheduleTime: timeStr,
                   date: today
                 });
                 
                 // Deduct 1 point, min 0
                 const currentPoints = data.points || 0;
                 await firestore().collection('users').doc(uId).update({
                   points: Math.max(0, currentPoints - 1),
                 });

                 console.log(`[DEBUG] Successfully wrote MISSED alert for user ${userName} in family ${familyCode}`);
               } catch (missedError) {
                 console.error("[DEBUG] Error writing MISSED alert:", missedError);
               }

               // Send a push notification as well
               if (data.expoPushToken) {
                 await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      to: data.expoPushToken,
                      sound: 'default',
                      title: '⚠️ Аюулгүй товч дарна уу!',
                      body: 'Аюулгүй товч дарах цаг 10 минут өнгөрлөө! Яаралтай АЮУЛГҮЙ БАЙНА дарна уу.',
                    }),
                 });
               }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error verifying checkins:", error);
  }
};
