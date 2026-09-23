import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { introduceMeasure } from "../simulation/legislation";
import { rulePackById } from "../simulation/legislature-rule-packs";
import { searchLifePlaces } from "../simulation/life-places";
import { ensureStateJurisdiction } from "../simulation/nationwide-world/state-executives";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  createFormationContext,
  recordPrinciple,
} from "../simulation/politics";
import type { EntityId, FutureDueItem, World } from "../simulation/types";
import {
  CARED_ABOUT_ISSUE_COUNT,
  POLITICAL_REFLECTION_TRANSITION_KEY,
  encounterProposalsInEvent,
  issuesTheyCareAbout,
  proposalsInEvent,
} from "../simulation/living-world/political-reflection";

const OHIO = "us-oh-general-assembly-v1";

/**
 * An ordinary start in Columbus, Ohio, with a bill filed in the Ohio
 * General Assembly by somebody who is not the player, naming one catalog
 * question that engages a principle `bearing` way.
 */
function withBill(
  seedNote: string,
  bearing: "consistent-with" | "against" = "consistent-with",
) {
  const place = searchLifePlaces("Columbus", 20).find(
    (entry) => entry.stateJurisdictionKey === "US-OH",
  )!;
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: `reflection-${seedNote}`,
    placeKey: place.key,
  });
  const opened = openOrdinaryLife(game.world, game.playerPersonId);
  const world = ensureStateJurisdiction(opened, "OH");
  const proposition = world.policyCatalog.propositionOrder
    .map((id) => world.policyCatalog.propositions[id]!)
    .find((entry) =>
      (entry.principles ?? []).some((row) => row.bearing === bearing),
    )!;
  expect(proposition).toBeDefined();
  const sponsor = world.personOrder.find(
    (id) =>
      id !== game.playerPersonId &&
      Number(world.currentDate.slice(0, 4)) -
        Number(world.people[id]!.birthDate.slice(0, 4)) >=
        25,
  )!;
  expect(sponsor).toBeDefined();
  const ohio = Object.values(world.jurisdictions).find(
    (entry) => entry.name === "Ohio",
  )!;
  expect(ohio).toBeDefined();
  const chamber = rulePackById(OHIO).chambers[0]!;
  const filed = introduceMeasure(world, {
    stableKey: `reflection-test:${seedNote}`,
    jurisdictionId: ohio.id,
    rulePackId: OHIO,
    designation: "H.B. 900",
    shortTitle: "A bill that puts a question",
    summary: "Filed so a question reaches somebody.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: sponsor,
    originChamberKey: chamber.chamberKey,
    propositionIds: [proposition.id],
  });
  return {
    world: filed,
    playerPersonId: game.playerPersonId,
    sponsor,
    proposition,
    engaged: (proposition.principles ?? []).find(
      (row) => row.bearing === bearing,
    )!,
    event: filed.history.events.at(-1)!,
  };
}

function holdPrinciple(
  world: World,
  personId: EntityId,
  principleId: EntityId,
  stance: "endorses" | "rejects",
): World {
  return recordPrinciple(world, {
    stableKey: `reflection-test:principle:${personId}:${principleId}`,
    personId,
    principleId,
    formedAt: world.currentDate,
    stance,
    conviction: "strong",
    flexibility: "conditional",
    qualification: null,
    formation: createFormationContext("reflection:initial", {
      note: "Test fixture: a principle the person already holds.",
    }),
    supersedesPrincipleRecordId: null,
  });
}

function dueFor(world: World, personId: EntityId): readonly FutureDueItem[] {
  return world.history.futureDueItems.filter(
    (item) =>
      item.transitionKey === POLITICAL_REFLECTION_TRANSITION_KEY &&
      item.entityIds.includes(personId),
  );
}

/** The next ordinary day passes, the way a player passes it. */
function reflect(world: World, item: FutureDueItem) {
  const next = passOrdinaryDays(world, 1);
  const state = next.history.futureDueItemStates
    .filter((entry) => entry.dueItemId === item.id)
    .at(-1);
  return { world: next, reasonKey: state?.reasonKey ?? null };
}

describe("people form political views from what they meet", () => {
  it("is carried by the handlers ordinary time runs", () => {
    expect(
      createCampaignElectionTransitionRegistry().get(
        POLITICAL_REFLECTION_TRANSITION_KEY,
      ),
    ).toBeDefined();
  });

  it("a filed bill puts its questions, and meeting it once schedules one reflection", () => {
    const { world, sponsor, proposition, event } = withBill("once");
    expect(proposalsInEvent(world, event)).toEqual([proposition.id]);
    const met = encounterProposalsInEvent(world, {
      personId: sponsor,
      event,
      summary: event.summary,
      provenance: { kind: "direct-experience", eventId: event.id },
    });
    expect(
      met.history.propositionExposures.filter(
        (exposure) => exposure.personId === sponsor,
      ),
    ).toHaveLength(1);
    expect(dueFor(met, sponsor)).toHaveLength(1);
    // Hearing about the same filing again is not a second meeting.
    const again = encounterProposalsInEvent(met, {
      personId: sponsor,
      event,
      summary: event.summary,
      provenance: { kind: "direct-experience", eventId: event.id },
    });
    expect(again).toBe(met);
  });

  it("the player meets it too, but is never scheduled to decide", () => {
    const { world, playerPersonId, sponsor, event } = withBill("player");
    const told = encounterProposalsInEvent(world, {
      personId: playerPersonId,
      event,
      summary: event.summary,
      provenance: { kind: "told-by", sourcePersonId: sponsor, claimId: null },
    });
    expect(
      told.history.propositionExposures.some(
        (exposure) => exposure.personId === playerPersonId,
      ),
    ).toBe(true);
    expect(dueFor(told, playerPersonId)).toEqual([]);
  });

  it("somebody holding none of the principles it engages considers it and forms no view", () => {
    const { world, sponsor, event } = withBill("no-principle");
    const met = encounterProposalsInEvent(world, {
      personId: sponsor,
      event,
      summary: event.summary,
      provenance: { kind: "direct-experience", eventId: event.id },
    });
    const result = reflect(met, dueFor(met, sponsor)[0]!);
    expect(result.reasonKey).toBe("people-reflection:considered-no-view");
    expect(
      result.world.history.privateBeliefs.filter(
        (belief) => belief.personId === sponsor,
      ),
    ).toEqual([]);
    // It was considered, not left blank.
    expect(
      result.world.history.decisionTraces.some(
        (trace) =>
          trace.context.actorPersonId === sponsor &&
          trace.context.decisionType === "political-belief-formation",
      ),
    ).toBe(true);
  });

  it.each([
    ["endorses", "consistent-with", "support"],
    ["rejects", "consistent-with", "oppose"],
    ["endorses", "against", "oppose"],
    ["rejects", "against", "support"],
  ] as const)(
    "somebody who %s a principle the question is %s it comes to %s it",
    (stance, bearing, expected) => {
      const { world, sponsor, proposition, engaged, event } = withBill(
        `${stance}-${bearing}`,
        bearing,
      );
      const holding = holdPrinciple(
        world,
        sponsor,
        engaged.principleId,
        stance,
      );
      const met = encounterProposalsInEvent(holding, {
        personId: sponsor,
        event,
        summary: event.summary,
        provenance: { kind: "direct-experience", eventId: event.id },
      });
      const result = reflect(met, dueFor(met, sponsor)[0]!);
      expect(result.reasonKey).toBe("people-reflection:view-formed");
      const beliefs = result.world.history.privateBeliefs.filter(
        (belief) => belief.personId === sponsor,
      );
      expect(beliefs).toHaveLength(1);
      expect(beliefs[0]!.position).toBe(expected);
      // No firmer than the principle it rests on.
      expect(beliefs[0]!.conviction).toBe("strong");
      expect(beliefs[0]!.flexibility).toBe("conditional");
      const cares = issuesTheyCareAbout(result.world, sponsor).includes(
        proposition.issueId,
      );
      expect(beliefs[0]!.salience).toBe(cares ? "high" : "low");
    },
  );

  it("an adult cares about a handful of issues, the same ones on every reading", () => {
    const { world, sponsor } = withBill("cares");
    const cares = issuesTheyCareAbout(world, sponsor);
    expect(cares.length).toBeGreaterThanOrEqual(CARED_ABOUT_ISSUE_COUNT.min);
    expect(cares.length).toBeLessThanOrEqual(CARED_ABOUT_ISSUE_COUNT.max);
    expect(issuesTheyCareAbout(world, sponsor)).toEqual(cares);
    expect(new Set(cares).size).toBe(cares.length);
  });
});
