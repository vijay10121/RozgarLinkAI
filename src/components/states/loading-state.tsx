import { Skeleton } from "@/components/ui/skeleton";

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="space-y-3 rounded-xl border border-border bg-card p-5"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}
