"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getDashboardPath } from "@/lib/auth-routing";
import {
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
  type AuthFieldErrors,
} from "@/lib/auth-validation";

export type AuthActionState = {
  error?: string;
  fieldErrors?: AuthFieldErrors;
  success?: string;
};

function readEmail(formData: FormData): string {
  return String(formData.get("email") ?? "").trim();
}

function isNetworkError(error: unknown): boolean {
  const errorName =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    error instanceof TypeError ||
    errorName === "AuthRetryableFetchError" ||
    /failed to fetch|network|connection|timeout/.test(message)
  );
}

function getSafeAuthError(error: unknown): string {
  if (isNetworkError(error)) {
    return "We couldn’t reach the authentication service. Check your connection and try again.";
  }

  return "We couldn’t complete that request. Please try again.";
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  const fieldErrors: AuthFieldErrors = {};
  const emailError = validateEmail(email);
  const passwordError = validateLoginPassword(password);

  if (emailError) fieldErrors.email = emailError;
  if (passwordError) fieldErrors.password = passwordError;
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();
  let destination: string;

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        return {
          error: "Verify your email using the link we sent before logging in.",
        };
      }

      if (isNetworkError(signInError)) {
        return { error: getSafeAuthError(signInError) };
      }

      return {
        error:
          "We couldn’t log you in with those details. Check your email and password, then try again.",
      };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      await supabase.auth.signOut();
      if (userError && isNetworkError(userError)) {
        return { error: getSafeAuthError(userError) };
      }

      return {
        error: "Your session couldn’t be verified. Please try logging in again.",
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      return {
        error: "We couldn’t verify your account profile. Please try again later.",
      };
    }

    if (!profile) {
      await supabase.auth.signOut();
      return {
        error:
          "Your account profile is not ready. Contact support before trying again.",
      };
    }

    if (profile.account_status !== "active") {
      await supabase.auth.signOut();
      return {
        error:
          "This account is suspended. Contact support if you believe this is a mistake.",
      };
    }

    destination = getDashboardPath(profile.role);
  } catch (error) {
    return { error: getSafeAuthError(error) };
  }

  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  let logoutFailed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    logoutFailed = Boolean(error);
  } catch {
    logoutFailed = true;
  }

  if (logoutFailed) redirect("/login?error=logout_failed");
  redirect("/login?logged_out=1");
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readEmail(formData);
  const emailError = validateEmail(email);
  if (emailError) {
    return { fieldErrors: { email: emailError } };
  }

  try {
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    if (!configuredOrigin) {
      return {
        error:
          "Password reset is unavailable because the app URL is not configured.",
      };
    }
    const siteUrl = new URL(configuredOrigin);
    if (
      !["http:", "https:"].includes(siteUrl.protocol) ||
      siteUrl.username ||
      siteUrl.password
    ) {
      return {
        error:
          "Password reset is unavailable because the app URL is not configured.",
      };
    }
    const origin = siteUrl.origin;

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { error: getSafeAuthError(error) };
    }

    return {
      success:
        "If an account exists for that email, we’ve sent a password-reset link.",
    };
  } catch (error) {
    return { error: getSafeAuthError(error) };
  }
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fieldErrors = validateNewPassword(password, confirmPassword);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      if (userError && isNetworkError(userError)) {
        return { error: getSafeAuthError(userError) };
      }

      return {
        error: "This password-reset link is invalid or expired. Request a new one.",
      };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error: getSafeAuthError(error) };
    }
  } catch (error) {
    return { error: getSafeAuthError(error) };
  }

  redirect("/login?password_updated=1");
}
