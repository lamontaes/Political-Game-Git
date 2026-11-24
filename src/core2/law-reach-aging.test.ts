/**
 * An age-gated law's rows open and end on the birthday that crosses the gate
 * (pool item laws-reach-rows-stale-as-people-age): the social media age
 * verification law reaches minors from the age it starts at (13) until they
 * turn the voting age (18). Played in the bench world in a place drawn from all
 * 56 on a seed nobody chose, a year after the law takes effect, every full
 * person's open row matches their age on that date, and the ones whose
 * birthday crossed a gate in the year gained or lost theirs on that day.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, ageInYears, makeIsoDate } from "./kernel/dates";
import { openReach, reachParameter } from "./law-reach/group-a-records";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const KEY =
  "us-policy-positions:technology-privacy.age-verification-for-social-media";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a minor gains the age-gated row on their 13th birthday and loses it on their 18th (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "law-reach-aging");
  const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const from = reachParameter("socialMediaAgeFrom");
  const below = reachParameter("votingAge");
  const started = core.date;
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: KEY,
      value: 1,
      effectiveDate: started,
      measureId: "fixture:aging",
      citation: "Fixture: the law in force from the start of the test.",
    });
  // The people of the town the day the law takes effect: a move into town is a cause the rows do not read yet.
  const resident = new Set(
    [...core.people.values()]
      .filter((p) => p.alive && p.placeId === lawChain(api).townPlaceId)
      .map((p) => p.id),
  );
  advanceCore(core, addDays(makeIsoDate(started), 2));
  const end = addDays(makeIsoDate(started), 400);
  advanceCore(core, end);
  const open = new Set(
    openReach(api, KEY)
      .filter((row) => row.targetId.startsWith("person"))
      .map((row) => row.targetId),
  );
  let gained = 0,
    lost = 0,
    checked = 0;
  for (const person of core.people.values()) {
    if (!person.alive || !resident.has(person.id)) continue;
    const ageAtStart = ageInYears(person.birthDate, started);
    const age = ageInYears(person.birthDate, end);
    const should = age >= from && age < below;
    checked += 1;
    expect(open.has(person.id), `${where}: ${person.id} age ${age}`).toBe(
      should,
    );
    if (ageAtStart < from && age >= from) gained += 1;
    if (ageAtStart < below && age >= below) lost += 1;
  }
  expect(checked, where).toBeGreaterThan(0);
  console.log(
    `${where}: ${checked} full people checked, ${gained} turned ${from} and gained a row in the year, ${lost} turned ${below} and lost theirs`,
  );
}, 900_000);
