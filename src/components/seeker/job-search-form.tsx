"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JobCourseSearch() {
  const router = useRouter();
  const [type, setType] = useState<"jobs" | "courses">("jobs");
  const [term, setTerm] = useState("");

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = term.trim();
    const destination = type === "jobs" ? "/seeker/jobs" : "/seeker/courses";
    const key = type === "jobs" ? "title" : "search";
    router.push(query ? `${destination}?${key}=${encodeURIComponent(query)}` : destination);
  }

  return (
    <form
      className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[150px_minmax(0,1fr)_auto]"
      onSubmit={submitSearch}
      role="search"
    >
      <label className="sr-only" htmlFor="opportunity-type">
        Search for
      </label>
      <select
        className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        id="opportunity-type"
        onChange={(event) =>
          setType(event.target.value as "jobs" | "courses")
        }
        value={type}
      >
        <option value="jobs">Jobs</option>
        <option value="courses">Courses</option>
      </select>
      <label className="sr-only" htmlFor="opportunity-search">
        Search title or course
      </label>
      <Input
        className="h-11 min-w-0 bg-background"
        id="opportunity-search"
        onChange={(event) => setTerm(event.target.value)}
        placeholder={type === "jobs" ? "Search job titles" : "Search courses"}
        value={term}
      />
      <Button className="h-11 gap-2" type="submit">
        <Search aria-hidden="true" className="size-4" />
        Search
      </Button>
    </form>
  );
}
