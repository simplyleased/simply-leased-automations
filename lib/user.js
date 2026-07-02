// Single source of truth for who may use the portal. A user is allowed ONLY if
// they have a VERIFIED email whose domain is in the allowlist. getUserState()
// drives the 3 UI states; getAllowedUser() is the null-or-user guard for routes.
import { auth, currentUser } from '@clerk/nextjs/server';

export const ALLOWED_DOMAINS = ['version.so', 'simply-leased.com'];

function domainOf(addr) {
  const at = String(addr || '').lastIndexOf('@');
  return at === -1 ? '' : addr.slice(at + 1).toLowerCase();
}

// Returns one of:
//   { state: 'anon' }                        - not signed in
//   { state: 'denied', email, userId }       - signed in, no verified allowed email
//   { state: 'ok', email, userId }           - signed in with a verified allowed email
export async function getUserState() {
  const { userId } = await auth();
  if (!userId) return { state: 'anon' };

  const user = await currentUser();
  const emails = user?.emailAddresses || [];

  for (const e of emails) {
    if (e?.verification?.status !== 'verified') continue;
    if (ALLOWED_DOMAINS.includes(domainOf(e.emailAddress))) {
      return { state: 'ok', email: e.emailAddress, userId };
    }
  }

  const shown = user?.primaryEmailAddress?.emailAddress || emails[0]?.emailAddress || '';
  return { state: 'denied', email: shown, userId };
}

export async function getAllowedUser() {
  const s = await getUserState();
  return s.state === 'ok' ? { userId: s.userId, email: s.email } : null;
}

// --- Role-based permissions -------------------------------------------------
// Only these people may ever perform sensitive/financial actions:
// removing charges, adding vendors, approving payouts.
export const PRIVILEGED_USERS = ['glen@simply-leased.com', 'christian@simply-leased.com'];

export function canManageFinancials(user) {
  return !!user && PRIVILEGED_USERS.includes(String(user.email || '').toLowerCase());
}

// Route guard for sensitive actions: returns the user only if allowed AND
// privileged, else null (caller returns 403).
export async function getPrivilegedUser() {
  const user = await getAllowedUser();
  return canManageFinancials(user) ? user : null;
}
