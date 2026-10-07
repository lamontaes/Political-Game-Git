import { describe, expect, it } from "vitest";
import { bodyForChamber } from "../legislation-scenarios";
import { offerFloorAmendment } from "../legislation";
import { lifePlaceStateIdentities } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createStableId } from "../ids";
import type {
  EntityId,
  LegislativeMeasureRecord,
  LegislativeProposedSection,
} from "../types";
import {
  AUTHORED,
  billOnTheFloor,
  CHAMBER,
  everyone,
} from "../vote-bundle.fixture";
import { singleSubjectRule } from "./chamber-procedure";
import { potentialRiderRuleIssue } from "./rider-rule-trail";

function section(propositionId: EntityId): LegislativeProposedSection {
  return {
    provisionKey: propositionId,
    heading: propositionId,
    supersedesProvisionId: null,
    answers: { propositionId, answer: "yes" },
  };
}

describe("adopted rider rule trail", () => {
  it("uses each of all 56 places' sourced scope for both bill classes", () => {
    const setup = billOnTheFloor();
    const measure = setup.world.history.legislativeMeasures!.find(
      (row) => row.id === setup.measureId,
    )!;
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    let recorded = 0;
    let exempt = 0;
    for (const place of places) {
      const pack = {
        ...setup.scenario.pack,
        jurisdictionKey: place.jurisdictionKey,
      };
      const rule = singleSubjectRule(pack);
      for (const subjectClass of ["general-policy", "appropriation"] as const) {
        const bill = { ...measure, subjectClass };
        const issue = potentialRiderRuleIssue(setup.world, pack, bill, [
          section(setup.offSubjectId),
        ]);
        const applies =
          subjectClass === "appropriation"
            ? rule?.appropriationBills
            : rule?.generalBills;
        if (applies) {
          expect(issue, place.jurisdictionKey).toMatchObject({
            citation: rule!.citation,
            assessmentBasis: "policy-domain-proxy",
            propositionIds: [setup.offSubjectId],
          });
          expect(issue!.addedDomainIds).toHaveLength(1);
          expect(issue!.billDomainIds).not.toContain(issue!.addedDomainIds[0]);
          recorded++;
        } else {
          expect(issue, place.jurisdictionKey).toBeUndefined();
          exempt++;
        }
        expect(
          potentialRiderRuleIssue(setup.world, pack, bill, [
            section(setup.workRuleId),
          ]),
          place.jurisdictionKey,
        ).toBeUndefined();
      }
    }
    expect(recorded).toBeGreaterThan(0);
    expect(exempt).toBeGreaterThan(0);
  });

  it("preserves the rule and exact attribution on adoption and in a save", () => {
    const setup = billOnTheFloor();
    const measure = setup.world.history.legislativeMeasures!.find(
      (row) => row.id === setup.measureId,
    )!;
    const world = offerFloorAmendment(setup.world, {
      stableKey: "rider-trail:adopted",
      measureId: measure.id,
      offeredByLabel: measure.shortTitle,
      description: measure.summary,
      dispositions: everyone(setup, "yea"),
      electedMembers: bodyForChamber(setup.scenario, CHAMBER).members.length,
      provenance: AUTHORED,
      proposedSections: [section(setup.offSubjectId)],
    });
    const amendment = world.history.legislativeAmendments!.at(-1)!;
    expect(amendment).toMatchObject({
      status: "adopted",
      measureId: measure.id,
      potentialSingleSubjectIssue: {
        citation: singleSubjectRule(setup.scenario.pack)!.citation,
        propositionIds: [setup.offSubjectId],
      },
    });
    expect(
      world.history.legislativeVotes!.some(
        (vote) => vote.id === amendment.voteId,
      ),
    ).toBe(true);
    expect(
      deserializeWorld(serializeWorld(world)).history.legislativeAmendments!.at(
        -1,
      ),
    ).toEqual(amendment);
  });

  it("does not accuse rejected amendments, unknown text, or an unrecorded bill subject", () => {
    const setup = billOnTheFloor();
    const measure = setup.world.history.legislativeMeasures!.find(
      (row) => row.id === setup.measureId,
    )!;
    const rejected = offerFloorAmendment(setup.world, {
      stableKey: "rider-trail:rejected",
      measureId: measure.id,
      offeredByLabel: measure.shortTitle,
      description: measure.summary,
      dispositions: everyone(setup, "nay"),
      electedMembers: bodyForChamber(setup.scenario, CHAMBER).members.length,
      provenance: AUTHORED,
      proposedSections: [section(setup.offSubjectId)],
    });
    expect(rejected.history.legislativeAmendments!.at(-1)).toMatchObject({
      status: "rejected",
    });
    expect(
      rejected.history.legislativeAmendments!.at(-1)!
        .potentialSingleSubjectIssue,
    ).toBeUndefined();
    expect(
      potentialRiderRuleIssue(setup.world, setup.scenario.pack, measure, []),
    ).toBeUndefined();
    const noCatalog = {
      ...setup.world,
      policyCatalog: { ...setup.world.policyCatalog, propositions: {} },
    };
    expect(
      potentialRiderRuleIssue(noCatalog, setup.scenario.pack, measure, [
        section(setup.offSubjectId),
      ]),
    ).toBeUndefined();
    const unrecorded: LegislativeMeasureRecord = {
      ...measure,
      id: createStableId("legislative-measure", "rider-trail:unrecorded"),
      propositionIds: [],
    };
    expect(
      potentialRiderRuleIssue(setup.world, setup.scenario.pack, unrecorded, [
        section(setup.offSubjectId),
      ]),
    ).toBeUndefined();
  });
});
