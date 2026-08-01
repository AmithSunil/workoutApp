/**
 * TrainerPin – persistent motivational bubble from the trainer.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Brand, FontSizes, Radius, Shadow, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

export function TrainerPin() {
  const theme = useTheme();
  const { state } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundCard, borderColor: theme.border, ...Shadow.sm }]}>
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: Brand.primary }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.avatar}>{state.trainerAvatar}</Text>
          <View style={styles.headerText}>
            <Text style={[styles.trainerName, { color: theme.text }]}>{state.trainerName}</Text>
            <View style={[styles.pinBadge, { backgroundColor: Brand.primary + '1A' }]}>
              <Text style={[styles.pinBadgeText, { color: Brand.primary }]}>📌 This Week</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.note, { color: theme.text }]}>{state.trainerNote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderRadius: 0,
  },
  content: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    fontSize: 24,
  },
  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
    flex: 1,
  },
  trainerName: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  pinBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  pinBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  note: {
    fontSize: FontSizes.base,
    lineHeight: FontSizes.base * 1.5,
    fontWeight: '400',
  },
});
