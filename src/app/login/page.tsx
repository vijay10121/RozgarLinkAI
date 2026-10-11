import type { Metadata } from "next";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your RozgarLink account.",
};

export default function LoginPage() {
  return (
    <div className="relative isolate min-h-full overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_96%_12%,var(--color-brand-soft),transparent_42%)]"
      />
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16 lg:px-12 lg:py-24">
        <div>
          <Link
            className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
          >
            <ArrowUpRight aria-hidden="true" className="size-4 rotate-[-45deg]" />
            Back to RozgarLink
          </Link>
          <div className="mt-10 flex size-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/15">
            <BriefcaseBusiness aria-hidden="true" className="size-7" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Welcome back
          </p>
          <h1 className="mt-3 max-w-lg font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Your next opportunity is worth showing up for.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Log in to pick up where you left off on your skills-to-opportunity
            journey.
          </p>
        </div>
        <section
          aria-labelledby="login-heading"
          className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl shadow-foreground/[0.04] sm:p-9"
        >
          <div className="mb-7">
            <p className="text-sm font-medium text-brand">Your account</p>
            <h2
              className="mt-2 font-heading text-2xl font-semibold tracking-tight"
              id="login-heading"
            >
              Log in to RozgarLink
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the email and password linked to your account. Admin
              registrations still require a separate administrator approval.
            </p>
          </div>
          <Suspense
            fallback={
              <div
                aria-label="Loading login form"
                className="h-64 animate-pulse rounded-xl bg-muted/60"
                role="status"
              />
            }
          >
            <LoginForm />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
