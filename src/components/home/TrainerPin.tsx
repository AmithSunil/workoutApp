/**
 * TrainerPin – editorial blockquote from the trainer.
 * No card chrome, no shadows, no pills. Just text and a 1px border.
 */
import { StyleSheet, Text, View } from 'react-native';

import { FontSizes, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

export function TrainerPin() {
  const theme = useTheme();
  const { state } = useApp();

  return (
    <View style={[styles.container, { borderTopColor: theme.border }]}>
      {/* Micro-label */}
      <Text style={[styles.pinLabel, { color: theme.textTertiary }]}>
        📌 PINNED NOTE
      </Text>

      {/* Note body */}
      <Text style={[styles.note, { color: theme.text }]}>
        {state.trainerNote}
      </Text>

      {/* Attribution */}
      <Text style={[styles.attribution, { color: theme.textSecondary }]}>
        — {state.trainerName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: Spacing.five,
    gap: Spacing.three,
  },
  pinLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  note: {
    fontSize: FontSizes.base,
    lineHeight: FontSizes.base * 1.6,
    fontWeight: '400',
  },
  attribution: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
