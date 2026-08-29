import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function Divider({ inset = 0, vertical = false }: { inset?: number; vertical?: boolean }) {
  if (vertical) {
    return <View style={[styles.vertical, { marginVertical: inset }]} />;
  }
  return <View style={[styles.horizontal, { marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
});
