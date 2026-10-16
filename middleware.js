import { NextResponse } from "next/server";
import { sessionToken } from "./lib/auth";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (!process.env.APP_PASSWORD) {
    return new NextResponse("APP_PASSWORD non configurata", { status: 500 });
  }

  const expected = await sessionToken(process.env.APP_PASSWORD);
  const cookie = request.cookies.get("rentri_session")?.value;

  if (cookie === expected) {
    return NextResponse.next();
  }

  // Le API rispondono con 401, le pagine con il redirect al login
  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // api/cron è escluso: lo chiama Vercel Cron senza cookie di sessione.
  // La route si protegge da sola con "Authorization: Bearer CRON_SECRET".
  matcher: ["/((?!login|api/login|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
