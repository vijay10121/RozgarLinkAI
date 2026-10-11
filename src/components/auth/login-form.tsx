"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { loginAction, type AuthActionState } from "@/app/auth/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthField } from "@/lib/auth-validation";

const loginErrors: Record<string, string> = {
  account_suspended:
    "This account is suspended. Contact support if you believe this is a mistake.",
  email_verification:
    "The verification link could not be used. It may have expired or already been used.",
  logout_failed:
    "We couldn’t confirm that you were logged out. Please try again.",
  profile_missing:
    "Your account profile is not ready. Contact support before trying again.",
  profile_unavailable:
    "We couldn’t verify your account profile. Please try again later.",
  session_check_failed:
    "Your session couldn’t be verified. Please try logging in again.",
  session_expired: "Your session expired. Log in again to continue.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [dismissedFields, setDismissedFields] = useState<
    Partial<Record<AuthField, boolean>>
  >({});
  const [dismissedAuthError, setDismissedAuthError] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (previousState: AuthActionState, formData: FormData) => {
      setDismissedFields({});
      setDismissedAuthError(false);
      return loginAction(previousState, formData);
    },
    {},
  );
  const emailVerified = searchParams.get("verified") === "1";
  const loggedOut = searchParams.get("logged_out") === "1";
  const passwordUpdated = searchParams.get("password_updated") === "1";
  const queryError = loginErrors[searchParams.get("error") ?? ""];
  const error = (dismissedAuthError ? undefined : state.error) ?? queryError;
  const emailError = dismissedFields.email ? undefined : state.fieldErrors?.email;
  const passwordError = dismissedFields.password
    ? undefined
    : state.fieldErrors?.password;

  return (
    <div className="space-y-5">
      {emailVerified ? (
        <Alert>
          <MailCheck aria-hidden="true" />
          <AlertTitle>Email verified</AlertTitle>
          <AlertDescription>
            Your email is confirmed. Log in to continue. If you requested
            administrator access, a current administrator must approve that
            request separately.
          </AlertDescription>
        </Alert>
      ) : null}
      {loggedOut ? (
        <Alert>
          <AlertTitle>You’re logged out</AlertTitle>
          <AlertDescription>
            Your RozgarLink session has been securely ended.
          </AlertDescription>
        </Alert>
      ) : null}
      {passwordUpdated ? (
        <Alert>
          <AlertTitle>Password updated</AlertTitle>
          <AlertDescription>
            Your password has been changed. Log in with your new password.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Login failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="login-email"
          >
            Email address
          </label>
          <Input
            autoComplete="email"
            className="h-11 bg-background"
            id="login-email"
            inputMode="email"
            name="email"
            aria-describedby={emailError ? "login-email-error" : undefined}
            aria-invalid={Boolean(emailError)}
            onChange={() => {
              setDismissedAuthError(true);
              setDismissedFields((fields) => ({ ...fields, email: true }))
            }}
            placeholder="you@example.com"
            required
            type="email"
          />
          {emailError ? (
            <p className="text-sm text-destructive" id="login-email-error">
              {emailError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="login-password"
          >
            Password
          </label>
          <div className="relative">
            <Input
              autoComplete="current-password"
              className="h-11 bg-background pr-12"
              id="login-password"
              aria-describedby={
                passwordError ? "login-password-error" : undefined
              }
              aria-invalid={Boolean(passwordError)}
              minLength={1}
              name="password"
              onChange={() => {
                setDismissedAuthError(true);
                setDismissedFields((fields) => ({
                  ...fields,
                  password: true,
                }))
              }}
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
          {passwordError ? (
            <p className="text-sm text-destructive" id="login-password-error">
              {passwordError}
            </p>
          ) : null}
        </div>
        <div className="-mt-2 flex justify-end">
          <Link
            className="text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <Button
          className="h-12 w-full gap-2 text-base"
          disabled={isPending}
          size="lg"
          type="submit"
        >
          {isPending ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Logging in…
            </>
          ) : (
            <>
              Log in
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to RozgarLink?{" "}
        <Link
          className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/register"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
