/** Full adults the opening couldn't place work elsewhere like the counted ones: employed at the counted adults' rate, paid by an employer outside the town that's paid in from outside. In the played world; the seed is in the test name. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";

const seed = process.env.GOLDEN_PATH_SEED ?? randomUUID();

describe(`full people work elsewhere too (played world, seed ${seed})`, () => {
  it("employs the town's full adults at the counted adults' rate", () => {
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
    });
    const later = new Date(`${core.date}T00:00:00Z`);
    later.setUTCDate(later.getUTCDate() + 2);
    advanceCore(core, later.toISOString().slice(0, "YYYY-MM-DD".length));
    const rt = residentsRuntime(core)!;
    const employer = [...core.organizations.values()].find((o) =>
      o.id.startsWith("organization:work-elsewhere:"),
    );
    // A town whose opening placed everyone (or has no counted stand-in) needs no such employer.
    if (!employer) return;
    const placeId = employer.placeId;
    const year = Number(core.date.slice(0, 4));
    const adult = (birthDate: string) =>
      year - Number(birthDate.slice(0, 4)) >= 18;
    const countedWorking = new Set<string>();
    for (const [jobId, flow] of rt.wageFlowByJob) {
      const job = rt.jobs.get(jobId);
      if (job && job.endsAt === undefined && !flow.endedAt)
        countedWorking.add(job.personId);
    }
    let counted = 0,
      countedEmployed = 0;
    for (const record of rt.households.values())
      if (record.household.placeId === placeId)
        for (const person of record.people)
          if (adult(person.birthDate)) {
            counted += 1;
            if (countedWorking.has(person.id)) countedEmployed += 1;
          }
    const working = new Set(
      [...core.jobs.values()]
        .filter((job) => job.endsAt === undefined)
        .map((job) => job.personId),
    );
    const full = [...core.people.values()].filter(
      (p) => p.alive && p.placeId === placeId && adult(p.birthDate),
    );
    const fullEmployed = full.filter((p) => working.has(p.id)).length;
    console.log(
      `${seed}: counted adults ${countedEmployed}/${counted} employed, full adults ${fullEmployed}/${full.length}`,
    );
    // At least the counted rate (rounded), unless the town ran out of working-age full adults to place.
    expect(fullEmployed).toBeGreaterThanOrEqual(
      Math.min(
        Math.round((countedEmployed / counted) * full.length),
        full.filter((p) => year - Number(p.birthDate.slice(0, 4)) < 62).length,
      ) - 1,
    );
    // The employer outside the town holds a month of its payroll, paid in from outside.
    expect(employer.liquidMinor).toBeGreaterThan(0);
  }, 900_000);
});
