"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/supabase/auth";
import {
  isAdminApplicationStatus,
  isUuid,
  parseAdminJobInput,
  validAdminStatusTransition,
} from "@/lib/admin/validation";

export type AdminActionState = {
  error?: string;
  success?: string;
  redirectTo?: string;
};

function value(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function saveAdminJobAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const { data: input, error: validationError } = parseAdminJobInput(formData);
  if (!input) return { error: validationError };

  const intent = value(formData, "intent");
  if (intent !== "draft" && intent !== "publish") {
    return { error: "Choose whether to save this job as a draft or publish it." };
  }

  const { supabase, user } = await requireRole("admin");
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", input.organizationId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (organizationError) return { error: "Unable to verify your organization." };
  if (!organization) {
    return { error: "You can manage jobs only for your own organization." };
  }

  const jobId = value(formData, "job_id");
  const status: "draft" | "published" =
    intent === "publish" ? "published" : "draft";
  const payload = {
    organization_id: input.organizationId,
    title: input.title,
    description: input.description,
    requirements: input.requirements,
    location: input.location,
    employment_type: input.employmentType,
    application_deadline: input.applicationDeadline,
    application_instructions: input.applicationInstructions,
    mandatory_education: input.mandatoryEducation,
    location_restrictions: input.locationRestrictions,
    required_qualifications: input.qualifications,
    min_experience_years: input.experienceYears,
    required_skills: input.requiredSkills,
    preferred_skills: input.preferredSkills,
    status,
  };

  if (!jobId) {
    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        ...payload,
        owner_admin_id: user.id,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !job) {
      return {
        error:
          error?.code === "PGRST205"
            ? "Admin job-management migration is not applied to this Supabase project."
            : "The job could not be created. Check the job information and try again.",
      };
    }
    revalidatePath("/admin");
    revalidatePath("/seeker/jobs");
    revalidatePath("/seeker/dashboard");
    return {
      success: status === "published" ? "Job published." : "Draft saved.",
      redirectTo: `/admin/jobs/${job.id}`,
    };
  }

  if (!isUuid(jobId)) return { error: "This job link is invalid." };
  const { data: existing, error: lookupError } = await supabase
    .from("jobs")
    .select("id, status, published_at")
    .eq("id", jobId)
    .eq("owner_admin_id", user.id)
    .maybeSingle();
  if (lookupError) return { error: "Unable to verify this job." };
  if (!existing) return { error: "This job is not available to your account." };
  if (existing.status === "closed") {
    return { error: "Closed jobs cannot be edited or republished." };
  }
  if (existing.status === "published" && status === "draft") {
    return {
      error: "Published jobs cannot be changed back to drafts. Close the job instead.",
    };
  }

  const { data: updated, error } = await supabase
    .from("jobs")
    .update({
      ...payload,
    })
    .eq("id", jobId)
    .eq("owner_admin_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: "The job could not be saved. Please try again." };
  if (!updated) return { error: "This job is no longer available to your account." };

  revalidatePath("/admin");
  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/seeker/jobs");
  revalidatePath("/seeker/dashboard");
  return {
    success: status === "published" ? "Job published." : "Draft saved.",
    redirectTo: `/admin/jobs/${jobId}`,
  };
}

export async function closeAdminJobAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const jobId = value(formData, "job_id");
  if (!isUuid(jobId)) return { error: "This job link is invalid." };

  const { supabase, user } = await requireRole("admin");
  const { data: job, error: lookupError } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("owner_admin_id", user.id)
    .maybeSingle();
  if (lookupError) return { error: "Unable to verify this job." };
  if (!job) return { error: "This job is not available to your account." };
  if (job.status === "closed") return { success: "This job is already closed." };

  const { data: updated, error } = await supabase
    .from("jobs")
    .update({ status: "closed" })
    .eq("id", jobId)
    .eq("owner_admin_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: "The job could not be closed. Please try again." };
  if (!updated) return { error: "This job is no longer available to your account." };

  revalidatePath("/admin");
  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/seeker/jobs");
  revalidatePath("/seeker/dashboard");
  return { success: "Job closed." };
}

export async function updateAdminApplicationStatusAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const applicationId = value(formData, "application_id");
  const rawStatus = value(formData, "status");
  if (!isUuid(applicationId)) return { error: "This application link is invalid." };
  if (!isAdminApplicationStatus(rawStatus) || rawStatus === "withdrawn") {
    return { error: "Select a valid application status." };
  }
  const nextStatus = rawStatus;

  const { supabase, user } = await requireRole("admin");
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, job_id, status")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError) {
    return { error: "Unable to verify this application." };
  }
  if (!application) {
    return { error: "This application is not available to your account." };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", application.job_id)
    .eq("owner_admin_id", user.id)
    .maybeSingle();
  if (jobError) return { error: "Unable to verify job ownership." };
  if (!job) {
    return { error: "You cannot manage applications for another organization." };
  }
  if (!validAdminStatusTransition(application.status, nextStatus)) {
    return {
      error: `The status cannot transition from ${application.status.replaceAll("_", " ")} to ${nextStatus.replaceAll("_", " ")}.`,
    };
  }

  const { error } = await supabase.rpc("admin_update_application_status", {
    target_application_id: applicationId,
    new_status: nextStatus,
  });
  if (error) {
    return {
      error:
        error.code === "42501" || error.code === "P0002"
          ? "You are not authorized to update this application."
          : "Application status could not be updated. Please try again.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/notifications");
  revalidatePath("/seeker/applied");
  revalidatePath("/seeker/notifications");
  return { success: "Application status updated and candidate notified." };
}

export async function updateAdminProfileAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const displayName = value(formData, "display_name");
  const designation = value(formData, "designation");
  const phone = value(formData, "phone");
  if (displayName.length > 120 || designation.length > 120 || phone.length > 40) {
    return { error: "Review the profile field limits and try again." };
  }

  const { supabase, user } = await requireRole("admin");
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      designation: designation || null,
      phone: phone || null,
    })
    .eq("id", user.id);
  if (error) return { error: "Your profile could not be saved." };

  revalidatePath("/admin");
  revalidatePath("/admin/profile");
  return { success: "Your profile has been saved." };
}

export async function updateAdminOrganizationAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const organizationId = value(formData, "organization_id");
  const name = value(formData, "name");
  const email = value(formData, "contact_email");
  const phone = value(formData, "contact_phone");
  if (!isUuid(organizationId)) return { error: "The organization is invalid." };
  if (name.length < 1 || name.length > 200) {
    return { error: "Organization name must be between 1 and 200 characters." };
  }
  if (
    (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
    phone.length > 40
  ) {
    return { error: "Enter valid contact details." };
  }

  const { supabase, user } = await requireRole("admin");
  const { data: organization, error: lookupError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (lookupError) return { error: "Unable to verify your organization." };
  if (!organization) {
    return { error: "You cannot manage another organization's details." };
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      contact_email: email || null,
      contact_phone: phone || null,
    })
    .eq("id", organizationId)
    .eq("created_by", user.id);
  if (error) return { error: "Organization details could not be saved." };

  revalidatePath("/admin/profile");
  revalidatePath("/admin/jobs");
  revalidatePath("/seeker/jobs");
  return { success: "Organization details have been saved." };
}

export async function markAdminNotificationReadAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const notificationId = value(formData, "notification_id");
  if (!isUuid(notificationId)) return { error: "This notification is invalid." };

  const { supabase, user } = await requireRole("admin");
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: "Notification could not be updated." };
  if (!data) return { error: "Notification not found or no longer available." };

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { success: "Notification marked as read." };
}

export async function reviewAdminAccessRequestAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const requestId = value(formData, "request_id");
  const decision = value(formData, "decision");
  if (!isUuid(requestId)) return { error: "This access request is invalid." };
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Choose approve or reject for this access request." };
  }

  const { supabase } = await requireRole("admin");
  const { error } = await supabase.rpc("admin_review_access_request", {
    target_request_id: requestId,
    approve: decision === "approve",
  });
  if (error) {
    if (error.code === "42501") {
      return { error: "Only an active administrator can review access requests." };
    }
    if (error.code === "P0002") {
      return { error: "This request has already been reviewed or is unavailable." };
    }
    if (error.code === "22023") {
      return {
        error: "The applicant must confirm their email address before approval.",
      };
    }
    return {
      error:
        "The access request could not be reviewed. Confirm the latest database migrations are applied.",
    };
  }

  revalidatePath("/admin/access-requests");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/notifications");
  return {
    success:
      decision === "approve"
        ? "Admin access approved. The applicant can log in to the admin workspace."
        : "Admin access request rejected.",
  };
}
