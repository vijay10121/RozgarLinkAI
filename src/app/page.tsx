import { ArrowRight, BriefcaseBusiness, GraduationCap, UsersRound } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const platformFocus = [
  {
    title: "Skills first",
    description:
      "A foundation for representing the skills and experience people bring to their next opportunity.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Opportunity aware",
    description:
      "A place to connect job opportunities and learning pathways as the platform takes shape.",
    icon: GraduationCap,
  },
  {
    title: "Built for collaboration",
    description:
      "Separate experiences can support job seekers, administrators, and training providers.",
    icon: UsersRound,
  },
];

export default function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-brand-soft),transparent_55%)]"
        />
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:px-12">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-brand shadow-sm">
              <span className="size-2 rounded-full bg-brand" />
              Skills-to-opportunity platform
            </p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Bring your skills closer to your next opportunity.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              RozgarLink is being built to connect job seekers with work and
              training opportunities through a skills-first experience.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
                href="/register"
              >
                Create your account
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "bg-white/80",
                )}
                href="/login"
              >
                Log in
              </Link>
            </div>
          </div>

          <Card className="border-brand/10 bg-white/90 shadow-xl shadow-brand/5">
            <CardHeader className="gap-3 border-b border-border/70 p-6 sm:p-8">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <BriefcaseBusiness aria-hidden="true" className="size-6" />
              </div>
              <p className="text-sm font-medium text-brand">The idea</p>
              <CardTitle className="text-2xl font-semibold leading-snug">
                Make skills the link between people, work, and learning.
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <p className="leading-7 text-muted-foreground">
                We are laying the groundwork for a platform that can bring
                seeker profiles, job opportunities, and training pathways
                together—using real data as those features are implemented.
              </p>
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-muted/70 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand shadow-sm">
                  <GraduationCap aria-hidden="true" className="size-5" />
                </span>
                <p className="text-sm leading-6 text-muted-foreground">
                  No listings or accounts are shown until connected to real
                  platform data.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        aria-labelledby="platform-heading"
        className="bg-white py-20 sm:py-24"
        id="platform"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
              A considered starting point
            </p>
            <h2
              className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              id="platform-heading"
            >
              The foundation for a better connection.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              The initial project setup establishes reusable UI, routing, and
              data-service boundaries before product workflows are added.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {platformFocus.map(({ title, description, icon: Icon }) => (
              <Card className="h-full border-border/80 shadow-sm" key={title}>
                <CardHeader className="gap-4 p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <CardTitle className="text-lg font-semibold">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 leading-7 text-muted-foreground">
                  {description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="start-heading"
        className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12"
        id="how-it-starts"
      >
        <div className="rounded-3xl bg-brand px-6 py-10 text-brand-foreground sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">
              A solid foundation, first
            </p>
            <h2
              className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
              id="start-heading"
            >
              Thoughtful building blocks for what comes next.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-white/80">
              This starter includes the app shell and shared UI foundations.
              Account flows, opportunity data, and matching will be added in
              later implementation steps.
            </p>
          </div>
          <Link
            className={cn(
              buttonVariants({ size: "lg", variant: "secondary" }),
              "mt-7 shrink-0 gap-2 bg-white text-brand hover:bg-white/90 lg:mt-0",
            )}
            href="#top"
          >
            Back to top
            <ArrowRight aria-hidden="true" className="size-4 -rotate-45" />
          </Link>
        </div>
      </section>
    </>
  );
}
