import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE = "iagree_visitor";

/**
 * Browsers clamp cookie lifetime to 400 days, so asking for more is silently
 * truncated rather than honoured. 400 is the real ceiling; naming it here
 * stops someone "fixing" it to ten years and believing the change took.
 */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** A v4 UUID and nothing else — see `visitorId`. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The identity an unauthenticated visitor is counted under.
 *
 * Deliberately weak: clearing cookies earns a fresh free allowance. That is
 * accepted, because the free tier is a courtesy rather than a paywall, and the
 * per-IP burst window in `ratelimit.ts` is what actually caps the damage a
 * script can do. What this does buy is that everyone behind one office or
 * campus NAT gets their own five, which an IP-keyed quota would not give them.
 *
 * The value is validated before use rather than trusted: it is client-supplied
 * text that goes on to become a database key, and an unbounded attacker-chosen
 * string has no business being one. Anything that isn't a UUID we minted is
 * replaced.
 *
 * Must be called from a Route Handler or Server Function — setting a cookie
 * during Server Component render is a no-op.
 */
export async function visitorId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && UUID.test(existing)) return existing;

  const fresh = randomUUID();
  jar.set(COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return fresh;
}
