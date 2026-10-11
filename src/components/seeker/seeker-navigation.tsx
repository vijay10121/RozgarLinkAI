"use client";

import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  GraduationCap,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/seeker/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seeker/jobs", label: "Find Jobs", icon: BriefcaseBusiness },
  { href: "/seeker/applied", label: "Applied Jobs", icon: BriefcaseBusiness },
  { href: "/seeker/saved", label: "Saved Jobs", icon: Bookmark },
  { href: "/seeker/courses", label: "Courses", icon: GraduationCap },
  { href: "/seeker/notifications", label: "Notifications", icon: Bell },
  { href: "/seeker/profile", label: "Profile", icon: UserRound },
];

export function SeekerNavigation({
  unreadCount,
}: {
  unreadCount: number | null;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Job seeker navigation"
      className="flex w-max min-w-full gap-1 lg:grid lg:w-auto"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/seeker/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-full",
              active
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            href={href}
            key={href}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{label}</span>
            {label === "Notifications" &&
            unreadCount !== null &&
            unreadCount > 0 ? (
              <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
                {unreadCount}
                <span className="sr-only"> unread</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
