"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import { getTrainerOrganization } from "@/lib/trainer/data";
import {
  isTrainerCourseIntent,
  parseTrainerCourseInput,
} from "@/lib/trainer/validation";
import { isUuid } from "@/lib/admin/validation";

export type TrainerActionState = {
  error?: string;
  success?: string;
  redirectTo?: string;
};

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function saveTrainerCourseAction(
  _previousState: TrainerActionState,
  formData: FormData,
): Promise<TrainerActionState> {
  const parsed = parseTrainerCourseInput(formData);
  if (!parsed.input) return { error: parsed.error };

  const intent = value(formData, "intent");
  if (!isTrainerCourseIntent(intent)) {
    return { error: "Choose whether to save a draft or publish the course." };
  }

  const { supabase, user, profile } = await requireRole("training_provider");
  if (!profile.sector) {
    return { error: "Your provider account is missing its organization sector." };
  }

  const organization = await getTrainerOrganization(
    supabase,
    user.id,
    profile.sector,
  );
  if (!organization) {
    return {
      error:
        "No organization is linked to your account. Contact support to resolve provider provisioning.",
    };
  }

  if (
    parsed.input.imagePath &&
    !parsed.input.imagePath.startsWith(`${user.id}/`)
  ) {
    return { error: "Course images must belong to your provider account." };
  }

  const status: "published" | "draft" =
    intent === "publish" ? "published" : "draft";
  const payload = {
    organization_id: organization.id,
    owner_provider_id: user.id,
    title: parsed.input.title,
    description: parsed.input.description,
    specialization: parsed.input.specialization,
    skills_taught: parsed.input.skillsTaught,
    difficulty_level: parsed.input.difficultyLevel,
    duration: parsed.input.duration,
    delivery_mode: parsed.input.deliveryMode,
    course_url: parsed.input.courseUrl,
    image_path: parsed.input.imagePath,
    status,
  };
  const courseId = value(formData, "course_id");

  if (!courseId) {
    const { data, error } = await supabase
      .from("courses")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) {
      return {
        error:
          error?.code === "PGRST205"
            ? "The training-provider migration is not applied to this Supabase project."
            : "The course could not be created. Check the course details and try again.",
      };
    }
    revalidateTrainerCoursePaths(data.id);
    return {
      success: status === "published" ? "Course published." : "Draft saved.",
      redirectTo: `/trainer/courses/${data.id}`,
    };
  }

  if (!isUuid(courseId)) return { error: "This course link is invalid." };
  const { data: existing, error: lookupError } = await supabase
    .from("courses")
    .select("id, status")
    .eq("id", courseId)
    .eq("owner_provider_id", user.id)
    .maybeSingle();
  if (lookupError) {
    return { error: "Unable to verify course ownership. Please try again." };
  }
  if (!existing) return { error: "Course not found or not available to you." };
  if (existing.status === "closed") {
    return { error: "Archived courses can’t be edited or republished." };
  }
  if (existing.status === "published" && status === "draft") {
    return { error: "Published courses can’t be reverted to drafts." };
  }

  const { data, error } = await supabase
    .from("courses")
    .update({
      title: payload.title,
      description: payload.description,
      specialization: payload.specialization,
      skills_taught: payload.skills_taught,
      difficulty_level: payload.difficulty_level,
      duration: payload.duration,
      delivery_mode: payload.delivery_mode,
      course_url: payload.course_url,
      image_path: payload.image_path,
      status,
    })
    .eq("id", courseId)
    .eq("owner_provider_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    return { error: "The course could not be updated. Please try again." };
  }
  if (!data) return { error: "Course not found or not available to you." };

  revalidateTrainerCoursePaths(courseId);
  return {
    success: status === "published" ? "Course published." : "Draft saved.",
    redirectTo: `/trainer/courses/${courseId}`,
  };
}

export async function archiveTrainerCourseAction(
  _previousState: TrainerActionState,
  formData: FormData,
): Promise<TrainerActionState> {
  const courseId = value(formData, "course_id");
  if (!isUuid(courseId)) return { error: "This course link is invalid." };

  const { supabase, user } = await requireRole("training_provider");
  const { data, error } = await supabase
    .from("courses")
    .update({ status: "closed" })
    .eq("id", courseId)
    .eq("owner_provider_id", user.id)
    .neq("status", "closed")
    .select("id")
    .maybeSingle();

  if (error) return { error: "The course could not be archived." };
  if (!data) return { error: "Course not found or already archived." };
  revalidateTrainerCoursePaths(courseId);
  return { success: "Course archived." };
}

export async function updateTrainerProfileAction(
  _previousState: TrainerActionState,
  formData: FormData,
): Promise<TrainerActionState> {
  const displayName = value(formData, "display_name");
  const specialization = value(formData, "specialization");
  const phone = value(formData, "phone");
  if (!displayName || displayName.length > 120) {
    return { error: "Enter a name up to 120 characters." };
  }
  if (specialization.length > 160 || phone.length > 40) {
    return { error: "Specialization or phone number is too long." };
  }

  const { supabase, user } = await requireRole("training_provider");
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      specialization: specialization || null,
      phone: phone || null,
    })
    .eq("id", user.id);
  if (error) return { error: "Your provider profile could not be updated." };
  revalidatePath("/trainer");
  revalidatePath("/trainer/profile");
  return { success: "Provider profile updated." };
}

export async function updateTrainerOrganizationAction(
  _previousState: TrainerActionState,
  formData: FormData,
): Promise<TrainerActionState> {
  const name = value(formData, "name");
  const description = value(formData, "description");
  const contactEmail = value(formData, "contact_email");
  const contactPhone = value(formData, "contact_phone");
  const organizationId = value(formData, "organization_id");

  if (!isUuid(organizationId)) {
    return { error: "This organization link is invalid." };
  }
  if (!name || name.length > 200 || description.length > 4000) {
    return { error: "Enter a valid organization name and description." };
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: "Enter a valid organization contact email." };
  }
  if (contactEmail.length > 254 || contactPhone.length > 40) {
    return { error: "Contact information is too long." };
  }

  const { supabase, user } = await requireRole("training_provider");
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name,
      description,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
    })
    .eq("id", organizationId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      error:
        "Organization details could not be saved. Verified organizations can only be changed by an authorized reviewer.",
    };
  }
  if (!data) return { error: "Organization not found or not available to you." };
  revalidatePath("/trainer");
  revalidatePath("/trainer/profile");
  return { success: "Organization details updated." };
}

export async function markTrainerNotificationReadAction(
  _previousState: TrainerActionState,
  formData: FormData,
): Promise<TrainerActionState> {
  const notificationId = value(formData, "notification_id");
  if (!isUuid(notificationId)) {
    return { error: "This notification link is invalid." };
  }

  const { supabase, user } = await requireRole("training_provider");
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: "The notification could not be marked as read." };
  if (!data) return { error: "Notification not found or no longer available." };
  revalidatePath("/trainer/notifications");
  return { success: "Notification marked as read." };
}

function revalidateTrainerCoursePaths(courseId: string) {
  revalidatePath("/trainer");
  revalidatePath("/trainer/dashboard");
  revalidatePath("/trainer/courses");
  revalidatePath(`/trainer/courses/${courseId}`);
  revalidatePath(`/trainer/courses/${courseId}/edit`);
  revalidatePath("/seeker/courses");
}
