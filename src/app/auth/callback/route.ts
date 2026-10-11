import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const isPasswordReset =
    request.nextUrl.searchParams.get("next") === "/reset-password";
  const failurePath = isPasswordReset
    ? "/reset-password?error=link_invalid"
    : "/login?error=email_verification";

  if (!code) {
    return NextResponse.redirect(new URL(failurePath, request.url));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(failurePath, request.url));
    }
  } catch {
    return NextResponse.redirect(new URL(failurePath, request.url));
  }

  if (isPasswordReset) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  return NextResponse.redirect(new URL("/login?verified=1", request.url));
}
