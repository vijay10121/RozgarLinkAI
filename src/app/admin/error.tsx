"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
      <Alert variant="destructive" role="alert">
        <AlertTitle>Admin workspace couldn’t be loaded</AlertTitle>
        <AlertDescription>
          Your account remains secure. Check your connection and confirm the
          admin job-management migrations have been applied before retrying.
        </AlertDescription>
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
