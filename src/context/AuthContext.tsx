import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export interface UserContextData {
  uid: string;
  phoneNumber: string | null;
  familyCode: string | null;
  name: string | null;
  status?: string;
  expoPushToken: string | null;
  awards: string[];
  checkinSchedule?: string[];
  points?: number;
}

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  userData: UserContextData | null;
  isInitializing: boolean;
  refreshUserData: () => Promise<void>;
  language: 'MN' | 'EN';
  setLanguage: React.Dispatch<React.SetStateAction<'MN' | 'EN'>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isInitializing: true,
  refreshUserData: async () => {},
  language: 'MN',
  setLanguage: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userData, setUserData] = useState<UserContextData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [language, setLanguage] = useState<'MN' | 'EN'>('MN');

  // Deprecated manual refresh - no longer needed as we use onSnapshot, but keeping interface for backwards compatibility.
  const refreshUserData = async (uid?: string) => {};

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeUserDoc: () => void;

    const subscriber = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }

      if (currentUser) {
        unsubscribeUserDoc = firestore()
          .collection('users')
          .doc(currentUser.uid)
          .onSnapshot(async (docSnap) => {
            if (docSnap.data()) {
              setUserData(docSnap.data() as UserContextData);
            } else {
              // Wait a tiny bit just in case createUserProfile is still writing
              setTimeout(async () => {
                const checkAgain = await firestore().collection('users').doc(currentUser.uid).get();
                if (!checkAgain.data()) {
                  const uid = currentUser.uid;
                  const defaultFamilyCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                  const fallbackData: UserContextData = {
                    uid,
                    phoneNumber: currentUser.phoneNumber || '',
                    familyCode: defaultFamilyCode,
                    name: '',
                    status: 'Гишүүн',
                    awards: [],
                    expoPushToken: null,
                    checkinSchedule: ['12:00', '18:00'],
                    points: 0,
                  };
                  await firestore().collection('users').doc(uid).set({
                    ...fallbackData,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                  });
                }
              }, 1500); // 1.5 seconds delay to allow LoginScreen to finish writing
            }
          });
      } else {
        setUserData(null);
      }
      
      if (isInitializing) setIsInitializing(false);
    });

    return () => {
      subscriber();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, isInitializing, refreshUserData, language, setLanguage }}>
      {children}
    </AuthContext.Provider>
  );
};
