import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your RozgarLink account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="relative isolate min-h-full overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_96%_12%,var(--color-brand-soft),transparent_42%)]"
      />
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16 lg:px-12 lg:py-24">
        <div>
          <Link
            className="text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/login"
          >
            Back to log in
          </Link>
          <h1 className="mt-8 max-w-lg font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Choose a new password.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Use a strong password you haven’t used for this account before.
          </p>
        </div>
        <section
          aria-labelledby="reset-password-heading"
          className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl shadow-foreground/[0.04] sm:p-9"
        >
          <div className="mb-7">
            <p className="text-sm font-medium text-brand">Account recovery</p>
            <h2
              className="mt-2 font-heading text-2xl font-semibold tracking-tight"
              id="reset-password-heading"
            >
              Set a new password
            </h2>
          </div>
          <Suspense
            fallback={
              <div
                aria-label="Loading password reset form"
                className="h-64 animate-pulse rounded-xl bg-muted/60"
                role="status"
              />
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
