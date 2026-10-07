import { NextResponse } from "next/server";
import { sessionToken } from "../../../lib/auth";

export async function POST(request) {
  const form = await request.formData();
  const password = form.get("password") || "";
  const expected = process.env.APP_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set("rentri_session", await sessionToken(expected), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 giorni
  });
  return res;
}
