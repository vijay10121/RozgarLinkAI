"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function TrainerError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
      <Alert role="alert" variant="destructive">
        <AlertTitle>This provider page couldn’t be loaded</AlertTitle>
        <AlertDescription>
          Your account and course data remain protected. Check the connection
          and try again. If this continues, confirm the training-provider
          migration has been applied to the intended Supabase project.
        </AlertDescription>
      </Alert>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
