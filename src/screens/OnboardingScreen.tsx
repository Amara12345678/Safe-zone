import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Animated, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Гэр бүлийн халамж',
    description: 'Гэр бүлийнхээ аюулгүй байдлыг цаг үргэлж хамтдаа баталгаажуулаарай.',
    image: require('../../assets/images/onboarding/onboarding_family.png')
  },
  {
    id: '2',
    title: 'Шуурхай SOS дохио',
    description: 'Гэнэтийн аюул тулгарсан үед ганц товч дараад л гэр бүлдээ мэдэгдэх, байршлаа илгээх.',
    image: require('../../assets/images/onboarding/onboarding_sos.png')
  },
  {
    id: '3',
    title: 'БИ АЮУЛГҮЙ БАЙНА',
    description: 'Өдөр бүр товлосон цагтаа аюулгүйгээ мэдэгдэж, хайртай хүмүүсийнхээ санааг амраах.',
    image: require('../../assets/images/onboarding/onboarding_safe.png')
  },
  {
    id: '4',
    title: 'Хамтдаа аюулгүй бүсийг үүсгэе',
    description: 'Одооноос эхлэн гэр бүлийнхээ хамгаалалтын сүлжээг бий болгоцгооё.',
    image: require('../../assets/images/onboarding/onboarding_network.png')
  }
];

export default function OnboardingScreen({ setHasSeenOnboarding }: { setHasSeenOnboarding: (val: boolean) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const handleStart = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
    } catch (e) {
      console.error('Error saving onboarding status', e);
    }
  };

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    return (
      <View style={styles.slideContainer}>
        <View style={styles.iconContainer}>
            <Image source={item.image} style={{ width: width * 0.8, height: width * 0.8 }} resizeMode="contain" />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 3 }}>
        <FlatList
          data={SLIDES}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          ref={slidesRef}
        />
      </View>
      <View style={styles.bottomContainer}>
        <View style={styles.paginator}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 20, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i.toString()}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.startButton, { opacity: currentIndex === SLIDES.length - 1 ? 1 : 0 }]} 
          onPress={handleStart}
          disabled={currentIndex !== SLIDES.length - 1}
        >
          <Text style={styles.startButtonText}>ЭХЛЭХ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  slideContainer: {
    width,
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  paginator: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
    marginHorizontal: 8,
  },
  startButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
