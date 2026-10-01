import { describe, expect, it } from "vitest";
import {
  TEST_TAX_TERMS,
  enactedTaxFixture,
} from "../../tests/fixtures/tax-policy-fixture";
import { adultLifeIn } from "../../tests/fixtures/state-executive-entry";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../simulation/congress-rule-pack";
import { ageOnDate, daysBetween } from "../simulation/dates";
import { presidentDesk } from "../simulation/governing/congress-lawmaking";
import { seatedCongressChamber } from "../simulation/governing/congress-chambers";
import { recordLawExposure } from "../simulation/law-exposure";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  referMeasure,
  requireMeasure,
  takeFloorVote,
  transmitMeasure,
} from "../simulation/legislation";
import {
  committeeMembers,
  dispositionsFromCounts,
} from "../simulation/legislation-scenarios";
import { createPartnership } from "../simulation/life";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { followsNewsClosely } from "../simulation/living-world/official-views";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../simulation/national-election-geography";
import {
  officialStanding,
  officialViewReflectionEventKey,
  viewOfOfficial,
} from "../simulation/official-view-reads";
import { money } from "../simulation/resources";
import { SeededRng } from "../simulation/rng";
import type { EntityId, World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import { projectLifeConversation } from "./life-conversation";
import { openNextLifeScene } from "./life-scene-flow";
import { officialViewLine, strongestOfficialView } from "./small-talk-english";
import { declarePersonalTaxOccurrence } from "./tax-work";

function reflected() {
  const fixture = enactedTaxFixture();
  const spouseId = fixture.world.personOrder.find(
    (id) => id !== fixture.personId,
  )!;
  let world = createPartnership(fixture.world, {
    stableKey: "official-view-talk:marriage",
    personIds: [fixture.personId, spouseId].sort() as [
      typeof spouseId,
      typeof spouseId,
    ],
    startedAt: fixture.world.currentDate,
    kind: "legal:marriage",
    provenance: { kind: "authored", note: "A married taxpayer for the test." },
  });
  const registry = createCampaignElectionTransitionRegistry();
  world = advanceWorld(
    world,
    daysBetween(world.currentDate, world.history.taxPolicies![0]!.effectiveAt),
    registry,
  );
  world = declarePersonalTaxOccurrence(world, {
    personId: fixture.personId,
    stableKey: "official-view-talk:occurrence",
    proposalId: fixture.proposalId,
    baseKey: TEST_TAX_TERMS.baseKey,
    amountMinorUnits: 2100,
    assumptionNote: "One explicit fictional taxable occurrence.",
  });
  world = advanceWorld(world, 5, registry);
  return { world, personId: fixture.personId, spouseId };
}

describe("people say what they think of an official", () => {
  it("the standing shown is the view the spouse saved through the belief pipeline", () => {
    const { world, spouseId } = reflected();
    const view = strongestOfficialView(world, spouseId)!;
    // The saved view: the spouse's latest private belief about this official.
    const saved = world.history.privateBeliefs
      .filter(
        (belief) =>
          belief.personId === spouseId &&
          belief.subject?.kind === "official" &&
          belief.subject.personId === view.officialId,
      )
      .at(-1)!;
    expect(view.belief).toEqual(saved);
    expect(view.sourceRecordId).toBe(saved.id);
    expect(saved.position).toBe("oppose");
    expect(view.points).toBe(officialStanding(saved));
    expect(view.points).toBe(
      viewOfOfficial(world, spouseId, view.officialId).points,
    );
    // Formed by the pipeline, not computed beside it: a decision trace on
    // the official, whose winning reason is what the law did.
    const trace = world.history.decisionTraces.find(
      (row) => row.id === saved.formation.decisionTraceIds[0],
    )!;
    expect(trace.context.decisionType).toBe("political-belief-formation");
    expect(trace.context.subject.entityId).toBe(view.officialId);
    expect(trace.selectedOptionKey).toBe("opposition");
    expect(
      trace.context.considerations.some(
        (row) => row.stableKey === `factor:law-exposure:${view.exposure.id}`,
      ),
    ).toBe(true);
    // No old reflection rows are written.
    expect(world.history.officialViews ?? []).toEqual([]);
  });

  it("the spouse names who voted for the tax, the law, and that it cost the player's household", () => {
    const { world, personId, spouseId } = reflected();
    const view = strongestOfficialView(world, spouseId)!;
    expect(view.points).toBeLessThan(0);
    const official = world.people[view.officialId]!;
    const measure = world.history.legislativeMeasures!.find(
      (row) => row.id === view.measureId,
    )!;
    const line = officialViewLine(world, spouseId, personId, [])!;
    expect(line.text).toContain(`${official.givenName} ${official.familyName}`);
    expect(line.text).toContain(measure.shortTitle);
    expect(line.text).toContain(world.people[personId]!.givenName);
    expect(line.text).not.toMatch(/\d+ points?/);
    expect(line.parts.map((part) => part.variantKey)).toContain("family-cost");
  });

  it("is offered only to someone who holds such a view", () => {
    const reflectedWorld = reflected();
    const { personId, spouseId } = reflectedWorld;
    // The player is home, with the household present, as play opens a day.
    const world = openNextLifeScene(reflectedWorld.world, personId, "home");
    const withView = projectLifeConversation(world, personId, spouseId);
    expect(
      withView?.intents.map((row) => (typeof row === "string" ? row : row.key)),
    ).toContain("officials");
    const other = world.personOrder.find(
      (id) => id !== personId && strongestOfficialView(world, id) === null,
    );
    if (other) {
      const without = projectLifeConversation(world, personId, other);
      expect(
        (without?.intents ?? []).map((row) =>
          typeof row === "string" ? row : row.key,
        ),
      ).not.toContain("officials");
    }
  });
});

/**
 * The same in a place drawn by a named seed from all 56: an Act of Congress,
 * carried through the public legislative writers by the seated Congress and
 * signed by the seated President at the real executive seam, reaches one
 * resident, who reflects on it on the clock.
 */
const DRAW_SEED = "a158:official-view:1";

function actOfCongressReaching(seed: string) {
  const states = lifePlaceStateIdentities();
  const state = states[new SeededRng(seed).integer(0, states.length)]!;
  const label = `${state.name} (seed ${seed})`;
  const { world: opened, personId } = adultLifeIn(state.usps, seed);
  const provenance = {
    method: "authored-fixture" as const,
    note: "Authored votes so an Act reaches the resident; not a forecast.",
    sourceEntityIds: [opened.id],
  };
  let world = introduceMeasure(ensureNationalElectionJurisdiction(opened), {
    stableKey: "a158:act",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. A158 fixture",
    shortTitle: "A158 fixture Act",
    summary: "An authored Act whose cost reaches one resident.",
    origin: "member-introduction",
    subjectClass: "revenue",
    originChamberKey: "house",
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  for (const chamber of US_CONGRESS_RULE_PACK.chambers) {
    const body = seatedCongressChamber(world, chamber.chamberKey)!.body;
    const committee = chamber.committees[0]!;
    const prefix = `a158:${chamber.chamberKey}`;
    world = referMeasure(world, {
      stableKey: `${prefix}:referral`,
      measureId,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: `${prefix}:committee`,
      measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers },
      ),
      rationale: "Authored committee votes for the A158 fixture.",
      provenance,
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: `${prefix}:calendar`,
      measureId,
    });
    for (const stage of chamber.floorStages)
      world = takeFloorVote(world, {
        stableKey: `${prefix}:${stage.stageKey}`,
        measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance,
      });
    if (chamber.chamberKey === "house")
      world = transmitMeasure(world, { stableKey: "a158:transmit", measureId });
  }
  world = enrollMeasure(world, { stableKey: "a158:enroll", measureId });
  world = presentMeasureToExecutive(world, {
    stableKey: "a158:present",
    measureId,
  });
  // The seated President decides at the real executive seam.
  world = presidentDesk(world, requireMeasure(world, measureId));
  if (measurePosition(world, measureId).phase === "awaiting-enactment")
    world = recordEnactment(world, {
      stableKey: "a158:law",
      measureId,
      effectiveAt: world.currentDate,
    });
  const enactment = world.history.legislativeEnactments!.find(
    (row) => row.measureId === measureId,
  )!;
  // A grown resident of the drawn place, not the player, who neither follows
  // the news closely nor holds federal office: the President is the one
  // official they answer for.
  const signer = world.history.events.find(
    (event) =>
      event.type === "legislation.measure-signed" &&
      event.tags.some((tag) => tag.includes(measureId)),
  );
  const residentId = world.personOrder.find(
    (id) =>
      id !== personId &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18 &&
      !followsNewsClosely(world, id) &&
      !signer?.participants.some((row) => row.personId === id),
  )!;
  world = recordLawExposure(world, {
    stableKey: "a158:exposure",
    personId: residentId,
    measureId,
    channel: "tax-payment",
    direction: "cost",
    amount: money(2100, "USD"),
    cadence: "one-time",
    // The Act's own enactment record is what this authored cost cites.
    sourceRecordId: enactment.id,
    includeFamily: false,
  });
  const reflected = advanceWorld(
    world,
    3,
    createCampaignElectionTransitionRegistry(),
  );
  return { world: reflected, residentId, measureId, label };
}

describe(`a resident's view of an official, in a drawn place (seed ${DRAW_SEED})`, () => {
  it("the standing shown is the resident's latest saved belief, formed from the law that reached them", () => {
    const { world, residentId, label } = actOfCongressReaching(DRAW_SEED);
    const view = strongestOfficialView(world, residentId);
    expect(view, label).not.toBeNull();
    const saved = world.history.privateBeliefs
      .filter(
        (belief) =>
          belief.personId === residentId &&
          belief.subject?.kind === "official" &&
          belief.subject.personId === view!.officialId,
      )
      .at(-1)!;
    expect(view!.belief, label).toEqual(saved);
    expect(view!.points).toBe(officialStanding(saved));
    expect(view!.points).toBe(
      viewOfOfficial(world, residentId, view!.officialId).points,
    );
    // The President signed the Act; the cost makes it blame.
    expect(view!.act, label).toBe("signed");
    expect(saved.position, label).toBe("oppose");
    const reflection = world.history.events.find(
      (event) =>
        event.stableKey === officialViewReflectionEventKey(view!.exposure),
    )!;
    expect(saved.formation.relevantEventIds).toContain(reflection.id);
    const trace = world.history.decisionTraces.find(
      (row) => row.id === saved.formation.decisionTraceIds[0],
    )!;
    expect(trace.context.decisionType).toBe("political-belief-formation");
    expect(trace.context.subject.entityId).toBe(view!.officialId);
    expect(trace.selectedOptionKey).toBe("opposition");
    expect(
      trace.context.considerations.some(
        (row) => row.stableKey === `factor:law-exposure:${view!.exposure.id}`,
      ),
    ).toBe(true);
    expect((world as World).history.officialViews ?? []).toEqual([]);
    expect(residentId as EntityId).toBe(view!.exposure.personId);
  }, 240_000);
});
