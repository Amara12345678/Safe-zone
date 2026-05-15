import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { UserCircle, Bell, Home } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import FamilyScreen from '../screens/FamilyScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { translations } from '../utils/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { language } = useAuth();
  const t = translations[language];
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
        },
        tabBarActiveTintColor: '#0052cc',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={HomeScreen} 
        options={{
          tabBarLabel: t.tabHome,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{
          tabBarLabel: t.tabNotifications,
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: t.tabProfile,
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isInitializing } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('hasSeenOnboarding');
        if (value !== null) {
          setHasSeenOnboarding(true);
        } else {
          setHasSeenOnboarding(false);
        }
      } catch (error) {
        console.error('Error fetching onboarding status', error);
        setHasSeenOnboarding(false);
      }
    };
    checkOnboardingStatus();
  }, []);

  if (isInitializing || hasSeenOnboarding === null) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          hasSeenOnboarding ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingScreen setHasSeenOnboarding={setHasSeenOnboarding} />}
            </Stack.Screen>
          )
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Family" component={FamilyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
