import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { AiFoodSuggestion } from '@/types/models';
import { grams, kcal } from '@/utils/format';

export interface AiConfirmationCardProps {
  suggestion: AiFoodSuggestion;
  onConfirm: () => void;
  onDismiss: () => void;
  onRemoveItem?: (index: number) => void;
  busy?: boolean;
}

/**
 * The human-in-the-loop step for AI food parsing. Nothing the model produces is
 * written until the client confirms it, and every line stays individually
 * removable so a wrong guess never costs the whole entry.
 */
export function AiConfirmationCard({
  suggestion,
  onConfirm,
  onDismiss,
  onRemoveItem,
  busy,
}: AiConfirmationCardProps) {
  const totals = suggestion.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text variant="micro" tone="primary">
            AI PARSED · {Math.round(suggestion.confidence * 100)}%
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10}>
          <Ionicons name="close" size={16} color={colors.textTertiary} />
        </Pressable>
      </View>

      <Text variant="body" tone="secondary" style={styles.transcript}>
        “{suggestion.transcript}”
      </Text>

      <View style={styles.items}>
        {suggestion.items.map((item, index) => (
          <View key={`${item.name}-${index}`} style={styles.item}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.itemText}>
              <Text variant="label" numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="micro" tone="tertiary">
                {item.servingLabel} · {grams(item.protein)}P {grams(item.carbs)}C {grams(item.fat)}F
              </Text>
            </View>
            <Text variant="label" tone="secondary">
              {kcal(item.calories)}
            </Text>
            {onRemoveItem ? (
              <Pressable onPress={() => onRemoveItem(index)} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={17} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <Text variant="label" tone="secondary">
          Total
        </Text>
        <Text variant="bodyStrong">{kcal(totals.calories)} kcal</Text>
      </View>

      <View style={styles.actions}>
        <Button label="Not quite" variant="secondary" size="sm" onPress={onDismiss} style={styles.action} />
        <Button
          label="Log it"
          size="sm"
          icon="checkmark"
          onPress={onConfirm}
          loading={busy}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.primarySoftBorder,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  transcript: {
    fontStyle: 'italic',
  },
  items: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 17,
  },
  itemText: {
    flex: 1,
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
});
