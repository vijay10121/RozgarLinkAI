import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const applicationNotificationMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase",
    "migrations",
    "20261011001100_application_owner_notifications.sql",
  ),
  "utf8",
);
const jobAlertMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase",
    "migrations",
    "20261011001200_candidate_job_alert_preferences.sql",
  ),
  "utf8",
);

describe("application owner notification migration", () => {
  it("notifies only the active owning admin and validates organization ownership", () => {
    expect(applicationNotificationMigration).toMatch(
      /after insert on public\.applications/,
    );
    expect(applicationNotificationMigration).toMatch(
      /organization\.created_by = job\.owner_admin_id/,
    );
    expect(applicationNotificationMigration).toMatch(
      /owner\.role = 'admin'::public\.application_role/,
    );
    expect(applicationNotificationMigration).toMatch(
      /owner\.account_status = 'active'::public\.account_status/,
    );
    expect(applicationNotificationMigration).toMatch(
      /where job\.id = new\.job_id/,
    );
    expect(applicationNotificationMigration).toContain("'/admin/applications'");
  });

  it("keeps notification creation inside the application transaction", () => {
    expect(applicationNotificationMigration).toMatch(
      /create trigger applications_notify_job_owner[\s\S]*?for each row execute function/,
    );
    expect(applicationNotificationMigration).toMatch(
      /revoke all on function public\.notify_job_owner_of_application\(\)[\s\S]*?from public, anon, authenticated/,
    );
  });

  it("sends job alerts only to opted-in active seekers on published events", () => {
    expect(jobAlertMigration).toMatch(
      /add column job_alerts_enabled boolean not null default false/,
    );
    expect(jobAlertMigration).toMatch(
      /candidate\.role = 'job_seeker'::public\.application_role/,
    );
    expect(jobAlertMigration).toMatch(
      /candidate\.account_status = 'active'::public\.account_status/,
    );
    expect(jobAlertMigration).toMatch(/and candidate\.job_alerts_enabled/);
    expect(jobAlertMigration).toMatch(/after insert on public\.jobs/);
    expect(jobAlertMigration).toMatch(/after update of status on public\.jobs/);
    expect(jobAlertMigration).toMatch(
      /public\.normalize_matching_skill\(candidate_skill\.value\)/,
    );
    expect(jobAlertMigration).toMatch(
      /old\.status = 'published'::public\.job_publication_status/,
    );
  });
});
