/**
 * The opening's seekers come from the place's own unemployment rate, for the
 * counted people and the named ones alike (pool item gov-standins-jobs). A place
 * is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { JOBS_DATA, JOBS_MODULE_ID } from "./modules/jobs";
import { residentFacts, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("opening seekers are chosen per place, from the place's own rate", () => {
  // A band's seekers are its rate times its counted workers, so a very small
  // town can have none among the wider population; draw on until one has.
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "opening-seekers");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const rows = coreAPI(core)
      .moduleState(JOBS_MODULE_ID)
      .table("seekers")
      .query("all", [true]) as unknown as {
      reasonKey: string;
      placeId: string;
    }[];
    const counted = coreAPI(core)
      .moduleState(JOBS_MODULE_ID)
      .table("countedSeekers")
      .query("all", [true]) as unknown as {
      reasonKey: string;
      placeId: string;
    }[];
    const countedOpening = counted.filter(
      (r) => r.reasonKey === "opening-unemployed",
    ).length;
    if (countedOpening === 0) {
      tried.push(`${where}: no counted seekers`);
      continue;
    }
    const opening = rows.filter((r) => r.reasonKey === "opening-unemployed");
    expect(opening.length, where).toBeGreaterThan(0);
    expect(
      opening.every((r) => r.placeId),
      where,
    ).toBe(true);
    return;
  }
  throw new Error(`no drawn place had counted seekers: ${tried.join("; ")}`);
  // Measured: building a drawn place and playing its first day took 8 to 10 s in
  // most towns and 88 s in the largest of six drawn (Langley Park, Maryland), so
  // twelve draws can take up to about 1,060,000 ms; 1,800,000 ms leaves margin.
}, 1_800_000);

it("the opening's seekers, named and counted, are jobless working-age adults who chose to look", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const place = drawPlace(`${seed}-${attempt}`, "opening-seekers-bands");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    tried.push(where);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const api = coreAPI(core);
    const [young, old] = JOBS_DATA.workingAge as [number, number];
    const years = (birthDate: string) =>
      daysBetween(makeIsoDate(birthDate), makeIsoDate(core.date)) /
      api.parameter("jobsDaysPerYear");
    const opening = (table: string) =>
      (
        api
          .moduleState(JOBS_MODULE_ID)
          .table(table)
          .query("all", [true]) as unknown as {
          reasonKey: string;
          personId: string;
        }[]
      ).filter((r) => r.reasonKey === "opening-unemployed");
    const named = opening("seekers");
    const counted = opening("countedSeekers");
    if (!named.length && !counted.length) continue;
    // Each named seeker holds no job and is of working age: the opening's
    // jobless are the people whose own entry choice was to look, not a count
    // read off a published rate.
    for (const r of named) {
      const person = core.people.get(r.personId)!;
      expect(person.jobId, `${where}: ${r.personId} holds a job`).toBeFalsy();
      const age = years(person.birthDate);
      expect(
        age >= young && age < old,
        `${where}: ${r.personId} age ${age}`,
      ).toBe(true);
    }
    // Each counted seeker is a working-age member of a counted household with no wage flow of the town's.
    const rt = residentsRuntime(core)!;
    const working = new Set(
      [...rt.wageFlowByJob.keys()].map((id) => rt.jobs.get(id)?.personId),
    );
    for (const r of counted) {
      const facts = residentFacts(core, r.personId)!;
      const age = years(facts.birthDate);
      expect(
        age >= young && age < old,
        `${where}: ${r.personId} age ${age}`,
      ).toBe(true);
      expect(working.has(r.personId), `${where}: ${r.personId} works`).toBe(
        false,
      );
    }
    return;
  }
  throw new Error(`no drawn place had opening seekers: ${tried.join("; ")}`);
}, 900_000);
