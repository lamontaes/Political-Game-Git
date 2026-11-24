/**
 * Full people with jobs leave work or retire in the played world: the leave
 * branch of the job review was attached to the wrong condition, so only
 * counted workers ever did. The reason is read from the person's record.
 * A town opens with few full people, so places are drawn until a year in one
 * has a full person leave; the place and seed are in every failure message.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { JOBS_DATA, JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.JOBS_LEAVE_SEED ?? randomBytes(8).toString("hex");
const START = "2026-10-12";
const DRAWS = 6;

const addDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

interface Change {
  id: string;
  kind: string;
  personId: string;
  reasonKey: string;
  decidedBy: string;
  values: Record<string, number>;
}

describe(`full people leave work (seed ${seed})`, () => {
  it("at least one full person with a job leaves work or retires for a recorded reason", () => {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const drawSeed = draw === 0 ? seed : `${seed}:${draw}`;
      const world = buildBenchWorld(drawSeed, START, { twoLevel: true });
      let date = START;
      for (let i = 0; i < 365; i += 1) {
        date = addDay(date);
        advanceCore(world.core, date);
      }
      const where = `${world.place.key} (seed ${drawSeed})`;
      tried.push(where);
      const changes = coreAPI(world.core)
        .moduleState(JOBS_MODULE_ID)
        .table("changes")
        .rows() as unknown as Change[];
      // Leaving work by the person's own choice; a death or a move is recorded too, but not decided this way.
      const left = changes.filter(
        (row) =>
          row.kind === "left-work" &&
          world.core.people.has(row.personId) &&
          // A counted worker who retired and was filled in since decided as a count: its row carries no strain.
          !row.values.counted &&
          row.reasonKey !== JOBS_DATA.reasons.died &&
          row.reasonKey !== JOBS_DATA.reasons.movedAway,
      );
      if (!left.length) continue;
      for (const row of left) {
        expect(
          [JOBS_DATA.reasons.retired, JOBS_DATA.reasons.leftWork],
          where,
        ).toContain(row.reasonKey);
        expect(row.decidedBy, where).toBe(row.personId);
        // The reasons read from the person's record: age, strain and savings.
        expect(row.values, where).toHaveProperty("age");
        expect(row.values, where).toHaveProperty("strain");
        expect(row.values, where).toHaveProperty("bufferMonths");
      }
      return;
    }
    throw new Error(
      `No full person left work in a year in ${DRAWS} places: ${tried.join("; ")}`,
    );
  }, 3_600_000);
});
