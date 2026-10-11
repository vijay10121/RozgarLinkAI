"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle } from "lucide-react";

import {
  saveTrainerCourseAction,
  type TrainerActionState,
} from "@/app/trainer/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCourseImage } from "@/lib/trainer/validation";
import type { TrainerCourse } from "@/lib/trainer/data";
import { createClient } from "@/lib/supabase/client";

export function TrainerCourseForm({ course }: { course?: TrainerCourse }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<TrainerActionState, FormData>(
    saveTrainerCourseAction,
    {},
  );
  const [imagePath, setImagePath] = useState(course?.image_path ?? "");
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [router, state.redirectTo]);

  async function uploadImage(file?: File) {
    setImageError("");
    if (!file) return;
    if (!isCourseImage(file)) {
      setImageError("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setImageError("Sign in again before uploading a course image.");
        return;
      }
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice(6);
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("training-course-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setImageError("The course image could not be uploaded. Please retry.");
        return;
      }
      setImagePath(path);
    } catch {
      setImageError("The course image could not be uploaded. Please retry.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {course ? <input name="course_id" type="hidden" value={course.id} /> : null}
      <input name="image_path" type="hidden" value={imagePath} />
      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Course not saved</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      {imageError ? (
        <Alert variant="destructive">
          <AlertTitle>Image upload failed</AlertTitle>
          <AlertDescription>{imageError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <Field label="Course title" id="course-title">
          <Input
            autoComplete="off"
            defaultValue={course?.title ?? ""}
            id="course-title"
            maxLength={200}
            name="title"
            required
          />
        </Field>
        <Field label="Specialization" id="course-specialization">
          <Input
            defaultValue={course?.specialization ?? ""}
            id="course-specialization"
            maxLength={160}
            name="specialization"
            required
          />
        </Field>
        <Field label="Difficulty" id="course-difficulty">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={course?.difficulty_level ?? "beginner"}
            id="course-difficulty"
            name="difficulty_level"
            required
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </Field>
        <Field label="Delivery mode" id="course-mode">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={course?.delivery_mode ?? "online"}
            id="course-mode"
            name="delivery_mode"
            required
          >
            <option value="online">Online</option>
            <option value="in_person">In person</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </Field>
        <Field label="Duration (optional)" id="course-duration">
          <Input
            defaultValue={course?.duration ?? ""}
            id="course-duration"
            maxLength={120}
            name="duration"
            placeholder="For example, 8 weeks"
          />
        </Field>
        <Field label="External enrollment URL" id="course-url">
          <Input
            defaultValue={course?.course_url ?? ""}
            id="course-url"
            maxLength={2048}
            name="course_url"
            placeholder="https://provider.example/course"
            required
            type="url"
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Skills taught (comma or newline separated)"
          id="course-skills"
        >
          <textarea
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={course?.skills_taught.join(", ") ?? ""}
            id="course-skills"
            maxLength={6000}
            name="skills_taught"
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Description"
          id="course-description"
        >
          <textarea
            className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={course?.description ?? ""}
            id="course-description"
            maxLength={20000}
            name="description"
            required
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Optional course image (JPG, PNG, or WebP; max 5 MB)"
          id="course-image"
        >
          <Input
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || pending}
            id="course-image"
            onChange={(event) => uploadImage(event.currentTarget.files?.[0])}
            type="file"
          />
          {imagePath ? (
            <p className="mt-1 break-all text-xs text-muted-foreground">
              Image uploaded: {imagePath.split("/").at(-1)}
            </p>
          ) : null}
        </Field>
      </div>

      <p className="text-sm text-muted-foreground">
        Publishing makes this course visible to job seekers immediately.
        Enrollment is handled by your external provider page and is not
        confirmed or counted by RozgarLink.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending || uploading} name="intent" value="draft">
          {pending && !state.redirectTo ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : null}
          Save draft
        </Button>
        <Button
          disabled={pending || uploading}
          name="intent"
          value="publish"
          variant="outline"
        >
          {uploading ? (
            <>
              <LoaderCircle aria-hidden="true" className="animate-spin" />
              Uploading image…
            </>
          ) : (
            <>
              <ImagePlus aria-hidden="true" />
              Publish course
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
