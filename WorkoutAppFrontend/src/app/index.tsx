import { Redirect } from 'expo-router';

import { homeFor, routes } from '@/navigation/routes';
import { useAppSelector } from '@/store/hooks';

/**
 * The entry gate — no UI of its own.
 *
 * The root layout holds every child until the Supabase session has been
 * resolved, so by the time this renders `status` is settled and the decision is
 * a single redirect: to the shell for the role the backend reported, or to
 * `/welcome`. Role now comes from `app_role()` over a real token, never from a
 * client-side choice.
 *
 * `/welcome` is the whole of signing in — address, code, and the role
 * question only for an account with no profile behind it. It catches the
 * signed-out visitor and the `needsProfile` session alike.
 */
export default function IndexScreen() {
  const status = useAppSelector((s) => s.session.status);
  const role = useAppSelector((s) => s.session.role);

  if (status === 'signedIn' && role) return <Redirect href={homeFor(role)} />;
  return <Redirect href={routes.welcome()} />;
}
