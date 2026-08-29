import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetRolesQuery } from '@/api/endpoints/trainerApi';
import { Avatar, Card, Skeleton, StatusDot, Text } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { saveSession } from '@/store/persistence';
import { signedInAsClient, signedInAsTrainer } from '@/store/slices/sessionSlice';
import { colors, palette, radius, spacing, statusLabel } from '@/theme';
import { plural } from '@/utils/format';

/**
 * Role gate. In production this screen is the auth handshake; here it doubles as
 * a demo switcher so both sides of the product can be inspected in one build.
 */
export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const role = useAppSelector((s) => s.session.role);
  const { data, isLoading } = useGetRolesQuery();

  // A persisted session skips this screen entirely.
  if (role === 'client') return <Redirect href={routes.client.explore()} />;
  if (role === 'trainer') return <Redirect href={routes.trainer.dashboard()} />;

  const continueAsClient = (clientId: string) => {
    dispatch(signedInAsClient({ clientId }));
    void saveSession({ role: 'client', userId: clientId, activeClientId: clientId });
    router.replace(routes.client.explore());
  };

  const continueAsTrainer = (trainerId: string) => {
    dispatch(signedInAsTrainer({ trainerId }));
    void saveSession({ role: 'trainer', userId: trainerId, activeClientId: null });
    router.replace(routes.trainer.dashboard());
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[palette.blue50, colors.background]}
        style={[styles.gradient, { height: 320 + insets.top }]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.giant, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="barbell" size={22} color={colors.textOnPrimary} />
          </View>
          <Text variant="display" style={styles.title}>
            Apex
          </Text>
          <Text variant="body" tone="secondary" align="center" style={styles.tagline}>
            One app, two sides of the coaching relationship. Pick who you are signing in as.
          </Text>
        </View>

        {isLoading || !data ? (
          <View style={styles.loading}>
            <Skeleton height={92} radius={18} />
            <Skeleton height={92} radius={18} />
            <Skeleton height={92} radius={18} />
          </View>
        ) : (
          <>
            <Card onPress={() => continueAsTrainer(data.trainer.id)} style={styles.trainerCard}>
              <View style={styles.row}>
                <Avatar name={data.trainer.name} uri={data.trainer.avatarUrl} size={52} />
                <View style={styles.rowText}>
                  <View style={styles.roleTag}>
                    <Ionicons name="clipboard-outline" size={11} color={colors.primary} />
                    <Text variant="micro" tone="primary">
                      TRAINER
                    </Text>
                  </View>
                  <Text variant="h1" numberOfLines={1}>
                    {data.trainer.name}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {plural(data.clients.length, 'active client')} · {data.trainer.headline}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <Text variant="label" tone="secondary">
                OR CONTINUE AS A CLIENT
              </Text>
            </View>

            <View style={styles.clientList}>
              {data.clients.map((client) => (
                <Pressable
                  key={client.id}
                  onPress={() => continueAsClient(client.id)}
                  style={({ pressed }) => [styles.clientRow, pressed && styles.pressed]}>
                  <Avatar name={client.name} uri={client.avatarUrl} size={40} />
                  <View style={styles.rowText}>
                    <Text variant="h2" numberOfLines={1}>
                      {client.name}
                    </Text>
                    <View style={styles.statusRow}>
                      <StatusDot status={client.compliance.status} size={7} />
                      <Text variant="micro" tone="tertiary">
                        {statusLabel(client.compliance.status)} · {client.compliance.score}% adherence
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>

            <Text variant="micro" tone="tertiary" align="center" style={styles.footnote}>
              Demo build · data served from the bundled mock API. Sign out from any profile screen
              to return here.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    letterSpacing: -1,
  },
  tagline: {
    maxWidth: 300,
  },
  loading: {
    gap: spacing.md,
  },
  trainerCard: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.primarySoftBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 3,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },
  clientList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  footnote: {
    marginTop: spacing.md,
    maxWidth: 300,
    alignSelf: 'center',
  },
});
