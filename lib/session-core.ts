import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

// Deliberately free of `next/headers` — this file is imported by
// middleware.ts, which runs on Next.js's Edge Runtime and cannot use
// next/headers (that API is scoped to Server Components and Route
// Handlers). Cookie-reading/writing helpers live in lib/session.ts instead,
// which is only ever imported from Route Handlers and Server Components.

export const SESSION_COOKIE = "naps_session";

export type SessionPayload = {
  sub: string; // user id
  username: string;
  role: Role;
  fullName: string;
  level: number | null;
  sessionVersion: number;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Generate one with `openssl rand -base64 32` and set it in .env before running any auth route."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload,
  rememberMe: boolean
): Promise<string> {
  const expiry = rememberMe ? "30d" : "12h";
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
