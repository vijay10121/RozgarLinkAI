import { LoaderCircle } from "lucide-react";

export default function AdminLoading() {
  return (
    <div
      aria-label="Loading admin workspace"
      className="flex min-h-64 items-center justify-center text-muted-foreground"
      role="status"
    >
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
      <span className="sr-only">Loading admin workspace</span>
    </div>
  );
}
