import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { livesElsewhere } from "./modules/moves";
import { partnershipsModule, UNION_FACT } from "./modules/partnerships";
import { partneringPerYear, partnershipGeo } from "./opening-partnership";
import { coreAPI, registerModule } from "./state";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreEventInput, PersonId } from "./types";

// Every life is simulated (owner, Nov 1, 2026). People living elsewhere
// partner and part in play by the opening's own partnership chain (ACS first
// marriages, NCFMR remarriage, NSFG intact marriages), a pull a month moved by
// their traits, every change through setPartnersV1. A place drawn from all 56,
// every household with its kin, over a year.
const drawn = drawPlace("partnerships", "core-every-life-simulated");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = generatedOpening(
  { seed, key },
  { economy: false, settings: { population: 700 } },
);
const core = createLifeCore(input, { modules: [partnershipsModule] });
const events: CoreEventInput[] = [];
registerModule(core, {
  id: "partnerships:watch",
  eventKinds: ["family.partnered", "family.separated"],
  onEvent: (_api, event) => void events.push(event),
});
const opening = makeIsoDate(input.startedAt);
const partnered = (id: PersonId) =>
  [...core.familyLinks.values()].some(
    (link) => link.kind === "partner" && link.personIds.includes(id),
  );
const singles = [...core.people.values()].filter(
  (row) =>
    livesElsewhere(core, row) &&
    ageOnDate(makeIsoDate(row.birthDate), opening) >= 18 &&
    (row.looks?.gender === "female" || row.looks?.gender === "male") &&
    !partnered(row.id),
);
const singleIds = new Set(singles.map((row) => row.id));
const geo = partnershipGeo(core.placeMetadata?.placeKey);
const expected = singles.reduce(
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
end.setUTCFullYear(end.getUTCFullYear() + 1);
advanceCore(core, end.toISOString().slice(0, 10));
const unions = events.filter((row) => row.kind === "family.partnered");
const partings = events.filter((row) => row.kind === "family.separated");
if (process.env.PARTNERSHIPS_REPORT)
  appendFileSync(
    process.env.PARTNERSHIPS_REPORT,
    `${input.placeMetadata?.placeName} (seed ${seed}): singles elsewhere ${singles.length}, expected ${expected.toFixed(1)} a year; unions ${unions.length}, partings ${partings.length}\n`,
  );

describe(`partnerships of people living elsewhere over a year in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("partners single people elsewhere at about the chain's yearly pace for their ages", () => {
    expect(singles.length).toBeGreaterThan(30);
    const fromSingles = unions.filter((row) =>
      row.personIds.some((id) => singleIds.has(id)),
    ).length;
    // Traits move who partners sooner, weighed against the month's typical,
    // so the total holds the chain's pace: three standard deviations of a
    // count with this mean, and a fifth either way for the year's aging.
    const spread = 3 * Math.sqrt(expected);
    expect(fromSingles).toBeGreaterThan(0);
    expect(fromSingles).toBeGreaterThanOrEqual(0.8 * expected - spread);
    expect(fromSingles).toBeLessThanOrEqual(1.2 * expected + spread);
  });

  it("writes each union through the one partnership writer: a link, a married union, a partner who lives with them", () => {
    const parted = new Set(partings.map((row) => row.facts?.linkId));
    for (const row of unions) {
      expect(row.facts?.[UNION_FACT]).toBe("married");
      if (parted.has(row.facts?.linkId)) continue;
      const linkId = row.facts?.linkId;
      expect(core.familyLinks.get(linkId!)?.kind).toBe("partner");
      const [a, b] = row.personIds.map((id) => core.people.get(id)!);
      expect(a!.householdId).toBe(b!.householdId);
      expect(a!.placeId).toBe(b!.placeId);
      expect(a!.familyIds.has(b!.id)).toBe(true);
      for (const person of [a!, b!]) {
        expect(person.tier).toBe("husk");
        expect(person.liquidMinor).toBe(0);
      }
    }
  });

  it("keeps a pull only for the living: a death ends it", () => {
    const rows = coreAPI(core)
      .moduleState("partnerships")
      .table("pulls")
      .rows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows)
      expect(core.people.get(String(row.id))?.alive, String(row.id)).toBe(true);
  });

  it("lets their relatives in town know, and parts couples no faster than NSFG's curve", () => {
    expect(unions.some((row) => (row.witnessIds ?? []).length > 0)).toBe(true);
    for (const row of [...unions, ...partings])
      for (const id of row.witnessIds ?? [])
        expect(core.people.get(id)!.tier).not.toBe("husk");
    // Couples elsewhere at the opening are mostly long marriages (a
    // resident's parents), whose yearly divorce pace is low.
    const couples = [...core.familyLinks.values()].filter(
      (link) =>
        link.kind === "partner" &&
        link.personIds.every((id) =>
          livesElsewhere(core, core.people.get(id)!),
        ),
    ).length;
    expect(partings.length).toBeLessThanOrEqual(0.05 * couples + 3);
    for (const row of partings) {
      const [a, b] = row.personIds.map((id) => core.people.get(id)!);
      expect(a!.householdId).not.toBe(b!.householdId);
    }
  });
});
