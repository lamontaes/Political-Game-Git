import { describe, expect, it } from "vitest";

import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { legislatureProfilePack } from "../legislature-game-profile";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { LegislativeMeasureRecord } from "../types";
import { billOnTheFloor, CHAMBER, type Setup } from "../vote-bundle.fixture";
import { assertWorldIntegrity } from "../world";
import {
  amendmentAccessRule,
  amendmentAdmissible,
  germanenessRule,
  recordChamberRuleChange,
  singleSubjectRule,
  startingGermaneness,
} from "./chamber-procedure";

function bill(setup: Setup): LegislativeMeasureRecord {
  return setup.world.history.legislativeMeasures!.find(
    (measure) => measure.id === setup.measureId,
  )!;
}

describe("each chamber starts under its real 2026 rules", () => {
  it("reads the U.S. House as germane and structured, and the Senate as germane only on money bills", () => {
    const { world } = billOnTheFloor();
    expect(
      germanenessRule(world, US_CONGRESS_RULE_PACK, "house"),
    ).toMatchObject({
      value: "required",
      basis: "read",
      route: "chamber-rule",
    });
    expect(
      amendmentAccessRule(world, US_CONGRESS_RULE_PACK, "house").value,
    ).toBe("structured");
    expect(germanenessRule(world, US_CONGRESS_RULE_PACK, "senate").value).toBe(
      "appropriations-only",
    );
    expect(
      amendmentAccessRule(world, US_CONGRESS_RULE_PACK, "senate").value,
    ).toBe("open");
  });

  it("reads a state's lower house and senate from their own rows, and says which rule the constitution holds", () => {
    const alabama = legislatureProfilePack("US-AL", "Alabama")!;
    const [lower, upper] = alabama.chamberOrder;
    expect(startingGermaneness(alabama, lower!)).toMatchObject({
      value: "required",
      route: "constitution",
      citation: "Ala. Const. 2022, sec. 61 (art. IV)",
    });
    expect(startingGermaneness(alabama, upper!).citation).toMatch(
      /Senate Rule 44/,
    );
  });

  it("starts a chamber whose rules were not read at the most common read rule, marked estimated", () => {
    const hawaii = legislatureProfilePack("US-HI", "Hawaii")!;
    expect(startingGermaneness(hawaii, hawaii.chamberOrder[0]!)).toMatchObject({
      value: "required",
      basis: "estimated-from-average",
    });
  });

  it("reads a single-subject rule's scope as written", () => {
    const { scenario } = billOnTheFloor();
    expect(singleSubjectRule(scenario.pack)).toMatchObject({
      generalBills: true,
      appropriationBills: true,
    });
    expect(singleSubjectRule(US_CONGRESS_RULE_PACK)).toBeNull();
  });
});

describe("whether an amendment is in order", () => {
  it("takes an amendment on the bill's subject and refuses one off it", () => {
    const setup = billOnTheFloor();
    const measure = bill(setup);
    const on = amendmentAdmissible(
      setup.world,
      setup.scenario.pack,
      CHAMBER,
      measure,
      { propositionId: setup.workRuleId, answer: "yes" },
    );
    expect(on.admissible).toBe(true);
    const off = amendmentAdmissible(
      setup.world,
      setup.scenario.pack,
      CHAMBER,
      measure,
      { propositionId: setup.offSubjectId, answer: "yes" },
    );
    expect(off).toMatchObject({ admissible: false });
    expect(off.reason).toMatch(/one subject/);
  });

  it("puts the same off-subject amendment out of order in the U.S. House and in order in the Senate", () => {
    const setup = billOnTheFloor();
    const measure = bill(setup);
    const part = { propositionId: setup.offSubjectId, answer: "yes" as const };
    // The House floor is structured: nothing reaches it unless made in order.
    expect(
      amendmentAdmissible(
        setup.world,
        US_CONGRESS_RULE_PACK,
        "house",
        measure,
        part,
      ).reason,
    ).toMatch(/special rule/);
    // Opened in play, the House still requires germane amendments.
    const opened = recordChamberRuleChange(setup.world, {
      stableKey: "procedure:house-open",
      pack: US_CONGRESS_RULE_PACK,
      chamberKey: "house",
      rule: "amendment-access",
      value: "open",
      adoptedByVoteId: null,
      rationale: "The House adopted an open rule for the bill.",
      jurisdictionId: setup.jurisdictionId,
    });
    expect(
      amendmentAdmissible(opened, US_CONGRESS_RULE_PACK, "house", measure, part)
        .reason,
    ).toMatch(/not germane/);
    expect(
      amendmentAdmissible(
        setup.world,
        US_CONGRESS_RULE_PACK,
        "senate",
        measure,
        part,
      ).admissible,
    ).toBe(true);
  });
});

describe("a rider on a bill that must pass", () => {
  it("is refused where the constitution confines a money bill, and by the U.S. Senate's rule, and rides elsewhere", () => {
    const setup = billOnTheFloor("appropriation");
    const measure = bill(setup);
    const rider = { propositionId: setup.offSubjectId, answer: "yes" as const };
    // Nebraska's constitution: one subject for every bill.
    expect(
      amendmentAdmissible(
        setup.world,
        setup.scenario.pack,
        CHAMBER,
        measure,
        rider,
      ).reason,
    ).toMatch(/confines an appropriation bill/);
    expect(
      amendmentAdmissible(
        setup.world,
        US_CONGRESS_RULE_PACK,
        "senate",
        measure,
        rider,
      ).reason,
    ).toMatch(/general legislation/);
    // New Hampshire has no single-subject rule, and its House requires
    // germane amendments; a money bill reaches every area.
    const newHampshire = legislatureProfilePack("US-NH", "New Hampshire")!;
    expect(
      amendmentAdmissible(
        setup.world,
        newHampshire,
        newHampshire.chamberOrder[0]!,
        measure,
        rider,
      ).admissible,
    ).toBe(true);
  });
});

describe("a chamber changes its own rules in play", () => {
  it("records the change, applies it from then on, and keeps it through a save", () => {
    const setup = billOnTheFloor();
    const measure = bill(setup);
    const part = { propositionId: setup.offSubjectId, answer: "yes" as const };
    const changed = recordChamberRuleChange(setup.world, {
      stableKey: "procedure:senate-germane",
      pack: US_CONGRESS_RULE_PACK,
      chamberKey: "senate",
      rule: "germaneness",
      value: "required",
      adoptedByVoteId: null,
      rationale: "The Senate adopted a germaneness rule for all bills.",
      jurisdictionId: setup.jurisdictionId,
    });
    assertWorldIntegrity(changed);
    const record = changed.history.chamberRuleChanges!.at(-1)!;
    expect(record).toMatchObject({
      rule: "germaneness",
      value: "required",
      chamberKey: "senate",
    });
    // Appended after everything already on the record.
    expect(record.sequence).toBeGreaterThan(setup.world.history.nextSequence);
    expect(
      changed.history.events.some((event) => event.id === record.eventId),
    ).toBe(true);
    expect(
      amendmentAdmissible(
        changed,
        US_CONGRESS_RULE_PACK,
        "senate",
        measure,
        part,
      ).admissible,
    ).toBe(false);
    // The world before the change still reads the rule it had then.
    expect(
      germanenessRule(setup.world, US_CONGRESS_RULE_PACK, "senate").change,
    ).toBeNull();
    const reloaded = deserializeWorld(serializeWorld(changed));
    expect(
      germanenessRule(reloaded, US_CONGRESS_RULE_PACK, "senate"),
    ).toMatchObject({ value: "required", change: { id: record.id } });
    // Recording the same change twice changes nothing.
    expect(
      recordChamberRuleChange(changed, {
        stableKey: "procedure:senate-germane",
        pack: US_CONGRESS_RULE_PACK,
        chamberKey: "senate",
        rule: "germaneness",
        value: "required",
        adoptedByVoteId: null,
        rationale: "Again.",
        jurisdictionId: setup.jurisdictionId,
      }),
    ).toBe(changed);
  });

  it("refuses a rules vote that would change what the constitution holds", () => {
    const setup = billOnTheFloor();
    const alabama = legislatureProfilePack("US-AL", "Alabama")!;
    expect(() =>
      recordChamberRuleChange(setup.world, {
        stableKey: "procedure:alabama",
        pack: alabama,
        chamberKey: alabama.chamberOrder[0]!,
        rule: "germaneness",
        value: "not-required",
        adoptedByVoteId: null,
        rationale: "An attempt to drop the rule.",
        jurisdictionId: setup.jurisdictionId,
      }),
    ).toThrow(/cannot change a rule held by the constitution/);
  });
});
