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
import { JOBS_MODULE_ID } from "./modules/jobs";
import { regionalMonth } from "./modules/regional";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("opening seekers are chosen per place, from the place's own rate", () => {
  const place = drawPlace(seed, "opening-seekers");
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
  expect(
    counted.filter((r) => r.reasonKey === "opening-unemployed").length,
    `${where}: the wider population's seekers`,
  ).toBeGreaterThan(0);
  const opening = rows.filter((r) => r.reasonKey === "opening-unemployed");
  expect(opening.length, where).toBeGreaterThan(0);
  expect(
    opening.every((r) => r.placeId),
    where,
  ).toBe(true);
}, 600_000);

it("the opening's named seekers follow the place's labor force by age band", () => {
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
    const macro = api.moduleState("macro").table("state").get("macro:state") as
      { latestMonth: string } | undefined;
    const band = (personId: string) => {
      const person = core.people.get(personId)!;
      const age =
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(core.date)) /
        api.parameter("jobsDaysPerYear");
      const index = ageUnemployment.bands.findIndex(
        (b) => age >= b.from && age < b.to,
      );
      return `${person.placeId}|${Math.max(0, index)}`;
    };
    const held = new Map<string, number>();
    for (const job of core.jobs.values()) {
      if (job.endsAt !== undefined) continue;
      const key = band(job.personId);
      held.set(key, (held.get(key) ?? 0) + 1);
    }
    const seekers = (
      api
        .moduleState(JOBS_MODULE_ID)
        .table("seekers")
        .query("all", [true]) as unknown as {
        reasonKey: string;
        personId: string;
      }[]
    ).filter((r) => r.reasonKey === "opening-unemployed");
    if (!seekers.length || !macro) continue;
    const found = new Map<string, string[]>();
    for (const r of seekers) {
      const key = band(r.personId);
      found.set(key, [...(found.get(key) ?? []), r.personId]);
    }
    const total =
      ageUnemployment.total.unemployed / ageUnemployment.total.laborForce;
    for (const [key, ids] of found) {
      const [placeId, index] = key.split("|") as [string, string];
      const b = ageUnemployment.bands[Number(index)]!;
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
      const rate = placeRate * (b.unemployed / b.laborForce / total);
      const expected = (held.get(key) ?? 0) * (rate / (100 - rate));
      console.log(
        `${where}: band ${b.from}-${b.to} holds ${held.get(key) ?? 0}, seekers ${ids.length}, expected ${expected.toFixed(1)}; e.g. ${ids.slice(0, 3).join(", ")}`,
      );
      expect(
        Math.abs(ids.length - expected),
        `${where}: band ${b.from}-${b.to}`,
      ).toBeLessThanOrEqual(1.5);
    }
    return;
  }
  throw new Error(`no drawn place had opening seekers: ${tried.join("; ")}`);
}, 900_000);
