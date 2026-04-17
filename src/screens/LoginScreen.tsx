import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';

export default function LoginScreen({ navigation }: any) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Handle the button press
  async function signInWithPhoneNumber(phoneNumber: string) {
    if (!phoneNumber.startsWith('+')) {
      Alert.alert('Error', 'Please enter your phone number with country code (e.g., +976...)');
      return;
    }
    try {
      setLoading(true);
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      setConfirm(confirmation);
    } catch (error: any) {
      Alert.alert('Login Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    try {
      setLoading(true);
      await confirm.confirm(code);
      // Success! The auth state listener in AppNavigator will unmount LoginScreen automatically.
    } catch (error: any) {
      Alert.alert('Verification Error', 'Invalid code.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>SAFEZONE</Text>
        <Text style={styles.subtitle}>Welcome to SafeSignal</Text>
        
        <View style={styles.formContainer}>
          {!confirm ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Phone Number (+976...)"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => signInWithPhoneNumber(phoneNumber)}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Send Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
               <TextInput
                style={styles.input}
                placeholder="Verification Code"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => confirmCode()}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Confirm</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* Fallback button if Firebase isn't fully configured yet during test */}
          <View style={{marginTop: 40}}>
             <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Main')}
              >
                <Text style={styles.secondaryButtonText}>Bypass Login (Test Mode)</Text>
              </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dae8fc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#1a365d',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#4a5568',
    marginBottom: 48,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  primaryButton: {
    backgroundColor: '#0052cc',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#0052cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4a5568',
    fontSize: 14,
    textDecorationLine: 'underline',
  }
});
