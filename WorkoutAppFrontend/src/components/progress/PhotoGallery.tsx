import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors, palette, radius, spacing } from '@/theme';
import type { ISODate, ProgressPhoto } from '@/types/models';
import { monthDay } from '@/utils/date';
import { kg } from '@/utils/format';

export interface PhotoGalleryProps {
  photos: ProgressPhoto[];
  onAdd?: () => void;
  onPressPhoto?: (photo: ProgressPhoto) => void;
}

const TILE_W = 108;
const TILE_H = 144;

/**
 * Progress photos grouped into shoot sessions, newest first. Each session is a
 * horizontal row so front/side/back stay side by side for comparison.
 */
export function PhotoGallery({ photos, onAdd, onPressPhoto }: PhotoGalleryProps) {
  const groups = useMemo(() => {
    const map = new Map<ISODate, ProgressPhoto[]>();
    for (const photo of photos) {
      const list = map.get(photo.date) ?? [];
      list.push(photo);
      map.set(photo.date, list);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [photos]);

  return (
    <Card padded={false}>
      <View style={styles.header}>
        <View>
          <Text variant="h2">Progress photos</Text>
          <Text variant="micro" tone="tertiary">
            {groups.length} shoot{groups.length === 1 ? '' : 's'} · every 2 weeks
          </Text>
        </View>
        {onAdd ? (
          <Pressable onPress={onAdd} hitSlop={8} style={styles.add}>
            <Ionicons name="camera" size={16} color={colors.primary} />
            <Text variant="label" tone="primary">
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>

      {groups.map(([date, group], groupIndex) => (
        <View key={date} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text variant="label">{monthDay(date)}</Text>
            <Text variant="micro" tone="tertiary">
              {kg(group[0].weightKg)}
              {groupIndex === 0 ? ' · latest' : ''}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}>
            {group.map((photo) => (
              <Pressable
                key={photo.id}
                onPress={() => onPressPhoto?.(photo)}
                style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
                {/* Gradient sits under the image so the tile still reads if the
                    remote asset is unavailable offline. */}
                <LinearGradient
                  colors={[palette.blue100, palette.grey200]}
                  style={StyleSheet.absoluteFill}
                />
                <Image
                  source={{ uri: photo.uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={220}
                />
                <View style={styles.poseTag}>
                  <Text variant="micro" color={colors.textInverse}>
                    {photo.pose.toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  group: {
    paddingBottom: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  strip: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tile: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  poseTag: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: 'rgba(14,17,22,0.62)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  pressed: {
    opacity: 0.8,
  },
});
