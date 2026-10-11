import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  getDashboardPath,
  getRoleForPrivatePath,
  isMissingAuthSessionError,
} from "@/lib/auth-routing";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  path: string,
) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getClaims();

  const requiredRole = getRoleForPrivatePath(request.nextUrl.pathname);
  if (!requiredRole) {
    return response;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError && !isMissingAuthSessionError(authError)) {
    return redirectWithCookies(request, response, "/login?error=session_check_failed");
  }

  if (!user) {
    return redirectWithCookies(request, response, "/login?error=session_expired");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return redirectWithCookies(request, response, "/login?error=profile_unavailable");
  }

  if (!profile) {
    return redirectWithCookies(request, response, "/login?error=profile_missing");
  }

  if (profile.account_status !== "active") {
    return redirectWithCookies(request, response, "/login?error=account_suspended");
  }

  if (profile.role !== requiredRole) {
    return redirectWithCookies(
      request,
      response,
      getDashboardPath(profile.role),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
