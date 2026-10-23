import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session-core";

// Server-only wrapper: adds cookie read/write on top of the edge-safe JWT
// logic in session-core.ts. Only import this file from Route Handlers or
// Server Components — middleware.ts imports session-core.ts directly
// instead, since it runs on the Edge runtime.

export { SESSION_COOKIE, createSessionToken, verifySessionToken };
export type { SessionPayload };

export async function setSessionCookie(token: string, rememberMe: boolean) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Reads and verifies the current session from a Server Component or Route Handler. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
