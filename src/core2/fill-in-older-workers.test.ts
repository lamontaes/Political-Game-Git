/**
 * A counted worker aged 62 to 67 filled in as a full person holds the same job
 * and pay their counted record held (one model, two tiers: a filled-in person
 * matches what the records already say). Run in the bench world in a place
 * drawn from all 56 on a seed nobody chose. It also prints the town's working
 * share of that age in each tier beside the same ages' count; the figures are
 * reported, never a pass or fail (the opening's recorded work history is left
 * as it is: SG-JOBS-opening-recorded-jobs-not-trimmed).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { residentsRuntime } from "./modules/residents";
import { lawChain } from "./modules/laws";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const seed = process.env.OLDER_WORKERS_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const FROM = 62;
const BELOW = 68;
/** Workers filled in per place. */
const FILLED = 5;

it("a counted worker aged 62 to 67 filled in holds the job id and pay their counted record held", () => {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const drawSeed = draw === 0 ? seed : `${seed}:${draw}`;
    const place = drawPlace(drawSeed, "fill-in-older-workers");
    const where = `${place.name} (${place.key}), seed ${drawSeed}`;
    const core = buildBenchWorld(drawSeed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core as CoreState;
    const rt = residentsRuntime(core)!;
    const at = makeIsoDate(core.date);
    const store = rt.store;
    const town = lawChain(coreAPI(core)).townPlaceId;
    const older: { id: string; working: boolean }[] = [];
    for (const home of store.liveHouseholds())
      if (home.placeId === town)
        for (const m of store.countedMembers(home)) {
          const id = store.ids[m]!;
          if (core.people.has(id as never)) continue;
          const age = ageOnDate(makeIsoDate(store.born[m]!), at);
          if (age < FROM || age >= BELOW) continue;
          older.push({
            id,
            working: [...rt.jobs.values()].some(
              (job) => job.personId === id && job.endsAt === undefined,
            ),
          });
        }
    const held = older
      .filter((row) => row.working)
      .slice(0, FILLED)
      .map((row) => ({
        id: row.id,
        job: [...rt.jobs.values()].find(
          (job) => job.personId === row.id && job.endsAt === undefined,
        )!,
      }));
    if (!held.length) {
      passed.push(`${where}: no counted worker aged ${FROM} to ${BELOW - 1}`);
      continue;
    }
    for (const { id, job } of held) {
      const before = {
        id: job.id,
        wage: job.wageDailyMinor,
        hours: job.hoursDaily,
      };
      fillInPerson(core, id);
      const full = core.jobs.get(job.id);
      expect(full, `${where}: ${id} lost job ${job.id}`).toBeDefined();
      expect(core.people.get(id)?.jobId, `${where}: ${id}`).toBe(before.id);
      expect(full!.wageDailyMinor, `${where}: ${job.id} pay`).toBe(before.wage);
      expect(full!.hoursDaily, `${where}: ${job.id} hours`).toBe(before.hours);
    }
    const fullAged = [...core.people.values()].filter(
      (person) =>
        person.alive &&
        person.placeId === town &&
        ageOnDate(makeIsoDate(person.birthDate), at) >= FROM &&
        ageOnDate(makeIsoDate(person.birthDate), at) < BELOW,
    );
    process.stdout.write(
      `OLDER-WORKERS (OLDER_WORKERS_SEED=${seed}) ${where}: ${held.length} filled in with the same job and pay (${held.map((h) => h.job.id).join(", ")}); the town's counted aged ${FROM}-${BELOW - 1}: ${older.filter((o) => o.working).length} of ${older.length} work; the town's full people that age: ${fullAged.filter((p) => p.jobId).length} of ${fullAged.length} hold a job. Passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No draw held a counted worker aged ${FROM} to ${BELOW - 1}: ${passed.join("; ")}`,
  );
}, 1_800_000);
