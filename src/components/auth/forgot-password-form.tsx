"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";

import { forgotPasswordAction } from "@/app/auth/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    {},
  );

  return (
    <div className="space-y-5">
      {state.success ? (
        <Alert>
          <MailCheck aria-hidden="true" />
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not send reset link</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {!state.success ? (
        <form action={formAction} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="reset-email"
            >
              Email address
            </label>
            <Input
              autoComplete="email"
              className="h-11 bg-background"
              id="reset-email"
              aria-describedby={
                state.fieldErrors?.email ? "reset-email-error" : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.email)}
              inputMode="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
            {state.fieldErrors?.email ? (
              <p className="text-sm text-destructive" id="reset-email-error">
                {state.fieldErrors.email}
              </p>
            ) : null}
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
                Sending link…
              </>
            ) : (
              <>
                Send reset link
                <ArrowRight aria-hidden="true" className="size-4" />
              </>
            )}
          </Button>
        </form>
      ) : null}
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/login"
        >
          Back to log in
        </Link>
      </p>
    </div>
  );
}
