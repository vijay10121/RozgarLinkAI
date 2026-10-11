"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/supabase/auth";
import { splitUniqueList } from "@/lib/seeker/data";

export type SeekerActionState = {
  error?: string;
  success?: string;
};

const allowedUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readUuid(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "");
  return allowedUuid.test(value) ? value : null;
}

function actionError(): SeekerActionState {
  return {
    error: "We couldn’t save that change. Please try again.",
  };
}

export async function updateSeekerProfileAction(
  _previousState: SeekerActionState,
  formData: FormData,
): Promise<SeekerActionState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const education = String(formData.get("education") ?? "").trim();
  const experienceInput = String(formData.get("experience_years") ?? "").trim();
  const experienceYears = experienceInput === "" ? null : Number(experienceInput);

  if (
    displayName.length > 120 ||
    location.length > 200 ||
    education.length > 2000 ||
    (experienceYears !== null &&
      (!Number.isFinite(experienceYears) ||
        experienceYears < 0 ||
        experienceYears > 80))
  ) {
    return { error: "Review the highlighted profile limits and try again." };
  }

  const { supabase, user } = await requireRole("job_seeker");
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      location: location || null,
      education: education || null,
      experience_years: experienceYears,
      qualifications: splitUniqueList(formData.get("qualifications")),
      skills: splitUniqueList(formData.get("skills")),
      preferred_roles: splitUniqueList(formData.get("preferred_roles")),
      preferred_locations: splitUniqueList(
        formData.get("preferred_locations"),
      ),
    })
    .eq("id", user.id);

  if (error) return actionError();

  revalidatePath("/seeker");
  revalidatePath("/seeker/profile");
  revalidatePath("/seeker/jobs");
  revalidatePath("/seeker/dashboard");
  return { success: "Your profile has been saved." };
}

export async function toggleSavedJobAction(
  _previousState: SeekerActionState,
  formData: FormData,
): Promise<SeekerActionState> {
  const jobId = readUuid(formData, "job_id");
  if (!jobId) return { error: "This job link is invalid." };

  const { supabase, user } = await requireRole("job_seeker");
  const { data: existing, error: lookupError } = await supabase
    .from("saved_jobs")
    .select("job_id")
    .eq("candidate_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (lookupError) return actionError();

  const result = existing
    ? await supabase
        .from("saved_jobs")
        .delete()
        .eq("candidate_id", user.id)
        .eq("job_id", jobId)
    : await supabase.from("saved_jobs").insert({
        candidate_id: user.id,
        job_id: jobId,
      });

  if (result.error) return actionError();

  revalidatePath("/seeker");
  revalidatePath("/seeker/jobs");
  revalidatePath("/seeker/saved");
  return { success: existing ? "Job removed from saved jobs." : "Job saved." };
}

export async function toggleSavedCourseAction(
  _previousState: SeekerActionState,
  formData: FormData,
): Promise<SeekerActionState> {
  const courseId = readUuid(formData, "course_id");
  if (!courseId) return { error: "This course link is invalid." };

  const { supabase, user } = await requireRole("job_seeker");
  const { data: existing, error: lookupError } = await supabase
    .from("saved_courses")
    .select("course_id")
    .eq("candidate_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (lookupError) return actionError();

  const result = existing
    ? await supabase
        .from("saved_courses")
        .delete()
        .eq("candidate_id", user.id)
        .eq("course_id", courseId)
    : await supabase.from("saved_courses").insert({
        candidate_id: user.id,
        course_id: courseId,
      });

  if (result.error) return actionError();

  revalidatePath("/seeker/courses");
  revalidatePath("/seeker/saved");
  return {
    success: existing ? "Course removed from saved courses." : "Course saved.",
  };
}

export async function applyToJobAction(
  _previousState: SeekerActionState,
  formData: FormData,
): Promise<SeekerActionState> {
  const jobId = readUuid(formData, "job_id");
  if (!jobId) return { error: "This job link is invalid." };

  const { supabase } = await requireRole("job_seeker");
  const { data: eligibility, error: eligibilityError } = await supabase.rpc(
    "check_job_eligibility",
    { target_job_id: jobId },
  );

  if (eligibilityError) {
    return {
      error:
        "Eligibility could not be verified. Update your profile or try again later.",
    };
  }

  const result = eligibility?.[0];
  if (!result?.eligible) {
    return {
      error: describeEligibilityReasons(result?.reasons ?? []),
    };
  }

  const { error: applicationError } = await supabase.rpc("apply_to_job", {
    target_job_id: jobId,
  });

  if (applicationError) {
    if (applicationError.code === "23505") {
      return { error: "You have already applied to this job." };
    }

    if (applicationError.code === "42501") {
      return {
        error:
          "Your eligibility changed or this job is no longer available. Review your profile and try again.",
      };
    }
    return actionError();
  }

  revalidatePath("/seeker/applied");
  revalidatePath("/seeker/jobs");
  revalidatePath("/seeker/dashboard");
  return { success: "Your application was submitted." };
}

function describeEligibilityReasons(reasons: string[]): string {
  const messages: string[] = [];
  if (reasons.includes("missing_required_skills")) {
    messages.push("your profile is missing one or more required skills");
  }
  if (reasons.includes("missing_required_qualifications")) {
    messages.push("your profile is missing one or more required qualifications");
  }
  if (reasons.includes("insufficient_experience")) {
    messages.push("your profile does not meet the required experience");
  }

  return messages.length > 0
    ? `You’re not eligible to apply yet: ${messages.join("; ")}.`
    : "You’re not eligible to apply for this job.";
}

export async function markNotificationReadAction(
  _previousState: SeekerActionState,
  formData: FormData,
): Promise<SeekerActionState> {
  const notificationId = readUuid(formData, "notification_id");
  if (!notificationId) return { error: "This notification is invalid." };

  const { supabase, user } = await requireRole("job_seeker");
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return actionError();
  if (!data) return { error: "Notification not found or no longer available." };
  revalidatePath("/seeker/notifications");
  return { success: "Notification marked as read." };
}

export async function recordCourseInterestAction(
  _previousState: SeekerActionState,
  formData: FormData,
): Promise<SeekerActionState> {
  const courseId = readUuid(formData, "course_id");
  if (!courseId) return { error: "This course link is invalid." };

  const { supabase } = await requireRole("job_seeker");
  const { error } = await supabase.rpc("record_course_interaction", {
    target_course_id: courseId,
    interaction: "inquiry",
  });

  if (error) return actionError();
  return {
    success:
      "Your interest was recorded. This is not an enrollment confirmation.",
  };
}

export async function saveResumePathAction(
  _previousState: SeekerActionState,
  formData: FormData,
): Promise<SeekerActionState> {
  const path = String(formData.get("resume_path") ?? "");
  const { supabase, user, profile } = await requireRole("job_seeker");

  if (
    !path.startsWith(`${user.id}/`) ||
    path.includes("..") ||
    path.length > 512
  ) {
    return { error: "The selected resume path is invalid." };
  }

  const fileName = path.slice(user.id.length + 1);
  const { data: files, error: storageError } = await supabase.storage
    .from("private-resumes")
    .list(user.id, { search: fileName });

  if (
    storageError ||
    !files?.some((file) => file.name === fileName)
  ) {
    return {
      error: "The uploaded resume could not be verified. Please try again.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ resume_path: path })
    .eq("id", user.id);

  if (error) return actionError();

  if (profile.resume_path && profile.resume_path.startsWith(`${user.id}/`)) {
    const { error: cleanupError } = await supabase.storage
      .from("private-resumes")
      .remove([profile.resume_path]);
    if (cleanupError) {
      return {
        error:
          "Your new resume is saved, but the previous private file could not be removed. Contact support to clean it up.",
      };
    }
  }

  revalidatePath("/seeker/profile");
  return { success: "Your private resume has been saved." };
}

export async function clearResumeAction(
  _previousState: SeekerActionState,
): Promise<SeekerActionState> {
  void _previousState;
  const { supabase, user, profile } = await requireRole("job_seeker");
  const { error } = await supabase
    .from("profiles")
    .update({ resume_path: null })
    .eq("id", user.id);

  if (error) return actionError();

  if (profile.resume_path?.startsWith(`${user.id}/`)) {
    const { error: removeError } = await supabase.storage
      .from("private-resumes")
      .remove([profile.resume_path]);
    if (removeError) {
      const { error: restoreError } = await supabase
        .from("profiles")
        .update({ resume_path: profile.resume_path })
        .eq("id", user.id);
      if (restoreError) {
        return {
          error:
            "Resume cleanup failed and its profile reference could not be restored. Contact support.",
        };
      }
      return actionError();
    }
  }

  revalidatePath("/seeker/profile");
  return { success: "Your resume was removed." };
}

export async function visitCourseAction(formData: FormData): Promise<never> {
  const courseId = readUuid(formData, "course_id");
  if (!courseId) redirect("/seeker/courses?error=course_unavailable");

  const { supabase } = await requireRole("job_seeker");
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("course_url")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (courseError || !course) {
    redirect("/seeker/courses?error=course_unavailable");
  }

  let destination: URL;
  try {
    destination = new URL(course.course_url);
  } catch {
    redirect("/seeker/courses?error=course_unavailable");
  }
  if (!["http:", "https:"].includes(destination.protocol)) {
    redirect("/seeker/courses?error=course_unavailable");
  }

  const { error: interactionError } = await supabase.rpc(
    "record_course_interaction",
    { target_course_id: courseId, interaction: "link_click" },
  );
  if (interactionError) redirect("/seeker/courses?error=course_unavailable");

  redirect(destination.toString());
}
