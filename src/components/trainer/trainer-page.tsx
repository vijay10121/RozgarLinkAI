import type { ReactNode } from "react";

export function TrainerPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </header>
      {children}
    </main>
  );
}
