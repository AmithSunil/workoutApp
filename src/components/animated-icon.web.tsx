import { Image } from 'expo-image';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import React, { useEffect, useRef } from 'react';

import classes from './animated-icon.module.css';
import * as SplashScreen from 'expo-splash-screen';

const DURATION = 300;

export function AnimatedSplashOverlay() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return null;
}

export function AnimatedIcon() {
  const keyframeScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.2)).current;
  const glowRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(keyframeScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(glowRotation, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
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

      <Animated.View style={[styles.background, { transform: [{ scale: keyframeScale }] }]}>
        <div className={classes.expoLogoBackground} />
      </Animated.View>

      <Animated.View style={[styles.imageContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
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
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
  },
});
