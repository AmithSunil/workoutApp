import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from './Text';
import { colors, spacing } from '@/theme';

export interface StatItem {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Small coloured line under the label — a trend, a subtotal. */
  hint?: string;
  hintColor?: string;
}

/** Headline numbers side by side, split by hairlines — sits inside a card. */
export function StatRow({ items, style }: { items: StatItem[]; style?: ViewStyle }) {
  return (
    <View style={[styles.row, style]}>
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 ? <View style={styles.rule} /> : null}
          <View style={styles.stat}>
            <View style={styles.value}>
              {item.icon ? <Ionicons name={item.icon} size={18} color={colors.primary} /> : null}
              <Text variant="metric" numberOfLines={1} style={styles.number}>
                {item.value}
              </Text>
            </View>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {item.label}
            </Text>
            {item.hint ? (
              <Text variant="micro" color={item.hintColor ?? colors.textTertiary} numberOfLines={1}>
                {item.hint}
              </Text>
            ) : null}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  number: {
    fontSize: 24,
    lineHeight: 30,
  },
  rule: {
    width: StyleSheet.hairlineWidth * 2,
    alignSelf: 'stretch',
    backgroundColor: colors.divider,
  },
});
