import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, Animated, Easing } from 'react-native';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animate) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: DURATION * 0.2,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: DURATION * 0.5,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => setVisible(false));
    }
  }, [animate]);

  if (!visible) return null;

  const image = <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />;

  return animate ? (
    <Animated.View style={[styles.splashOverlay, { opacity, transform: [{ scale }] }]}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

export function AnimatedIcon() {
  const backgroundScale = useRef(new Animated.Value(INITIAL_SCALE_FACTOR)).current;
  const logoScale = useRef(new Animated.Value(1.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backgroundScale, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: DURATION * 0.4,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 1,
            duration: DURATION * 0.6,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: DURATION * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    Animated.loop(
      Animated.timing(glowRotation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = glowRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[styles.glow, { transform: [{ rotateZ: spin }] }]}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View style={[styles.background, { transform: [{ scale: backgroundScale }] }]} />
      
      <Animated.View style={[styles.imageContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    backgroundColor: '#208AEF',
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
