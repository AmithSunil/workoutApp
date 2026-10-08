import { StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { spacing } from '@/theme';

/**
 * Who runs Corda and how to reach them, shown on /privacy and /terms.
 * ponytail: an individual for now; swap in the business name when there is one.
 */
export const OPERATOR = 'Amith';
export const CONTACT_EMAIL = 'hello@corda.fit';
export const EFFECTIVE = '8 October 2026';

export type LegalSection = { heading: string; body: string[] };

/** A plain, readable policy page. Public: reachable signed out, prerendered for the web. */
export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <Screen title={title} subtitle={`Effective ${EFFECTIVE}`} showBack tabBarPadding={false}>
      {sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text variant="h2">{s.heading}</Text>
          {s.body.map((p) => (
            <Text key={p} tone="secondary">
              {p}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
