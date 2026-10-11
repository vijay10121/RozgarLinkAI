import type { ApplicationRole } from "@/types/supabase";

export const dashboardPaths: Record<ApplicationRole, string> = {
  job_seeker: "/seeker/dashboard",
  admin: "/admin/dashboard",
  training_provider: "/trainer/dashboard",
};

export function getDashboardPath(role: ApplicationRole): string {
  return dashboardPaths[role];
}

export function getRoleForPrivatePath(pathname: string): ApplicationRole | null {
  if (pathname === "/seeker" || pathname.startsWith("/seeker/")) {
    return "job_seeker";
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }

  if (pathname === "/trainer" || pathname.startsWith("/trainer/")) {
    return "training_provider";
  }

  return null;
}

export function isDashboardPath(pathname: string): boolean {
  return getRoleForPrivatePath(pathname) !== null;
}

export function isMissingAuthSessionError(
  error: { name?: string; message?: string } | null | undefined,
): boolean {
  return (
    error?.name === "AuthSessionMissingError" ||
    error?.message?.toLowerCase().includes("auth session missing") === true
  );
}
