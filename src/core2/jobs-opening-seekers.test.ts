/**
 * The opening's seekers come from the place's own unemployment rate, for the
 * counted people and the named ones alike (pool item gov-standins-jobs). A place
 * is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import ageUnemployment from "./data/jobs/age-unemployment.json" with { type: "json" };
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { JOBS_DATA, JOBS_MODULE_ID } from "./modules/jobs";
import { residentFacts, residentsRuntime } from "./modules/residents";
import { regionalMonth } from "./modules/regional";
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

it("the opening's seekers, named and counted, follow the place's labor force by age band", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const place = drawPlace(`${seed}-${attempt}`, "opening-seekers-bands");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    tried.push(where);
    const { core, placeId: townId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const api = coreAPI(core);
    const macro = api.moduleState("macro").table("state").get("macro:state") as
      { latestMonth: string } | undefined;
    const years = (birthDate: string) =>
      daysBetween(makeIsoDate(birthDate), makeIsoDate(core.date)) /
      api.parameter("jobsDaysPerYear");
    const bandOf = (age: number) =>
      Math.max(
        0,
        ageUnemployment.bands.findIndex((b) => age >= b.from && age < b.to),
      );
    const [young, old] = JOBS_DATA.workingAge as [number, number];
    // Both tiers: the jobs the named hold, and the jobs the counted hold in the working ages.
    const held = new Map<string, number>();
    const hold = (placeId: string, age: number) => {
      const key = `${placeId}|${bandOf(age)}`;
      held.set(key, (held.get(key) ?? 0) + 1);
    };
    for (const job of core.jobs.values()) {
      if (job.endsAt !== undefined) continue;
      const person = core.people.get(job.personId)!;
      hold(person.placeId, years(person.birthDate));
    }
    for (const job of residentsRuntime(core)!.jobs.values()) {
      if (job.endsAt !== undefined) continue;
      const facts = residentFacts(core, job.personId);
      if (!facts) continue;
      const age = years(facts.birthDate);
      if (age >= young && age < old) hold(facts.placeId, age);
    }
    const opening = (table: string) =>
      (
        api
          .moduleState(JOBS_MODULE_ID)
          .table(table)
          .query("all", [true]) as unknown as {
          reasonKey: string;
          placeId?: string;
          personId: string;
        }[]
      ).filter((r) => r.reasonKey === "opening-unemployed");
    const found = new Map<string, number>();
    for (const r of [...opening("seekers"), ...opening("countedSeekers")]) {
      const person = core.people.get(r.personId);
      const placeId = person?.placeId ?? r.placeId ?? "";
      found.set(placeId, (found.get(placeId) ?? 0) + 1);
    }
    if (!found.size || !macro) continue;
    const total =
      ageUnemployment.total.unemployed / ageUnemployment.total.laborForce;
    const ratio = (index: number) => {
      const b = ageUnemployment.bands[index]!;
      return b.unemployed / b.laborForce / total;
    };
    for (const [placeId, n] of [...found].filter(([id]) => id === townId)) {
      const placeRate =
        regionalMonth(api, placeId, macro.latestMonth)?.unemploymentPct ??
        (
          api
            .moduleState("macro")
            .table("months")
            .get(`macro-month:${macro.latestMonth}`) as {
            unemploymentPct: number;
          }
        ).unemploymentPct;
      // The bands' ratios are scaled to average one over the place's own jobs.
      let jobsHere = 0,
        ratioHere = 0;
      for (const [key, count] of held) {
        const [otherPlace, index] = key.split("|") as [string, string];
        if (otherPlace !== placeId) continue;
        jobsHere += count;
        ratioHere += count * ratio(Number(index));
      }
      const mean = jobsHere > 0 ? ratioHere / jobsHere : 1;
      // The opening's employment target also holds working-age members at work outside a recorded job
      // (they take a commuter job once their household is filled in): jobs of the place's labor force at the band-average rate.
      let unplacedHere = 0;
      for (const h of residentsRuntime(core)!.store.liveHouseholds())
        if (h.placeId === placeId)
          unplacedHere +=
            h.unplacedWorkers / residentsRuntime(core)!.store.weightOf(h);
      let expected = unplacedHere * (placeRate / (100 - placeRate));
      for (const [key, count] of held) {
        const [otherPlace, index] = key.split("|") as [string, string];
        if (otherPlace !== placeId) continue;
        const rate = (placeRate * ratio(Number(index))) / mean;
        expected += count * (rate / (100 - rate));
      }
      console.log(
        `${where}: ${placeId} holds ${jobsHere} jobs, seekers ${n}, expected ${expected.toFixed(1)}`,
      );
      // The quotas are made from the opening's counts and a day's hires and layoffs follow: within two and a half seekers or a tenth of the expected.
      expect(
        Math.abs(n - expected),
        `${where}: ${placeId}`,
      ).toBeLessThanOrEqual(Math.max(2.5, 0.1 * expected));
    }
    return;
  }
  throw new Error(`no drawn place had opening seekers: ${tried.join("; ")}`);
}, 900_000);
