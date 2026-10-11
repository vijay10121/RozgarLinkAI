import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

type ErrorStateProps = {
  title?: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: ErrorStateProps) {
  return (
    <Alert className="items-start p-4" variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {action ? <div className="col-start-2 mt-2">{action}</div> : null}
    </Alert>
  );
}
