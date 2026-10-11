import Link from "next/link";

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
          className="order-3 flex w-full items-center gap-5 overflow-x-auto pb-0.5 text-sm font-medium text-muted-foreground sm:order-none sm:w-auto sm:gap-7"
        >
          <Link className="whitespace-nowrap transition-colors hover:text-foreground" href="#platform">
            Platform
          </Link>
          <Link className="whitespace-nowrap transition-colors hover:text-foreground" href="#how-it-starts">
            Getting started
          </Link>
        </nav>
        <span className="rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          Foundation
        </span>
      </div>
    </header>
  );
}
