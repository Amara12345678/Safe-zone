import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { createUserProfile } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { translations } from '../utils/translations';

export default function LoginScreen({ navigation }: any) {
  const { language, setLanguage } = useAuth();
  const t = translations[language];

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const statuses = ['Хүү', 'Охин', 'Аав', 'Ээж', 'Эмээ', 'Өвөө'];

  async function handleAuth() {
    if (phoneNumber.length !== 8) {
      Alert.alert(t.error, t.enterPhone);
      return;
    }
    if (password.length < 6) {
      Alert.alert(t.error, t.passwordHint);
      return;
    }
    if (isRegistering) {
      if (name.trim().length === 0) {
        Alert.alert(t.error, t.enterName);
        return;
      }
      if (!status) {
        Alert.alert(t.error, t.selectStatus);
        return;
      }
    }

    try {
      setLoading(true);
      const auth = getAuth();
      // "Fake" email strictly for overcoming Firebase phone auth SMS limitations without a custom backend
      const fakeEmail = `${phoneNumber}@safesignal.mn`; 
      
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        await createUserProfile(userCredential.user.uid, phoneNumber, name.trim(), status || t.member);
      } else {
        await signInWithEmailAndPassword(auth, fakeEmail, password);
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(t.error, 'Энэ дугаар аль хэдийн бүртгэлтэй байна. Нэвтрэх хэсгийг сонгоно уу.');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        Alert.alert(t.error, 'Дугаар эсвэл нууц үг буруу байна.');
      } else {
        Alert.alert(t.error, error.message || 'Сэрвэртэй холбогдоход алдаа гарлаа.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.languageToggle} 
          onPress={() => setLanguage(prev => prev === 'MN' ? 'EN' : 'MN')}
        >
          <Text style={styles.languageToggleText}>{language === 'MN' ? 'EN' : 'MN'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>SAFESIGNAL</Text>
        <Text style={styles.subtitle}>{t.welcome}</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>{t.phoneNumber}</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.prefix}>+976</Text>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder={t.phonePlaceholder}
              keyboardType="phone-pad"
              maxLength={8}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!loading}
            />
          </View>
          <Text style={styles.helperText}>{t.enterPhone}</Text>
          
          {isRegistering && (
            <>
              <Text style={styles.inputLabel}>{t.yourName}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.namePlaceholder}
                placeholderTextColor="#cbd5e1"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
              <Text style={styles.inputLabel}>{t.familyStatusField}</Text>
              <TouchableOpacity 
                style={styles.input}
                onPress={() => !loading && setShowStatusModal(true)}
              >
                <Text style={{color: !status ? '#cbd5e1' : '#0f172a', fontSize: 16}}>
                  {status || t.statusSelect}
                </Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>{t.familyStatusHint}</Text>
            </>
          )}

          <Text style={styles.inputLabel}>{t.password}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.bareInput}
              placeholder={t.createPassword}
              placeholderTextColor="#cbd5e1"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff color="#64748b" size={24} /> : <Eye color="#64748b" size={24} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>{t.passwordHint}</Text>

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleAuth}
            disabled={loading || phoneNumber.length !== 8 || password.length < 6}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>{isRegistering ? t.register : t.login}</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{marginTop: 20, alignItems: 'center'}}
            onPress={() => setIsRegistering(!isRegistering)}
          >
            <Text style={{color: '#0052cc', fontWeight: 'bold', fontSize: 16}}>
              {isRegistering ? t.switchToLogin : t.switchToRegister}
            </Text>
          </TouchableOpacity>
        </View>
        
        <Modal visible={showStatusModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t.chooseStatus}</Text>
              <ScrollView style={{width: '100%', maxHeight: 300}}>
                {statuses.map((s, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.statusOption}
                    onPress={() => {
                      setStatus(s);
                      setShowStatusModal(false);
                    }}
                  >
                    <Text style={styles.statusText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setShowStatusModal(false)} style={{marginTop: 15}}>
                <Text style={{color: '#ef4444', fontWeight: 'bold', fontSize: 16}}>{t.close}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  prefix: {
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  phoneInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 6,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -14,
    marginBottom: 16,
    marginLeft: 6,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a', // Explicit text color
  },
  bareInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#0f172a', // Explicit text color
  },
  primaryButton: {
    backgroundColor: '#0052cc',
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#0052cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 20,
    paddingRight: 12,
  },
  eyeIcon: {
    padding: 8,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a365d'
  },
  statusOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    width: '100%',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 18,
    color: '#334155'
  },
  languageToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#fff',
    borderColor: '#0052cc',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  languageToggleText: {
    color: '#0052cc',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
