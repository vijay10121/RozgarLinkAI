import { NextResponse } from "next/server";

import { requireRole } from "@/lib/supabase/auth";

export async function GET() {
  const { supabase, user, profile } = await requireRole("job_seeker");
  const path = profile.resume_path;

  if (!path || !path.startsWith(`${user.id}/`) || path.includes("..")) {
    return new NextResponse("Resume not found.", { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("private-resumes")
    .download(path);

  if (error || !data) {
    return new NextResponse("Resume not found.", { status: 404 });
  }

  const isPdf = path.toLowerCase().endsWith(".pdf");
  const contentType = isPdf
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return new NextResponse(data.stream(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="resume.${isPdf ? "pdf" : "docx"}"`,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
