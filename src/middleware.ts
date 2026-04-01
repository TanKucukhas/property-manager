import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function getSecret() {
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const { env } = await getCloudflareContext();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      secret = (env as any).JWT_SECRET;
    } catch {
      // local dev
    }
  }
  return new TextEncoder().encode(secret || "property-manager-secret-change-in-production");
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get("pm_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const secret = await getSecret();
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
