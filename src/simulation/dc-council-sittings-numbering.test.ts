import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { createWorld } from "./world";
import { createProductionPolicyCatalog } from "./production-catalog";
import { requireLifePlace } from "./life-places";
import { dcCouncilSittingHandler } from "./dc-council-sittings";
import { introduceMeasure } from "./legislation";
import {
  municipalRulePackFor,
  municipalGovernmentByKey,
} from "./municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalMeasureKey,
} from "./municipal-public-work";
import {
  ensureDistrictOfColumbiaCouncilOpening,
  DC_GOVERNMENT_KEY,
} from "./nationwide-world/district-of-columbia-council-opening";
import { municipalMeasures, municipalSeats } from "./municipal-public-work";
import { deserializeWorld, serializeWorld } from "./serialization";

function dcWorld() {
  const place = requireLifePlace("1150000");
  const base = createScenarioWorld("dc-numbering-caller", place.context, {
    peopleCount: 16,
  });
  return ensureDistrictOfColumbiaCouncilOpening(
    createWorld({
      seed: base.seed,
      currentDate: base.currentDate,
      currentMoment: base.currentMoment,
      jurisdictions: base.jurisdictionOrder.map(
        (id) => base.jurisdictions[id]!,
      ),
      people: base.personOrder.map((id) => base.people[id]!),
      policyCatalog: createProductionPolicyCatalog(),
    }),
  );
}

describe("D.C. filing numbering caller", () => {
  it("files actual seated sponsors' bills and preserves them through continuation", () => {
    const opened = dcWorld();
    const members = new Set(
      municipalSeats(opened, DC_GOVERNMENT_KEY).map((seat) => seat.personId),
    );
    expect(members.size).toBe(13);
    const result = dcCouncilSittingHandler(opened);
    const measures = municipalMeasures(result.world, DC_GOVERNMENT_KEY);
    expect(measures.length).toBeGreaterThan(0);
    for (const measure of measures) {
      expect(members.has(measure.sponsorPersonId!)).toBe(true);
      expect(measure.propositionIds).toHaveLength(1);
      expect(measure.designation).toMatch(/^B26-\d{4}$/);
      expect(measure.numberingSession?.key).toBe("council-period-26");
    }
    expect(deserializeWorld(serializeWorld(result.world))).toEqual(
      result.world,
    );
    const continued = dcCouncilSittingHandler(
      deserializeWorld(serializeWorld(result.world)),
    );
    const uninterrupted = dcCouncilSittingHandler(result.world);
    expect(continued.world).toEqual(uninterrupted.world);
    const continuedMeasures = municipalMeasures(
      continued.world,
      DC_GOVERNMENT_KEY,
    );
    expect(continuedMeasures.slice(0, measures.length)).toEqual(measures);
    expect(
      new Set(continuedMeasures.map((measure) => measure.designation)).size,
    ).toBe(continuedMeasures.length);
  });
  it("continues old saved labels without rewriting their records or recycling numbers", () => {
    const opened = dcWorld();
    const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
    const rules = municipalRulePackFor(government);
    if (!rules.ok) throw new Error("expected sourced D.C. rule pack");
    const jurisdictionId = municipalGovernmentJurisdictionId(
      opened,
      government.key,
    )!;
    const sponsorPersonId = municipalSeats(opened, government.key)[0]!.personId;
    const old = introduceMeasure(opened, {
      stableKey: municipalMeasureKey(government.key, "Act 26-9"),
      jurisdictionId,
      rulePackId: rules.pack.packId,
      designation: "Act 26-9",
      shortTitle: "Previously saved member bill",
      summary: "Controlled pre-migration numbering fixture.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId,
    });
    const oldRecords = old.history.legislativeMeasures!;
    const continued = dcCouncilSittingHandler(
      deserializeWorld(serializeWorld(old)),
    ).world;
    const measures = municipalMeasures(continued, government.key);
    expect(measures.length).toBeGreaterThan(oldRecords.length);
    expect(
      continued.history.legislativeMeasures!.slice(0, oldRecords.length),
    ).toEqual(oldRecords);
    expect(measures[oldRecords.length]!.designation).toBe("B26-0010");
    expect(measures[oldRecords.length]!.numberingSession?.key).toBe(
      "council-period-26",
    );
    expect(deserializeWorld(serializeWorld(continued))).toEqual(continued);
  });
});
