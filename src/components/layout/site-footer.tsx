import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>
          <span className="font-semibold text-foreground">RozgarLink</span>
          <span aria-hidden="true"> · </span>
          Skills to opportunity
        </p>
        <Link
          className="w-fit rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="#top"
        >
          Back to top
        </Link>
      </div>
    </footer>
  );
}
