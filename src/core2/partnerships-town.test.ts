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
import {
  partnerAgeLikelihood,
  partneringPerYear,
  partnershipGeo,
} from "./opening-partnership";
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
  it("forms couples from the town's singles, each union explained by its records", () => {
    expect(singles.length).toBeGreaterThan(10);
    expect(unions.length).toBeGreaterThan(0);
    // The chain's pace is reported, never a band the run must land in (owner,
    // Nov 8): a union passes when its records explain it.
    console.log(
      `${input.placeMetadata?.placeName} (seed ${seed}): ${unions.length} unions in ${YEARS} years, the chain's pace for these singles ${(expectedPerYear * YEARS).toFixed(1)}`,
    );
    const single = new Set(singles.map((row) => row.id));
    for (const row of unions) {
      const [a, b] = row.personIds.map((id) => core.people.get(id)!);
      // Two town adults, a union fact on the record, and at least one of them
      // was one of the opening's singles (the other may be a wider-population
      // partner who shared their home).
      expect(row.personIds.length, row.id).toBe(2);
      expect(
        ageOnDate(makeIsoDate(a!.birthDate), makeIsoDate(row.date)),
        row.id,
      ).toBeGreaterThanOrEqual(18);
      expect(
        ageOnDate(makeIsoDate(b!.birthDate), makeIsoDate(row.date)),
        row.id,
      ).toBeGreaterThanOrEqual(18);
      expect(
        row.personIds.some((id) => single.has(id)) ||
          row.personIds.some((id) => partnered(id)),
        row.id,
      ).toBe(true);
      // The age fit the chain's own table gives the pair is above zero: a
      // couple the pull picked, not any two singles.
      const sexA = a!.looks?.gender as "female" | "male" | undefined;
      const sexB = b!.looks?.gender as "female" | "male" | undefined;
      if (sexA && sexB && single.has(a!.id) && single.has(b!.id))
        expect(
          partnerAgeLikelihood(
            ageOnDate(makeIsoDate(a!.birthDate), makeIsoDate(row.date)),
            sexA,
            ageOnDate(makeIsoDate(b!.birthDate), makeIsoDate(row.date)),
            sexB,
          ),
          `${row.id}: ages the chain gives no weight`,
        ).toBeGreaterThan(0);
    }
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
