import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase",
    "migrations",
    "20261011000900_training_provider_workspace.sql",
  ),
  "utf8",
);

describe("training provider database security migration", () => {
  it("scopes provider course writes and reads to active owning providers", () => {
    expect(migration).toMatch(/owner_provider_id = \(select auth\.uid\(\)\)/);
    expect(migration).toMatch(/p\.role = 'training_provider'/);
    expect(migration).toMatch(/p\.account_status = 'active'/);
    expect(migration).toMatch(/o\.created_by = p\.id/);
  });

  it("restricts image upload, update, and deletion to the provider's own bucket folder", () => {
    expect(migration).toMatch(/'training-course-images'/);
    expect(migration).toMatch(
      /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/g,
    );
    expect(migration).toMatch(
      /image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/,
    );
  });

  it("counts engagement from idempotent interaction rows and does not infer enrollments", () => {
    expect(migration).toMatch(
      /course_interactions_candidate_request_key[\s\S]*?on public\.course_interactions\(candidate_id, request_id\)/,
    );
    expect(migration).toMatch(/on conflict \(candidate_id, request_id\)/);
    expect(migration).toMatch(/null::bigint/);
  });
});
