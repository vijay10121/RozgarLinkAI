type DashboardPlaceholderProps = {
  title: string;
  description: string;
};

export function DashboardPlaceholder({
  title,
  description,
}: DashboardPlaceholderProps) {
  return (
    <section
      aria-labelledby="dashboard-title"
      className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-24"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
        RozgarLink workspace
      </p>
      <h1
        className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
        id="dashboard-title"
      >
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        {description}
      </p>
      <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
        Dashboard features are not available yet. Your authenticated account
        and role-specific access are ready; no sample jobs, courses, or user
        data are shown here.
      </div>
    </section>
  );
}
