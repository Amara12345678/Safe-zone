import * as Location from 'expo-location';
import firestore from '@react-native-firebase/firestore';

export const triggerSOS = async (userId: string, familyCode: string) => {
  try {
    // 1. Get Location
    console.log("[DEBUG] Requesting location permissions...");
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    let coords = null;
    if (status === 'granted') {
      try {
        console.log("[DEBUG] Fetching current position (Accuracy: High)...");
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        if (location) {
          coords = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          console.log("[DEBUG] Location fetched successfully:", coords);
        }
      } catch (locationError) {
        console.warn("[DEBUG] getCurrentPositionAsync failed, trying getLastKnownPositionAsync:", locationError);
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          coords = {
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude,
          };
          console.log("[DEBUG] Last known location used:", coords);
        } else {
          console.error("[DEBUG] Both current and last known location failed.");
        }
      }
    } else {
      console.error("[DEBUG] Location permission DENIED.");
    }

    // 2. Fetch User Details for the alert
    let userName = 'Нэргүй';
    let userStatus = 'Гишүүн';
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      // Some versions of RN Firebase use .exists as a property, others as a function.
      const exists = typeof userDoc.exists === 'function' ? (userDoc.exists as any)() : userDoc.exists;
      if (exists) {
        const userData = userDoc.data();
        userName = userData?.name || 'Нэргүй';
        userStatus = userData?.status || 'Гишүүн';
      }
    } catch (userFetchError) {
      console.error("[DEBUG] Error fetching user details for SOS:", userFetchError);
    }

    // 3. Save alert to Firestore
    const alertRef = firestore().collection('alerts').doc();
    console.log(`[DEBUG] Saving SOS alert for ${userName} (Location attached: ${!!coords})`);
    
    // Sync last location to user profile for family visibility
    if (coords) {
      try {
        await firestore().collection('users').doc(userId).update({
          lastLocation: coords,
          locationTimestamp: firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error("[DEBUG] Error syncing lastLocation to user profile:", err);
      }
    }
    
    await alertRef.set({
      type: 'sos',
      userId,
      userName,
      userStatus,
      familyCode,
      location: coords,
      timestamp: firestore.FieldValue.serverTimestamp(),
      status: 'active',
      title: '🔴 SOS ЯАРАЛТАЙ ТУСЛАМЖ!',
      message: `${userName} яаралтай тусламж хүслээ!${coords ? ' Байршил хавсаргасан байна.' : ' (Байршил тодорхойгүй)'}`,
    });

    // 4. Find family members' push tokens to send an Expo Push notification
    const cleanFamilyCode = String(familyCode).trim();
    console.log(`[DEBUG] Searching for family members with Code: "${cleanFamilyCode}" (Sender: ${userId})`);

    const usersSnapshot = await firestore()
      .collection('users')
      .where('familyCode', '==', cleanFamilyCode)
      .get();

    console.log(`[DEBUG] Found ${usersSnapshot.size} total family members in DB.`);

    const tokens: string[] = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      const hasToken = !!data.expoPushToken;
      const isNotSelf = doc.id !== userId;
      
      console.log(`[DEBUG] Member: ${doc.id} | HasToken: ${hasToken} | IsNotSelf: ${isNotSelf}`);
      
      if (data.expoPushToken && isNotSelf) {
        tokens.push(data.expoPushToken);
      }
    });

    // 5. Dispatch Expo Push Notification via HTTP API
    if (tokens.length > 0) {
      console.log(`[DEBUG] Sending SOS notification to ${tokens.length} tokens:`, tokens);
      await sendPushNotification(
        tokens, 
        '🔴 SOS ЯАРАЛТАЙ ТУСЛАМЖ!', 
        `${userName} SOS дохио өглөө! Яаралтай апп руу орж байршлыг нь харна уу!`,
        { type: 'sos', importance: 'high' }
      );
    } else {
      console.warn("[DEBUG] NO OTHER family members found with valid Push Tokens to notify.");
    }

    return true;
  } catch (error) {
    console.error('Error triggering SOS:', error);
    throw error;
  }
};

export const sendTestFamilyNotification = async (userId: string, familyCode: string, senderName: string) => {
  try {
    const cleanFamilyCode = String(familyCode).trim();
    console.log(`[DEBUG] DISPATCHING TEST to family: ${cleanFamilyCode}`);

    const usersSnapshot = await firestore()
      .collection('users')
      .where('familyCode', '==', cleanFamilyCode)
      .get();

    const tokens: string[] = [];
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.expoPushToken && doc.id !== userId) {
        tokens.push(data.expoPushToken);
      }
    });

    if (tokens.length > 0) {
      console.log(`[DEBUG] Sending TEST notification to ${tokens.length} members.`);
      await sendPushNotification(
        tokens, 
        '🔔 ТЕСТ: Холболт шалгах', 
        `${senderName}-аас холболт шалгах хүсэлт ирлээ. Хэрэв та үүнийг харж байвал холболт ИДЭВХТЭЙ байна.`,
        { type: 'test' }
      );
      return { success: true, count: tokens.length };
    } else {
      return { success: false, error: 'Гэр бүлийн бусад гишүүд бүртгэгдээгүй байна (Push Token олдсонгүй).' };
    }
  } catch (error) {
    console.error('Test notification failed:', error);
    return { success: false, error: 'Тест илгээхэд алдаа гарлаа.' };
  }
};

const sendPushNotification = async (expoPushTokens: string[], title: string, body: string, extraData: any = {}) => {
  console.log(`[DEBUG] Attempting to send notification to ${expoPushTokens.length} tokens...`);
  
  for (const token of expoPushTokens) {
    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data: extraData,
    };

    try {
      console.log(`[DEBUG] Dispatching to: ${token.substring(0, 20)}...`);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          channelId: 'sos-final-siren', 
          priority: 'high',
          _displayInForeground: true,
        }),
      });
      
      const resData = await response.json();
      console.log(`[DEBUG] Response for ${token.substring(0, 15)}:`, JSON.stringify(resData));
    } catch (pushError) {
      console.error(`[DEBUG] Network error for ${token.substring(0, 15)}:`, pushError);
    }
  }
};
