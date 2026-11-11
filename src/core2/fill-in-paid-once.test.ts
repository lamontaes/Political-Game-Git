/**
 * A counted worker the player meets is filled in as a full person and keeps
 * the job and the pay the records gave them: after the fill-in their job is no
 * longer in any counted wage flow (not paid twice), and a worker who attends is paid on the
 * recorded payday (not paid at all). A place
 * and seed nobody chose, named in every failure message.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { fillInPerson } from "./state";
import { residentsRuntime } from "./modules/residents";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "fill-in-paid-once");

it(`pays a filled-in worker once, on the recorded payday, in ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  try {
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const rt = residentsRuntime(core)!;
    const wageFlows = () =>
      [...rt.flows.values()].filter(
        (flow) => flow.kind === "wages" && flow.perDayMinorByJob,
      );
    const countedJobs = new Set(
      wageFlows().flatMap((flow) => Object.keys(flow.perDayMinorByJob!)),
    );
    // The counted people who hold a counted job, a run of them.
    const jobOfPerson = new Map<string, string>();
    for (const [jobId, job] of rt.jobs)
      if (countedJobs.has(jobId)) jobOfPerson.set(job.personId, jobId);
    const holders = [...jobOfPerson.keys()]
      .filter((id) => rt.householdOfPerson.has(id))
      .sort()
      .slice(0, 30);
    expect(
      holders.length,
      `${where}: counted workers with jobs`,
    ).toBeGreaterThan(0);
    const jobOf = new Map<string, string>();
    for (const id of holders) {
      jobOf.set(id, jobOfPerson.get(id)!);
      if (!core.people.has(id)) fillInPerson(core, id);
    }
    // Not paid twice: no counted wage flow still names a filled-in worker's job.
    const stillCounted = new Set(
      wageFlows().flatMap((flow) => Object.keys(flow.perDayMinorByJob!)),
    );
    const twice = [...jobOf].filter(
      ([id, jobId]) => core.people.has(id) && stillCounted.has(jobId),
    );
    expect(
      twice,
      `${where}: filled-in workers still in a counted wage flow`,
    ).toEqual([]);
    advanceCore(core, addDays(makeIsoDate(core.date), 75));
    // Not paid at all: a filled-in worker who attended work has been paid
    // on a payday (what they never attended is not paid, and is the
    // attendance engine's, not the payroll's).
    const unpaid = [...jobOf]
      .filter(([id]) => core.people.has(id))
      .filter(([, jobId]) => {
        const total = core.work.totalsByJob.get(jobId);
        return !!total && total.attendedMinutes > 0 && total.paidMinor <= 0;
      });
    expect(
      unpaid,
      `${where}: filled-in workers who attended but were never paid`,
    ).toEqual([]);
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
