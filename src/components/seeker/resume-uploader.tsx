"use client";

import { useState, type ChangeEvent } from "react";
import { LoaderCircle, Upload } from "lucide-react";

import {
  clearResumeAction,
  saveResumePathAction,
  type SeekerActionState,
} from "@/app/seeker/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const maxFileSize = 5 * 1024 * 1024;
const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function ResumeUploader({
  userId,
  resumePath,
}: {
  userId: string;
  resumePath: string | null;
}) {
  const [message, setMessage] = useState<SeekerActionState>({});
  const [pending, setPending] = useState(false);

  async function uploadResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMessage({});
    if (!file) return;
    if (!allowedTypes.has(file.type) || file.size > maxFileSize) {
      setMessage({
        error: "Choose a PDF or DOCX resume up to 5 MB.",
      });
      return;
    }

    setPending(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
    const supabase = createClient();

    try {
      const { error: uploadError } = await supabase.storage
        .from("private-resumes")
        .upload(path, file, {
          cacheControl: "0",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) {
        setMessage({ error: "Resume upload failed. Please try again." });
        return;
      }

      const formData = new FormData();
      formData.set("resume_path", path);
      const result = await saveResumePathAction({}, formData);
      if (result.error) {
        await supabase.storage.from("private-resumes").remove([path]);
        setMessage(result);
      } else {
        setMessage(result);
        window.location.reload();
      }
    } catch {
      setMessage({ error: "Resume upload failed. Please try again." });
    } finally {
      setPending(false);
    }
  }

  async function removeResume() {
    setPending(true);
    setMessage({});
    try {
      const result = await clearResumeAction({});
      setMessage(result);
      if (!result.error) window.location.reload();
    } catch {
      setMessage({ error: "We couldn’t remove your resume. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        PDF or DOCX, up to 5 MB. Your resume is stored in a private bucket and
        is not publicly accessible.
      </p>
      {message.success ? (
        <Alert>
          <AlertTitle>Resume updated</AlertTitle>
          <AlertDescription>{message.success}</AlertDescription>
        </Alert>
      ) : null}
      {message.error ? (
        <Alert variant="destructive">
          <AlertTitle>Resume change failed</AlertTitle>
          <AlertDescription>{message.error}</AlertDescription>
        </Alert>
      ) : null}
      {resumePath ? (
        <div className="flex flex-wrap items-center gap-3">
          <a
            className="text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/seeker/profile/resume"
          >
            Download saved resume
          </a>
          <Button
            disabled={pending}
            onClick={removeResume}
            type="button"
            variant="outline"
          >
            Remove resume
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No resume uploaded.</p>
      )}
      <label className="inline-flex cursor-pointer">
        <input
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={pending}
          onChange={uploadResume}
          type="file"
        />
        <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground outline-none hover:bg-brand/90 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden="true" className="size-4" />
          )}
          {pending ? "Saving resume…" : "Upload resume"}
        </span>
      </label>
    </div>
  );
}
