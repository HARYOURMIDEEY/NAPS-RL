import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Role, User } from "@prisma/client";

/**
 * Middleware (middleware.ts) only checks the JWT signature and role claim —
 * it runs on the Edge runtime, where Prisma can't reach Postgres directly,
 * so it can't check live account state. Every API route that touches
 * sensitive data must call this instead, which re-checks against the
 * database: sessionVersion (so a password change invalidates old sessions),
 * isActive, isSuspended, role, and a pending forced password change.
 * Treat middleware as a UX convenience and this as the real authorization
 * boundary.
 */
export async function requireUser(
  allowedRoles?: Role[],
  options: { allowPendingPasswordChange?: boolean } = {}
): Promise<
  { ok: true; user: User } | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, status: 401, error: "Not signed in." };

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return { ok: false, status: 401, error: "Account not found." };

  if (user.sessionVersion !== session.sessionVersion) {
    return { ok: false, status: 401, error: "Session expired. Please log in again." };
  }
  if (!user.isActive || user.isSuspended) {
    return { ok: false, status: 403, error: "Account is not active." };
  }
  if (user.mustChangePassword && !options.allowPendingPasswordChange) {
    return {
      ok: false,
      status: 403,
      error: "You must change your password before continuing.",
    };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { ok: false, status: 403, error: "You don't have permission to do this." };
  }

  return { ok: true, user };
}
