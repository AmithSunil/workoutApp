export {
  colors,
  palette,
  spacing,
  radius,
  typography,
  fonts,
  fontFor,
  elevation,
  motion,
} from './tokens';
export type { TypographyVariant, TypographySpec, FontFamilyGroup } from './tokens';

import { colors } from './tokens';
import type { ComplianceStatus } from '@/types/models';

/** Maps a client's compliance status onto the traffic-light palette. */
export const statusColor = (status: ComplianceStatus): string => {
  switch (status) {
    case 'green':
      return colors.statusGreen;
    case 'yellow':
      return colors.statusYellow;
    case 'red':
    default:
      return colors.statusRed;
  }
};

export const statusLabel = (status: ComplianceStatus): string => {
  switch (status) {
    case 'green':
      return 'On track';
    case 'yellow':
      return 'Needs a nudge';
    case 'red':
    default:
      return 'At risk';
  }
};
