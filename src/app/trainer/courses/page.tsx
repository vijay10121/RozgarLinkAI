import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Plus, Search } from "lucide-react";

import { TrainerPage } from "@/components/trainer/trainer-page";
import { MarketplaceSchemaNotice } from "@/components/seeker/marketplace-schema-notice";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/supabase/auth";
import { isMissingMarketplaceSchemaError } from "@/lib/seeker/data";

export const metadata: Metadata = { title: "Manage courses" };

type SearchParams = Promise<{
  page?: string;
  search?: string;
  status?: string;
}>;

const pageSize = 20;
const statuses = ["all", "draft", "published", "archived"] as const;

export default function TrainerCoursesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<LoadingState label="Loading your courses" />}>
      <TrainerCoursesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TrainerCoursesContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const search = (params.search ?? "").trim().slice(0, 200);
  const status =
    statuses.find((candidate) => candidate === params.status) ?? "all";
  const { supabase, user } = await requireRole("training_provider");
  let query = supabase
    .from("courses")
    .select(
      "id, title, specialization, difficulty_level, delivery_mode, duration, status, updated_at",
      { count: "exact" },
    )
    .eq("owner_provider_id", user.id)
    .order("updated_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) query = query.ilike("title", `%${search}%`);
  if (status === "archived") query = query.eq("status", "closed");
  else if (status !== "all") query = query.eq("status", status);

  const { data, error, count } = await query;

  return (
    <TrainerPage
      eyebrow="Course catalogue"
      title="Manage courses"
      description="Create drafts, publish courses directly, and archive listings you no longer offer."
      actions={
        <Button render={<Link href="/trainer/courses/new" />}>
          <Plus aria-hidden="true" />
          Add course
        </Button>
      }
    >
      <form
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_220px_auto]"
        method="get"
      >
        <label
          className="space-y-1 text-xs font-medium"
          htmlFor="trainer-course-search"
        >
          Search course titles
          <Input
            defaultValue={search}
            id="trainer-course-search"
            maxLength={200}
            name="search"
            placeholder="Search your courses"
          />
        </label>
        <label
          className="space-y-1 text-xs font-medium"
          htmlFor="trainer-course-status"
        >
          Status
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            defaultValue={status}
            id="trainer-course-status"
            name="status"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <Button className="self-end gap-2" type="submit">
          <Search aria-hidden="true" className="size-4" />
          Filter
        </Button>
      </form>
      {error ? (
        isMissingMarketplaceSchemaError(error) ? (
          <MarketplaceSchemaNotice />
        ) : (
          <p role="alert" className="rounded-xl border border-destructive p-4 text-sm">
            Courses could not be loaded. Refresh and try again.
          </p>
        )
      ) : data?.length ? (
        <>
          <div className="grid gap-3">
            {data.map((course) => (
              <Link
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/trainer/courses/${course.id}`}
                key={course.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold">
                      {course.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {course.specialization || "Specialization not specified"} ·{" "}
                      {course.difficulty_level} ·{" "}
                      {course.delivery_mode.replaceAll("_", " ")}
                      {course.duration ? ` · ${course.duration}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize">
                    {course.status === "closed" ? "archived" : course.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Updated {new Date(course.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">
              {count ?? 0} course{count === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <PageLink page={page - 1} search={search} status={status}>
                  Previous
                </PageLink>
              ) : null}
              {count !== null && page * pageSize < count ? (
                <PageLink page={page + 1} search={search} status={status}>
                  Next
                </PageLink>
              ) : null}
            </div>
          </div>
        </>
      ) : error ? null : (
        <EmptyState
          title="No courses found"
          description={
            search || status !== "all"
              ? "Try another search or status filter."
              : "Add your first course as a draft or publish it directly."
          }
          action={
            <Link
              className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
              href="/trainer/courses/new"
            >
              Create course
            </Link>
          }
        />
      )}
    </TrainerPage>
  );
}

function PageLink({
  page,
  search,
  status,
  children,
}: {
  page: number;
  search: string;
  status: string;
  children: React.ReactNode;
}) {
  const params = new URLSearchParams({ page: String(page), status });
  if (search) params.set("search", search);
  return (
    <Link
      className="rounded-md border border-border px-3 py-2 font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={`/trainer/courses?${params}`}
    >
      {children}
    </Link>
  );
}
