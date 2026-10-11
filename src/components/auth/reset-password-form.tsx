"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { updatePasswordAction } from "@/app/auth/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const invalidLink = searchParams.get("error") === "link_invalid";
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-5">
      {invalidLink ? (
        <Alert variant="destructive">
          <AlertTitle>This reset link can’t be used</AlertTitle>
          <AlertDescription>
            It may have expired or already been used.{" "}
            <Link className="font-semibold underline" href="/forgot-password">
              Request a new password-reset link
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Password could not be updated</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {!invalidLink ? (
        <form action={formAction} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="new-password">
              New password
            </label>
            <div className="relative">
              <Input
                autoComplete="new-password"
                className="h-11 bg-background pr-12"
                id="new-password"
                aria-describedby={
                  state.fieldErrors?.password
                    ? "new-password-error"
                    : "password-hint"
                }
                aria-invalid={Boolean(state.fieldErrors?.password)}
                minLength={10}
                maxLength={128}
                name="password"
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
            {state.fieldErrors?.password ? (
              <p
                className="text-sm text-destructive"
                id="new-password-error"
              >
                {state.fieldErrors.password}
              </p>
            ) : (
              <p
                className="text-xs text-muted-foreground"
                id="password-hint"
              >
                Use 10–128 characters with at least one letter and one number.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirm-password">
              Confirm new password
            </label>
            <Input
              autoComplete="new-password"
              className="h-11 bg-background"
              id="confirm-password"
              aria-describedby={
                state.fieldErrors?.confirmPassword
                  ? "confirm-password-error"
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
              maxLength={128}
              name="confirmPassword"
              required
              type={showPassword ? "text" : "password"}
            />
            {state.fieldErrors?.confirmPassword ? (
              <p
                className="text-sm text-destructive"
                id="confirm-password-error"
              >
                {state.fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>
          <Button
            className="h-12 w-full"
            disabled={isPending}
            size="lg"
            type="submit"
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Updating password…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
