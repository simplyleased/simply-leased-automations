// Shared auth guard: returns the signed-in user ONLY if their email domain is
// allowed, else null. Used by pages and API routes to attribute actions.
import { auth, currentUser } from '@clerk/nextjs/server';

export const ALLOWED_DOMAINS = ['version.so', 'simply-leased.com'];

export async function getAllowedUser() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    '';
  const domain = email.split('@')[1]?.toLowerCase();
  if (!ALLOWED_DOMAINS.includes(domain)) return null;
  return { userId, email };
}
