import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session-core";

// This is the server-side enforcement the requirements doc insists on
// (§16, §42): a student can never reach admin pages by editing the URL,
// because this check runs before any page renders, regardless of what the
// client sends.

const STUDENT_ONLY_ROUTES = [
  "/dashboard",
  "/materials",
  "/quiz",
  "/exam",
  "/leaderboard",
  "/ai-tutor",
];
const ANY_AUTHENTICATED_ROUTES = ["/settings"]; // students and admins both land here (forced password change, etc.)
const ADMIN_ROUTES = ["/admin"];
const ADMIN_PUBLIC_PATHS = ["/admin/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isAdminPublic = ADMIN_PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAdminRoute =
    ADMIN_ROUTES.some((p) => pathname.startsWith(p)) && !isAdminPublic;
  const isStudentOnlyRoute = STUDENT_ONLY_ROUTES.some((p) => pathname.startsWith(p));
  const isAnyAuthenticatedRoute = ANY_AUTHENTICATED_ROUTES.some((p) => pathname.startsWith(p));

  if (isAdminRoute) {
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (isStudentOnlyRoute) {
    if (!session || session.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (isAnyAuthenticatedRoute) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/materials/:path*",
    "/quiz/:path*",
    "/exam/:path*",
    "/leaderboard/:path*",
    "/ai-tutor/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
