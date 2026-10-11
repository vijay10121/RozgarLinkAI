import type { Metadata } from "next";
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Join RozgarLink to connect your skills with work and training opportunities.",
};

const steps = [
  {
    label: "Choose your path",
    detail: "Tell us how you’ll use RozgarLink.",
    icon: BriefcaseBusiness,
  },
  {
    label: "Share a few details",
    detail: "We’ll tailor the right profile for you.",
    icon: GraduationCap,
  },
  {
    label: "Verify your email",
    detail: "Keep your account safe and yours.",
    icon: BadgeCheck,
  },
];

export default function RegisterPage() {
  return (
    <div className="relative isolate min-h-full overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_4%_15%,var(--color-brand-soft),transparent_42%)]"
      />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14 lg:px-12 lg:py-16">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Link
            className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/"
          >
            <ArrowUpRight aria-hidden="true" className="size-4 rotate-[-45deg]" />
            Back to RozgarLink
          </Link>
          <div className="mt-9 flex size-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/15">
            <ShieldCheck aria-hidden="true" className="size-7" />
          </div>
          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Your next chapter starts here
          </p>
          <h1 className="mt-3 max-w-xl font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Make your skills count.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Create your RozgarLink account and take the first step toward
            opportunities shaped around what you can do.
          </p>

          <ol className="mt-9 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {steps.map(({ label, detail, icon: Icon }, index) => (
              <li
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-white/70 p-4"
                key={label}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    <span className="mr-1.5 text-brand">0{index + 1}</span>
                    {label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-7 hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span className="size-2 rounded-full bg-brand" />
            Your information is protected and used to set up your profile.
          </div>
        </aside>

        <section
          aria-labelledby="registration-heading"
          className="rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-foreground/[0.04] sm:p-8 lg:p-10"
        >
          <div className="mb-8 border-b border-border pb-6">
            <p className="text-sm font-medium text-brand">Join RozgarLink</p>
            <h2
              className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
              id="registration-heading"
            >
              Create your account
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose your account type, then add your details.
            </p>
          </div>
          <RegisterForm />
        </section>
      </div>
    </div>
  );
}
