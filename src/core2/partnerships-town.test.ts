import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import {
  FAMILY_ENGAGED,
  FAMILY_MARRIED,
  FAMILY_MOVED_IN,
  partnershipsModule,
  UNION_FACT,
} from "./modules/partnerships";
import { partneringPerYear, partnershipGeo } from "./opening-partnership";
import { registerModule } from "./state";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreEventInput, PersonId } from "./types";

// Every life is simulated (owner, Nov 1 and Nov 8, 2026). The town's own full
// people meet, date, move in together, get engaged, marry, and part by the
// opening chain's paces, a pull a month moved by their traits, every change
// through the one partnership writer and the household writer. A place drawn
// from all 56, over three years.
const drawn = drawPlace("partnerships-town", "lives-town-couples");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const YEARS = 3;
const input = generatedOpening(
  { seed, key },
  { economy: false, settings: { population: 700 } },
);
const core = createLifeCore(input, { modules: [partnershipsModule] });
const events: CoreEventInput[] = [];
registerModule(core, {
  id: "partnerships-town:watch",
  eventKinds: [
    "family.partnered",
    "family.separated",
    FAMILY_MOVED_IN,
    FAMILY_ENGAGED,
    FAMILY_MARRIED,
  ],
  onEvent: (_api, event) => void events.push(event),
});
const opening = makeIsoDate(input.startedAt);
const inTown = (id: PersonId) => {
  const row = core.people.get(id);
  return !!row && row.tier !== "husk";
};
const partnered = (id: PersonId) =>
  [...core.familyLinks.values()].some(
    (link) => link.kind === "partner" && link.personIds.includes(id),
  );
const singles = [...core.people.values()].filter(
  (row) =>
    row.alive &&
    inTown(row.id) &&
    ageOnDate(makeIsoDate(row.birthDate), opening) >= 18 &&
    (row.looks?.gender === "female" || row.looks?.gender === "male") &&
    !partnered(row.id),
);
const geo = partnershipGeo(core.placeMetadata?.placeKey);
const expectedPerYear = singles.reduce(
  (sum, row) =>
    sum +
    partneringPerYear(
      geo,
      row.looks!.gender as "female" | "male",
      ageOnDate(makeIsoDate(row.birthDate), opening),
    ),
  0,
);
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + YEARS);
advanceCore(core, end.toISOString().slice(0, 10));
const townEvents = events.filter((row) => row.personIds.every(inTown));
const kind = (name: string) => townEvents.filter((row) => row.kind === name);
const unions = kind("family.partnered");
if (process.env.PARTNERSHIPS_REPORT)
  appendFileSync(
    process.env.PARTNERSHIPS_REPORT,
    `${input.placeMetadata?.placeName} (seed ${seed}): town singles ${singles.length}, expected ${(expectedPerYear * YEARS).toFixed(1)} in ${YEARS} years; unions ${unions.length}, moved in ${kind(FAMILY_MOVED_IN).length}, engaged ${kind(FAMILY_ENGAGED).length}, married ${kind(FAMILY_MARRIED).length}, parted ${kind("family.separated").length}\n`,
  );

describe(`couples in the town of ${input.placeMetadata?.placeName} over ${YEARS} years (seed ${seed})`, () => {
  it("forms couples among the town's singles at about the chain's pace", () => {
    expect(singles.length).toBeGreaterThan(10);
    const expected = expectedPerYear * YEARS;
    const spread = 3 * Math.sqrt(expected);
    expect(unions.length).toBeGreaterThan(0);
    expect(unions.length).toBeGreaterThanOrEqual(0.7 * expected - spread);
    expect(unions.length).toBeLessThanOrEqual(1.3 * expected + spread);
  });

  it("moves a couple into one household, then engages and marries them, each with its own dated record", () => {
    const moved = kind(FAMILY_MOVED_IN);
    expect(moved.length).toBeGreaterThan(0);
    for (const row of kind(FAMILY_MARRIED)) {
      expect(row.facts?.[UNION_FACT]).toBe("married");
      expect(
        kind(FAMILY_ENGAGED).some((e) => e.facts?.linkId === row.facts?.linkId),
      ).toBe(true);
    }
  });

  it("puts a living-together couple under one roof and keeps people in one household only", () => {
    for (const row of kind(FAMILY_MOVED_IN)) {
      const [a, b] = row.personIds.map((id) => core.people.get(id)!);
      if (!a!.alive || !b!.alive || !partnered(a!.id)) continue;
      expect(a!.householdId).toBe(b!.householdId);
    }
    for (const household of core.households.values())
      for (const id of household.memberIds)
        expect(core.people.get(id)?.householdId).toBe(household.id);
  });
});
