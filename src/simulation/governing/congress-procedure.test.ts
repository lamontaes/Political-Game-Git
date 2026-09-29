import { describe, expect, it } from "vitest";
import { createWorld, recordWorldEvent } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { makeIsoDate } from "../dates";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../congress-rule-pack";
import { introduceMeasure } from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  reconciliationScope,
  recordBudgetInstructions,
  recordUnanimousConsent,
  congressProcedurePack,
  recordedCongressProcedure,
} from "./congress-procedure";

// A small canonical rule fixture. This is not a watched-world acceptance run.
function bill(terms: readonly { key: string; answer: "yes" | "no" }[]) {
  const world = createWorld({
    seed: "congress-procedure-rule-fixture",
    currentDate: makeIsoDate("2026-01-15"),
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
    people: [],
    policyCatalog: createProductionPolicyCatalog(),
  });
  const answers = terms.map((term) => {
    const propositionId = world.policyCatalog.propositionOrder.find(
      (id) => world.policyCatalog.propositions[id]!.stableKey === term.key,
    );
    if (!propositionId)
      throw new Error(`Fixture proposition absent: ${term.key}`);
    return { propositionId, answer: term.answer };
  });
  const introduced = introduceMeasure(world, {
    stableKey: "procedure-fixture:bill",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. 1",
    shortTitle: "Explicit procedure unit fixture",
    summary: "A fictional bill for validating the Senate procedure reader.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    propositionIds: answers.map((a) => a.propositionId),
    propositionAnswers: answers,
  });
  return {
    world: introduced,
    measure: introduced.history.legislativeMeasures!.at(-1)!,
  };
}
const TAX = "us-federal-positions:tax.raise-top-income-tax-rate";
const AID = "us-federal-positions:foreign-affairs.increase-foreign-aid";

describe("a budget-only Senate procedure", () => {
  it("requires a scored fiscal change, not a fiscal label or an empty bill", () => {
    const empty = bill([]);
    expect(reconciliationScope(empty.world, empty.measure)).toBe(false);
    const tax = bill([{ key: TAX, answer: "yes" }]);
    expect(reconciliationScope(tax.world, tax.measure)).toBe(true);
    const unchanged = bill([{ key: TAX, answer: "no" }]);
    expect(reconciliationScope(unchanged.world, unchanged.measure)).toBe(false);
  });
  it("keeps recurring deficit increases outside this conservative budget window", () => {
    const aid = bill([{ key: AID, answer: "yes" }]);
    expect(reconciliationScope(aid.world, aid.measure)).toBe(false);
    const mixed = bill([
      { key: TAX, answer: "yes" },
      { key: AID, answer: "yes" },
    ]);
    expect(reconciliationScope(mixed.world, mixed.measure)).toBe(false);
  });
  it("keeps an unscored section on the ordinary route even when its bill also raises revenue", () => {
    const tax = bill([{ key: TAX, answer: "yes" }]);
    const withRider = recordFiledProvision(tax.world, {
      stableKey: "procedure-fixture:unscored-section",
      measureId: tax.measure.id,
      provisionKey: "unscored-rule",
      sectionNumber: 2,
      heading: "Independent regulatory rule",
      text: "This fictional unit-test clause has no registered fiscal effect.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "The regulated public",
      },
      applicationScope: {
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        segmentKey: null,
      },
    });
    expect(reconciliationScope(withRider, tax.measure)).toBe(false);
    expect(recordBudgetInstructions(withRider, tax.measure)).toBe(withRider);
  });
  it("does not invent adopted instructions or consent without a seated Congress", () => {
    const tax = bill([{ key: TAX, answer: "yes" }]);
    expect(recordBudgetInstructions(tax.world, tax.measure)).toBe(tax.world);
    expect(recordUnanimousConsent(tax.world, tax.measure)).toBe(tax.world);
    expect(recordedCongressProcedure(tax.world, tax.measure.id)).toBe(
      "ordinary",
    );
  });
  it("keeps ordinary cloture and changes only the Senate after a recorded procedure survives save/reopen", () => {
    const tax = bill([{ key: TAX, answer: "yes" }]);
    expect(
      congressProcedurePack(tax.world, tax.measure, US_CONGRESS_RULE_PACK),
    ).toBe(US_CONGRESS_RULE_PACK);
    // The unit fixture supplies the adoption event explicitly. Only an actual
    // chamber/instruction producer can establish this in watched acceptance.
    const recorded = recordWorldEvent(tax.world, {
      stableKey: `congress-procedure/v1:${tax.measure.id}`,
      type: "congress.procedure-adopted",
      occurredAt: tax.world.currentDate,
      recordedAt: tax.world.currentDate,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      involvedEntityIds: [tax.measure.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["test:explicit-procedure-fixture", "procedure:reconciliation"],
      summary:
        "The unit fixture explicitly supplies adopted reconciliation instructions.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const reopened = deserializeWorld(serializeWorld(recorded));
    const pack = congressProcedurePack(
      reopened,
      tax.measure,
      US_CONGRESS_RULE_PACK,
    );
    expect(pack.chambers.find((c) => c.chamberKey === "house")).toBe(
      US_CONGRESS_RULE_PACK.chambers.find((c) => c.chamberKey === "house"),
    );
    const senate = pack.chambers.find((c) => c.chamberKey === "senate")!;
    expect(senate.floorStages.map((s) => s.stageKey)).toEqual(["passage"]);
    expect(senate.floorStages[0]!.vote).toEqual(
      US_CONGRESS_RULE_PACK.chambers
        .find((c) => c.chamberKey === "senate")!
        .floorStages.find((s) => s.stageKey === "passage")!.vote,
    );
    expect(
      US_CONGRESS_RULE_PACK.chambers
        .find((c) => c.chamberKey === "senate")!
        .floorStages.map((s) => s.stageKey),
    ).toEqual(["cloture", "passage"]);
  });
});
