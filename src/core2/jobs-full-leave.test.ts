/**
 * Full people with jobs leave work or retire in the played world: the leave
 * branch of the job review was attached to the wrong condition, so only
 * counted workers ever did. The reason is read from the person's record.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { JOBS_DATA, JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.JOBS_LEAVE_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, "2026-10-12", { twoLevel: true });
const api = coreAPI(world.core);

const addDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
let date = "2026-10-12";
for (let i = 0; i < 365; i += 1) {
  date = addDay(date);
  advanceCore(world.core, date);
}

describe(`full people leave work: ${world.place.key} (seed ${seed})`, () => {
  it("at least one full person with a job leaves work or retires for a recorded reason", () => {
    const changes = api
      .moduleState(JOBS_MODULE_ID)
      .table("changes")
      .rows() as unknown as {
      id: string;
      kind: string;
      personId: string;
      reasonKey: string;
      decidedBy: string;
      values: Record<string, number>;
    }[];
    const left = changes.filter(
      (row) => row.kind === "left-work" && world.core.people.has(row.personId),
    );
    expect(left.length, `seed ${seed}`).toBeGreaterThan(0);
    for (const row of left) {
      expect([JOBS_DATA.reasons.retired, JOBS_DATA.reasons.leftWork]).toContain(
        row.reasonKey,
      );
      expect(row.decidedBy).toBe(row.personId);
      // The reasons read from the person's record: age, strain and savings.
      expect(row.values).toHaveProperty("age");
      expect(row.values).toHaveProperty("strain");
      expect(row.values).toHaveProperty("bufferMonths");
    }
  }, 900_000);
});
