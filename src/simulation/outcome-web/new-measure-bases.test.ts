import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import type { World } from "../types";
import {
  OUTCOME_LINKS,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from ".";
import { placeOutcomesForMonth } from "./place-outcomes";
import {
  PLACE_OUTCOME_BASES,
  type PlaceOutcomeRecord,
} from "./place-outcome-store";

/*
 * Nine measures the outcome web's links named had no starting value for any
 * place. Each now starts every one of the 56 places at the latest published
 * level; a place no source reports starts at the national average and says so
 * in its row's note. Two researched links (police to violent crime, the speed
 * limit to traffic deaths) now act without new code, because adding a base
 * makes a measure readable and produced.
 */

const PLACES = [
  ...[
    "AK AL AR AZ CA CO CT DC DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN",
    "MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA",
    "WI WV WY AS GU MP PR VI",
  ].flatMap((line) => line.split(" ")),
].map((code) => `US-${code}`);

/** Each new measure, with the places its source does not report. */
const NEW_MEASURES: Readonly<
  Record<
    string,
    { readonly estimated: readonly string[]; readonly national: number }
  >
> = {
  "police.officers-per-1000": {
    estimated: ["US-AS", "US-MP"],
    national: 2.41,
  },
  "justice.incarcerated-per-100k": {
    estimated: ["US-DC", "US-AS", "US-VI"],
    national: 318,
  },
  "health.low-birthweight": {
    estimated: ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"],
    national: 8.58,
  },
  "env.hot-days": { estimated: ["US-MP"], national: 29 },
  "housing.ac-share": {
    estimated: ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"],
    national: 89,
  },
  "roads.rural-interstate-speed-limit": {
    estimated: ["US-AS", "US-DC", "US-GU", "US-MP", "US-PR", "US-VI"],
    national: 70.9,
  },
  "traffic.fatality-rate": {
    estimated: ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"],
    national: 1.19,
  },
  "tax.state-corporate-rate": {
    estimated: ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"],
    national: 5.8,
  },
  "tax.property-rate": {
    estimated: ["US-AS", "US-GU", "US-MP", "US-PR", "US-VI"],
    national: 0.9,
  },
};

function worldAt(date: string): World {
  return {
    currentDate: makeIsoDate(date),
    policyCatalog: { propositions: {} },
    history: { legislativeMeasures: [], legislativeEnactments: [] },
  } as unknown as World;
}

describe("starting values for the measures the links named", () => {
  for (const [measure, { estimated, national }] of Object.entries(
    NEW_MEASURES,
  )) {
    it(`${measure} starts all 56 places, and says which ones are estimated`, () => {
      const definition = PLACE_OUTCOME_BASES[measure]!;
      expect(Object.keys(definition.places).sort()).toEqual([...PLACES].sort());
      const drift = definition.drift!;
      for (const [place, value] of Object.entries(definition.places)) {
        expect(Number.isFinite(value), place).toBe(true);
        expect(value, place).toBeGreaterThanOrEqual(drift.minPct);
        expect(value, place).toBeLessThanOrEqual(drift.maxPct);
        // A rate or share drifts in logs or log-odds, which need a positive
        // start; only a level measure may start at a recorded zero.
        if (definition.scale !== "level")
          expect(value, place).toBeGreaterThan(0);
      }
      // A source is named with its URL and a year.
      expect(definition.source).toMatch(/https?:\/\//);
      expect(definition.source).toMatch(/20\d\d/);
      expect(OUTCOMES_PRODUCED.has(measure)).toBe(true);
      // No place is left unknown, and every estimate is labeled as one.
      const note = (definition as { readonly note?: string }).note;
      expect(note).toContain("ESTIMATED FROM NATIONAL AVERAGE");
      expect(note).toContain("PROVISIONAL");
      for (const place of estimated)
        expect(definition.places[place], place).toBe(national);
    });
  }

  it("holds the published values for places a reader can check", () => {
    const at = (measure: string, place: string) =>
      PLACE_OUTCOME_BASES[measure]!.places[place];
    // FBI 2024 sworn officers over the population served.
    expect(at("police.officers-per-1000", "US-DC")).toBe(5.22);
    expect(at("police.officers-per-1000", "US-WA")).toBe(1.36);
    // BJS Prisoners in 2023, Table 7, state jurisdiction.
    expect(at("justice.incarcerated-per-100k", "US-MS")).toBe(652);
    expect(at("justice.incarcerated-per-100k", "US-MA")).toBe(96);
    // CDC NCHS 2023.
    expect(at("health.low-birthweight", "US-MS")).toBe(12.45);
    // EIA RECS 2020.
    expect(at("housing.ac-share", "US-AK")).toBe(7);
    expect(at("housing.ac-share", "US-FL")).toBe(96);
    // IIHS, October 2026.
    expect(at("roads.rural-interstate-speed-limit", "US-MT")).toBe(80);
    expect(at("roads.rural-interstate-speed-limit", "US-NY")).toBe(65);
    // IIHS Fatality Facts 2024.
    expect(at("traffic.fatality-rate", "US-MA")).toBe(0.59);
    expect(at("traffic.fatality-rate", "US-MS")).toBe(1.81);
    // Tax Foundation 2026 and 2024 data.
    expect(at("tax.state-corporate-rate", "US-NJ")).toBe(11.5);
    expect(at("tax.state-corporate-rate", "US-TX")).toBe(0);
    expect(at("tax.property-rate", "US-NJ")).toBe(1.88);
    expect(at("tax.property-rate", "US-HI")).toBe(0.29);
  });

  it("the monthly pass records every new measure for every place, starting at its base", () => {
    const records = placeOutcomesForMonth(
      worldAt("2026-01-05"),
      makeIsoDate("2026-01-01"),
      Object.keys(NEW_MEASURES),
    );
    for (const measure of Object.keys(NEW_MEASURES)) {
      const mine = records.filter((record) => record.measure === measure);
      expect(mine.map((record) => record.placeKey).sort(), measure).toEqual(
        [...PLACES].sort(),
      );
      for (const record of mine)
        expect(record.value, `${measure} ${record.placeKey}`).toBeCloseTo(
          PLACE_OUTCOME_BASES[measure]!.places[record.placeKey]!,
          1,
        );
    }
  });
});

describe("the links these measures switch on", () => {
  const status = (key: string) =>
    outcomeLinkStatus(OUTCOME_LINKS.find((row) => row.key === key)!);

  it("police to violent crime and the speed limit to traffic deaths now act", () => {
    expect(status("police-to-violent-crime")).toBe("built");
    expect(status("speed-limit-to-traffic-deaths")).toBe("built");
  });

  it("links whose other end the game still does not keep say so", () => {
    // Property crime, rent and this key's wages are not kept place outcomes.
    expect(status("police-to-property-crime")).toBe("outcome-not-produced");
    expect(status("property-tax-to-rent")).toBe("outcome-not-produced");
    expect(status("corporate-tax-incidence")).toBe("outcome-not-produced");
    // Causes still unrecorded, and the research questions that would fix them.
    for (const key of ["lead-to-reading", "eitc-to-low-birthweight"])
      expect(status(key), key).toBe("cause-not-recorded");
  });

  it("a federal cut to mandatory minimums does not move the state prison rate: it waits for a federal-prisoner measure", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "mandatory-minimum-cut-to-federal-prisoners",
    )!;
    // Federal sentences change who is in federal prison, not state prisons.
    expect(link.to).toBe("justice.federal-incarcerated-per-100k");
    expect(PLACE_OUTCOME_BASES[link.to]).toBeUndefined();
    expect(outcomeLinkStatus(link)).toBe("outcome-not-produced");
    // The state prison measure itself is still recorded and produced.
    expect(OUTCOMES_PRODUCED.has("justice.incarcerated-per-100k")).toBe(true);
  });
});

/** A place's stored record of one measure, standing `value` above its base. */
function worldWithRecord(
  measure: string,
  placeKey: string,
  value: number,
): World {
  const jurisdictionId = stateJurisdictionForKey(placeKey)!.id;
  const base = PLACE_OUTCOME_BASES[measure]!.places[placeKey]!;
  const record: PlaceOutcomeRecord = {
    measure,
    placeKey,
    jurisdictionId,
    month: makeIsoDate("2026-02-01"),
    base,
    structural: value,
    multiplier: value / base,
    value,
    causes: [],
  };
  return {
    ...worldAt("2026-03-01"),
    placeOutcomes: {
      months: [{ month: makeIsoDate("2026-02-01"), records: [record] }],
    },
  } as unknown as World;
}

describe("the new causes move their outcomes", () => {
  it("10% more officers than a place began with lowers its violent crime 3.4%", () => {
    const key = "US-OH";
    const base = PLACE_OUTCOME_BASES["police.officers-per-1000"]!.places[key]!;
    const read = (value: number) =>
      outcomeFactor(
        worldWithRecord("police.officers-per-1000", key, value),
        stateJurisdictionForKey(key)!.id,
        "crime.violent",
        makeIsoDate("2026-03-01"),
      ).causes.find((cause) => cause.key === "police-to-violent-crime");
    expect(read(base)?.factor).toBe(1);
    expect(read(base * 1.1)?.factor).toBeCloseTo(0.966, 10);
    expect(read(base * 0.9)?.factor).toBeCloseTo(1.034, 10);
  });

  it("a 5 mph higher rural interstate limit raises traffic deaths 3.8%", () => {
    const key = "US-KS";
    const base =
      PLACE_OUTCOME_BASES["roads.rural-interstate-speed-limit"]!.places[key]!;
    const read = (value: number) =>
      outcomeFactor(
        worldWithRecord("roads.rural-interstate-speed-limit", key, value),
        stateJurisdictionForKey(key)!.id,
        "traffic.fatality-rate",
        makeIsoDate("2026-03-01"),
      ).causes.find((cause) => cause.key === "speed-limit-to-traffic-deaths");
    expect(read(base)?.factor).toBe(1);
    expect(read(base + 5)?.factor).toBeCloseTo(1.038, 10);
    expect(read(base - 10)?.factor).toBeCloseTo(0.924, 10);
  });
});
