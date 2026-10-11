"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SeekerError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
      <Alert variant="destructive" role="alert">
        <AlertTitle>This page couldn’t be loaded</AlertTitle>
        <AlertDescription>
          Your account remains secure. Check your connection and try again. If
          this continues, confirm the seeker database migration has been
          applied.
        </AlertDescription>
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
