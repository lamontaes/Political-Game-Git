/**
 * PW-7 step 5: laid-off and closed-out counted workers stay counted. When a
 * business closes, its counted workers are out of work that day and look for
 * work, with a record; every counted person who joins or leaves the labor
 * force has a record, so the counts add up by record. A random place.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "../simulation/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { worldGameOptions } from "./modules/world";
import { countedJobsOf } from "./residents-economy";
import { newGame } from "./saves";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "pw7-counted-labor");

type Row = Record<string, unknown>;
/** Counted workers (live counted jobs) and counted people out of work and looking. */
function labor(core: CoreState) {
  const rt = residentsRuntime(core)!;
  const working = new Set<string>();
  for (const [jobId, flow] of rt.wageFlowByJob) {
    const job = rt.jobs.get(jobId);
    if (job && !job.endsAt && !flow.endedAt) working.add(job.personId);
  }
  const looking = new Set<string>();
  for (const row of coreAPI(core)
    .moduleState("jobs")
    .table("countedSeekers")
    .rows() as unknown as Row[])
    if (!row.employed) looking.add(String(row.personId));
  return { working, looking };
}

describe(`counted workers stay counted in ${place.name} (seed ${seed})`, () => {
  it("a closed business's counted workers are out of work and looking that day, with a record, and the counted labor force changes only by recorded starts, stops and retirements", () => {
    const { core } = newGame(
      { place: { seed: place.seed, key: place.key }, twoLevel: true },
      worldGameOptions(),
    );
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const start = labor(core);
    const startDate = core.date;
    // The business with the most counted workers closes by its owner's choice.
    const [closing] = [...core.finance.businesses.keys()]
      .filter((id) => !core.finance.businesses.get(id)!.closedAt)
      .map((id) => ({ id, workers: countedJobsOf(core, id) }))
      .sort(
        (a, b) =>
          b.workers.length - a.workers.length || a.id.localeCompare(b.id),
      );
    expect(closing?.workers.length).toBeGreaterThan(0);
    // What's left goes to its place's counted residents, as a counted owner's would.
    const pool = residentsRuntime(core)!.input.accounts.find(
      (row) => row.placeId === core.organizations.get(closing!.id)!.placeId,
    )!.accountId;
    api.closeBusinessByChoice({
      organizationId: closing!.id,
      ownerAccountId: api.accounts().main(pool),
      reasonKey: "owner.retired",
      source: core.organizations.get(closing!.id)!.source,
    });
    const after = labor(core);
    const changes = () =>
      api.moduleState("jobs").table("changes").rows() as unknown as Row[];
    for (const job of closing!.workers) {
      if (!residentsRuntime(core)!.householdOfPerson.has(job.personId))
        continue;
      expect(after.working.has(job.personId)).toBe(false);
      expect(after.looking.has(job.personId)).toBe(true);
      expect(
        changes().some(
          (row) =>
            row.personId === job.personId &&
            row.kind === "closure" &&
            row.date === core.date,
        ),
      ).toBe(true);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    const end = labor(core);
    const rt = residentsRuntime(core)!;
    // Whoever left the counted labor force left by a recorded stop or retirement, or was filled in or left the counts.
    const last = new Map<string, Row>();
    for (const row of changes())
      if (String(row.date) > startDate) last.set(String(row.personId), row);
    for (const id of new Set([...start.working, ...start.looking])) {
      if (end.working.has(id) || end.looking.has(id)) continue;
      if (core.people.has(id) || !rt.householdOfPerson.has(id)) continue;
      expect(["stopped-looking", "left-work"]).toContain(last.get(id)?.kind);
    }
    // Whoever joined it did so by a recorded start (and perhaps a hire after it).
    for (const id of new Set([...end.working, ...end.looking])) {
      if (start.working.has(id) || start.looking.has(id)) continue;
      expect(
        changes().some(
          (row) => row.personId === id && row.kind === "started-looking",
        ),
      ).toBe(true);
    }
  }, 600_000);
});
