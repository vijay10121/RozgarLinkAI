import { Suspense } from "react";
import Link from "next/link";

import { AuthNavigation } from "@/components/layout/auth-navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-4 sm:px-8 lg:px-12">
        <Link
          aria-label="RozgarLink home"
          className="inline-flex items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
          id="top"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
            R
          </span>
          RozgarLink
        </Link>
        <nav
          aria-label="Main navigation"
          className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-2 pb-0.5 text-xs font-medium text-muted-foreground sm:order-none sm:w-auto sm:flex-nowrap sm:gap-7 sm:text-sm"
        >
          <Link className="whitespace-nowrap transition-colors hover:text-foreground" href="/#platform">
            Platform
          </Link>
          <Link className="whitespace-nowrap transition-colors hover:text-foreground" href="/#how-it-starts">
            Getting started
          </Link>
          <Link
            className="whitespace-nowrap transition-colors hover:text-foreground"
            href="/register"
          >
            Create account
          </Link>
        </nav>
        <Suspense
          fallback={
            <Link
              className="rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/login"
            >
              Log in
            </Link>
          }
        >
          <AuthNavigation />
        </Suspense>
      </div>
    </header>
  );
}
