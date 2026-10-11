import type { ReactNode } from "react";

export function SeekerPage({
  eyebrow,
  title,
  description,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-6" aria-labelledby="seeker-page-title">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            id="seeker-page-title"
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
