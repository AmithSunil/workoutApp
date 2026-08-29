import { StyleSheet, View } from 'react-native';

import { colors, statusColor } from '@/theme';
import type { ComplianceStatus } from '@/types/models';

export interface StatusDotProps {
  status: ComplianceStatus;
  size?: number;
  /** Adds a surface-coloured ring so the dot reads on top of a photo. */
  ring?: boolean;
}

/** Traffic-light compliance indicator used across the roster and triage lists. */
export function StatusDot({ status, size = 10, ring }: StatusDotProps) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: statusColor(status),
        },
        ring && { borderWidth: 2, borderColor: colors.surface, width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 },
      ]}
      accessibilityLabel={`Compliance ${status}`}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    alignSelf: 'center',
  },
});
