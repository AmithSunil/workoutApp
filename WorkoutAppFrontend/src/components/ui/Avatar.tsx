import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StatusDot } from './StatusDot';
import { Text } from './Text';
import { colors, palette } from '@/theme';
import type { ComplianceStatus } from '@/types/models';
import { initials } from '@/utils/format';

export interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
  /** Renders a traffic-light dot on the bottom-right corner. */
  status?: ComplianceStatus;
}

const TINTS = [palette.blue100, palette.green50, palette.amber50, palette.violet50, palette.teal50];
const INK = [palette.blue600, palette.green600, palette.amber500, palette.violet500, palette.teal500];

/** Deterministic tint so the same person always gets the same monogram colour. */
const hash = (value: string) =>
  Math.abs([...value].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7));

export function Avatar({ name, uri, size = 44, status }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const idx = hash(name) % TINTS.length;

  return (
    <View style={{ width: size, height: size }}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          transition={180}
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: TINTS[idx],
            },
          ]}>
          <Text
            variant={size >= 44 ? 'bodyStrong' : 'micro'}
            color={INK[idx]}
            style={{ fontSize: Math.max(10, size * 0.36) }}>
            {initials(name)}
          </Text>
        </View>
      )}
      {status ? (
        <View style={styles.statusWrap}>
          <StatusDot status={status} size={Math.max(9, size * 0.26)} ring />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceMuted,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusWrap: {
    position: 'absolute',
    right: -1,
    bottom: -1,
  },
});
