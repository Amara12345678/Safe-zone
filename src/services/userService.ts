import firestore from '@react-native-firebase/firestore';

export const createUserProfile = async (uid: string, phoneNumber: string, name: string = '', status: string = '') => {
  try {
    const defaultFamilyCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await firestore().collection('users').doc(uid).set({
      phoneNumber,
      familyCode: defaultFamilyCode,
      name,
      status,
      awards: [],
      expoPushToken: null,
      checkinSchedule: ['12:00', '18:00'],
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    return defaultFamilyCode;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const updateExpoPushToken = async (uid: string, token: string) => {
  try {
    await firestore().collection('users').doc(uid).update({
      expoPushToken: token,
    });
  } catch (error) {
    console.error('Error updating push token:', error);
  }
};

export const joinFamily = async (uid: string, newFamilyCode: string) => {
  try {
    const codeToJoin = newFamilyCode.toUpperCase();
    
    // VERIFY if the family code actually exists in the database
    const snapshot = await firestore()
      .collection('users')
      .where('familyCode', '==', codeToJoin)
      .limit(1)
      .get();
      
    if (snapshot.empty) {
      throw new Error('Урилгын код буруу эсвэл ийм гэр бүл олдсонгүй.');
    }

    await firestore().collection('users').doc(uid).update({
      familyCode: codeToJoin,
    });
    return codeToJoin;
  } catch (error) {
    console.error('Error joining family:', error);
    throw error;
  }
};

export const updateCheckinSchedule = async (uid: string, schedule: string[]) => {
  try {
    await firestore().collection('users').doc(uid).update({
      checkinSchedule: schedule,
    });
  } catch (error) {
    console.error('Error updating check-in schedule:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, name: string, status: string) => {
  try {
    await firestore().collection('users').doc(uid).update({
      name,
      status,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
