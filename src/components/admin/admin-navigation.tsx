"use client";

import {
  Bell,
  BriefcaseBusiness,
  LayoutDashboard,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/jobs", label: "Manage Jobs", icon: BriefcaseBusiness },
  { href: "/admin/applications", label: "Applicants", icon: Users },
  { href: "/admin/access-requests", label: "Access requests", icon: ShieldCheck },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/profile", label: "Profile", icon: UserRound },
];

export function AdminNavigation({
  unreadCount,
}: {
  unreadCount: number | null;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="flex gap-1 lg:grid">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
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
