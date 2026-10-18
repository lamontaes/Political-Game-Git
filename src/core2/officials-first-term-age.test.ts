/**
 * No sitting official first took office below the age the office asks
 * (gov-officials-first-served-below-legal-age): a senator was 30, a
 * representative 25 and a president 35 on the day their service began, and
 * every official was at least the minimum age of a first term. The start was
 * drawn by year, and for holders the offices engine seated it was not checked
 * against the birthday at all. Played world, a place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import tenure from "./data/offices/tenure.json" with { type: "json" };
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "first-term-age");
const LEGAL: Record<string, number> = {
  "us-senate": 30,
  "us-house": 25,
  president: 35,
  "vice-president": 35,
};

it(`starts every official's service at the age the office asks in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const officials = api
    .moduleState(OFFICIALS_MODULE_ID)
    .table("officials")
    .rows() as unknown as OfficialRow[];
  expect(officials.length, `${where}: officials`).toBeGreaterThan(100);
  const minimum = (
    tenure as unknown as {
      parameters?: Record<string, { value: number }>;
    }
  ).parameters?.minimumAgeAtFirstTerm?.value;
  const under: string[] = [];
  for (const row of officials) {
    const person = core.people.get(row.id);
    if (!person) continue;
    const ageThen = ageOnDate(
      makeIsoDate(person.birthDate),
      makeIsoDate(row.serviceStart),
    );
    const asked = Math.max(minimum ?? 0, LEGAL[row.officeKind] ?? 0);
    if (ageThen < asked)
      under.push(`${row.id} (${row.officeKind}) was ${ageThen}, asks ${asked}`);
  }
  expect(under, `${where}: officials who first served too young`).toEqual([]);
}, 300_000);
