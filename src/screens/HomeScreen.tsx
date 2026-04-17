import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, User, PhoneCall, Shield, AlertTriangle, Activity } from 'lucide-react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.profileIconContainer}>
            <View style={styles.profileBadge}>
              <User color="#4a5568" size={24} />
            </View>
            <View style={styles.goldMedal}>
              <Text style={styles.medalText}>★</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Shield color="#0052cc" size={24} fill="#0052cc" />
            <Text style={styles.logoText}>SAFEZONE</Text>
          </View>

          <TouchableOpacity style={styles.bellContainer}>
            <Bell color="#4a5568" size={28} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SAFE Button */}
        <TouchableOpacity style={styles.safeButtonOuter}>
          <LinearGradient
            colors={['#5ced73', '#39b54a']}
            style={styles.safeButtonInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Text style={styles.safeTitle}>SAFE</Text>
            <Text style={styles.safeSubtitle}>Tap to check in</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* SOS Button */}
        <TouchableOpacity style={styles.sosButtonOuter}>
          <LinearGradient
            colors={['#ff5e5e', '#d32f2f']}
            style={styles.sosButtonInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Text style={styles.sosTitle}>SOS</Text>
            <Text style={styles.sosHoldText}>(Hold 3 Sec)</Text>
            <Text style={styles.sosSubtitle}>Tap to check in</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Fake Call Button */}
        <TouchableOpacity style={styles.fakeCallOuter}>
          <LinearGradient
            colors={['#c5e346', '#9cba25']}
            style={styles.fakeCallInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <PhoneCall color="white" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.fakeCallText}>Fake Call</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Emergency Services */}
        <View style={styles.emergencyRow}>
          <TouchableOpacity style={styles.emergencyItem}>
            <View style={styles.emergencyIconBox}>
              <Activity color="#d32f2f" size={32} />
            </View>
            <Text style={styles.emergencyText}>Ambulance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emergencyItem}>
            <View style={styles.emergencyIconBox}>
              <Shield color="#1a365d" size={32} />
            </View>
            <Text style={styles.emergencyText}>police</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emergencyItem}>
            <View style={styles.emergencyIconBox}>
              <AlertTriangle color="#d32f2f" size={32} />
            </View>
            <Text style={styles.emergencyText}>Fire</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Family Awards */}
          <View style={styles.awardsContainer}>
            <Text style={styles.sectionTitle}>FAMILY AWARDS</Text>
            <View style={styles.awardsRow}>
              <View style={styles.awardItem}>
                <View style={styles.goldAwardIcon}>
                  <Text style={styles.awardIconText}>1st</Text>
                </View>
                <Text style={styles.awardTextBadge}>MONTHLY HERO</Text>
              </View>
              <View style={styles.awardItem}>
                <View style={styles.goldAwardIcon}>
                  <User color="#856404" size={20} />
                </View>
                <Text style={styles.awardTextBadge}>RESPONSIBLE FATHER</Text>
              </View>
            </View>
          </View>

          {/* Daily Check-in Progress */}
          <View style={styles.progressContainer}>
            <Text style={styles.sectionTitleRight}>Daily Check-in: 1/2</Text>
            <View style={styles.progressIcons}>
              <View style={[styles.progressShield, styles.progressShieldActive]}>
                <Text style={styles.shieldCheck}>✓</Text>
              </View>
              <View style={[styles.progressShield, styles.progressShieldInactive]} />
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '50%' }]} />
              <Text style={styles.progressText}>50%</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dae8fc', // Light blue background matching the design
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  profileIconContainer: {
    position: 'relative',
  },
  profileBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  goldMedal: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffd700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b8860b',
  },
  medalText: {
    color: '#b8860b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a365d',
    marginLeft: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bellContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  notificationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  safeButtonOuter: {
    width: '100%',
    height: 140,
    borderRadius: 70,
    backgroundColor: '#e6f4ea',
    padding: 8,
    marginBottom: 20,
    shadowColor: '#39b54a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  safeButtonInner: {
    flex: 1,
    borderRadius: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
  },
  safeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  sosButtonOuter: {
    width: '90%',
    height: 130,
    borderRadius: 65,
    backgroundColor: '#ffebee',
    padding: 8,
    marginBottom: 20,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  sosButtonInner: {
    flex: 1,
    borderRadius: 57,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
  },
  sosHoldText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sosSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  fakeCallOuter: {
    width: '50%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f4f9d0',
    padding: 4,
    marginBottom: 30,
    shadowColor: '#9cba25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  fakeCallInner: {
    flex: 1,
    borderRadius: 21,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fakeCallText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emergencyRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  emergencyItem: {
    alignItems: 'center',
  },
  emergencyIconBox: {
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  emergencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  bottomSection: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  awardsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 10,
  },
  sectionTitleRight: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 10,
    textAlign: 'center',
  },
  awardsRow: {
    flexDirection: 'row',
  },
  awardItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  goldAwardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef08a',
    borderWidth: 2,
    borderColor: '#eab308',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  awardIconText: {
    fontWeight: 'bold',
    color: '#856404',
  },
  awardTextBadge: {
    backgroundColor: '#fef08a',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#856404',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
  },
  progressIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressShield: {
    width: 30,
    height: 35,
    borderRadius: 5,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressShieldActive: {
    backgroundColor: '#4ade80',
    borderWidth: 0,
  },
  progressShieldInactive: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  shieldCheck: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  progressBarBg: {
    width: '80%',
    height: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    position: 'relative',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 5,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4a5568',
    top: -1,
  },
});
