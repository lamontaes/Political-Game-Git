import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  base,
  enact,
  procedure,
} from "../../../tests/fixtures/funded-service-fixture";
import { stableHash } from "../ids";
import {
  lawExposuresOf,
  recordLawExposure,
  rightsOrEligibilityLoss,
} from "../law-exposure";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../mind";
import { SYNTHETIC_MIND_IDS } from "../mind-catalog";
import { createFormationContext, recordPrivateBelief } from "../politics";
import { recordEventKnowledge } from "../records";
import { lawInterestGroup, lawInterestMembers } from "../official-view-reads";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, Person, World } from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  foundSharedCauseGroup,
  decideSharedCauseGroupAction,
  joinLawInterestGroup,
  joinSharedCauseGroup,
  recordSharedCauseActionArgument,
  sharedCauseGroupKey,
} from "./law-interest-groups";
import { reactionLens } from "./official-views";

/** A place from all 56 with a playable locality, named by its seed. */
function drawPlace(seed: string) {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  const start = parseInt(stableHash(seed).slice(0, 8), 16) % states.length;
  for (let step = 0; step < states.length; step++) {
    const state = states[(start + step) % states.length]!;
    const town = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0];
    if (town) return { state: state.jurisdictionKey, town };
  }
  throw new Error("No playable locality in any of the 56 places.");
}

/** Authored fixture: this person's recorded home is in `jurisdictionId`. */
function homeIn(world: World, personId: EntityId, jurisdictionId: EntityId) {
  const person = world.people[personId]!;
  const move = <T extends { kind: string; endedAt?: unknown }>(fact: T): T =>
    fact.kind === "residence" && fact.endedAt === null
      ? { ...fact, jurisdictionId }
      : fact;
  const moved = {
    ...person,
    homeJurisdictionId: jurisdictionId,
    establishedFacts: person.establishedFacts.map(move),
    ...(person.detailLevel === "materialized"
      ? {
          details: {
            ...person.details,
            generatedFacts: person.details.generatedFacts.map(move),
          },
        }
      : {}),
  } as Person;
  return { ...world, people: { ...world.people, [personId]: moved } };
}

const seed = "a159-felt-size-non-money";
const drawn = drawPlace(seed);
const label = `${drawn.town.displayName}, ${drawn.state}, seed ${seed}`;

/**
 * A state law enacted in a place drawn from all 56, and six residents of the
 * drawn town who each lost an eligibility under it: no money on record and no
 * pay on record, which a money loss could never count with.
 */
function sixEligibilityLosses() {
  const state = stateJurisdictionForKey(drawn.state)!;
  const townPlace = drawn.town.context.jurisdiction;
  let world: World = {
    ...base,
    jurisdictions: {
      ...base.jurisdictions,
      [state.id]: state,
      [townPlace.id]: townPlace,
    },
    jurisdictionOrder: [
      ...new Set([...base.jurisdictionOrder, state.id, townPlace.id]),
    ],
    control: { kind: "person", personId: procedure.playerPersonId },
  };
  world = enact(world, state.id, "yes");
  // Authored fixture: everyone's recorded home is in the drawn town.
  for (const id of world.personOrder) world = homeIn(world, id, townPlace.id);
  const enactment = world.history.legislativeEnactments!.at(-1)!;
  expect(enactment.outcome, label).toBe("enacted");
  const town = townPlace.id;
  const hit = world.personOrder.slice(0, 6);
  expect(hit, label).toHaveLength(6);
  for (const id of hit)
    world = recordLawExposure(world, {
      stableKey: `law-interest-test:eligibility:${id}`,
      personId: id,
      measureId: enactment.measureId,
      channel: "benefit",
      direction: "cost",
      amount: null,
      cadence: null,
      sourceRecordId: enactment.id,
      includeFamily: false,
    });
  const loss = (w: World, id: EntityId) =>
    lawExposuresOf(w, id).find((exposure) =>
      exposure.stableKey.startsWith("law-interest-test:eligibility:"),
    )!;
  return { world, town, hit, loss, measureId: enactment.measureId };
}

describe("a rights loss or an eligibility loss founds an interest group", () => {
  it(`six eligibility losses found a group, and the founder is its first member (${label})`, () => {
    const { world, town, hit, loss, measureId } = sixEligibilityLosses();
    expect(rightsOrEligibilityLoss(loss(world, hit[0]!)), label).toBe(true);
    // Five are not enough to found it.
    const five = {
      ...world,
      history: {
        ...world.history,
        lawExposures: world.history.lawExposures!.filter(
          (exposure) => exposure.personId !== hit[5],
        ),
      },
    };
    expect(joinLawInterestGroup(five, loss(five, hit[0]!))).toBe(five);
    expect(lawInterestGroup(five, town, measureId)).toBeFalsy();
    // With six, each reflects in turn.
    let grouped = world;
    for (const id of hit)
      grouped = joinLawInterestGroup(grouped, loss(grouped, id));
    const groupId = lawInterestGroup(grouped, town, measureId)!;
    expect(groupId, label).toBeTruthy();
    const group = grouped.history.organizations.find(
      (row) => row.id === groupId,
    )!;
    expect(group.provenance).toMatchObject({
      note: "Founded by residents a law cost a right or an eligibility.",
    });
    // The first resident with the resolve to join alongside the others hit
    // founds it and is its first member; nobody founds an empty group.
    const founder = hit.find((id) => reactionLens(grouped, id) >= 1)!;
    expect(lawInterestMembers(grouped, groupId), label).toContain(founder);
    const notes = grouped.history.organizationParticipations
      .filter((row) => row.organizationId === groupId)
      .map((row) => [
        row.personId,
        "note" in row.provenance ? row.provenance.note : null,
      ]);
    expect(notes[0], label).toEqual([
      founder,
      "Founded the group after the law cost them a right or an eligibility, with the other residents it hit.",
    ]);
    // Everyone else who joined did so alongside someone they know; a rights
    // loss alone is not enough resolve to join on one's own.
    for (const [, note] of notes.slice(1))
      expect(note, label).toBe(
        "Joined after the law cost them a right or an eligibility, alongside someone they know.",
      );
    assertWorldIntegrity(grouped);
    expect(deserializeWorld(serializeWorld(grouped))).toEqual(grouped);
  });

  it(`a patient resident's eligibility loss does not found it; a reactive neighbor's does (${label})`, () => {
    const { world, town, hit, loss, measureId } = sixEligibilityLosses();
    // Authored fixture: one resident hit is patient, another reactive.
    const temper = (w: World, personId: EntityId, expressionKey: string) =>
      recordPersonalityTendency(w, {
        stableKey: `law-interest-test:tempo:${personId}`,
        personId,
        tendencyId: SYNTHETIC_MIND_IDS.tendencies.responseTempo,
        recordedAt: w.currentDate,
        expressionKey,
        strength: "moderate",
        confidence: "high",
        scopeTags: [],
        provenance: createMindProvenance("authored", {
          note: "Temper recorded for the interest-group test.",
        }),
        supersedesTendencyId: null,
      });
    // Two neighbors other than the player, whose own temper is theirs.
    const [calm, eager] = hit.filter(
      (id) => id !== procedure.playerPersonId,
    ) as [EntityId, EntityId];
    let w = temper(world, calm, "patient");
    w = temper(w, eager, "reactive");
    expect(reactionLens(w, calm)).toBe(0.75);
    // The patient resident's rights loss is felt, but not enough to found it.
    expect(joinLawInterestGroup(w, loss(w, calm))).toBe(w);
    expect(lawInterestGroup(w, town, measureId)).toBeFalsy();
    // The reactive neighbor founds it and is its only member so far.
    const founded = joinLawInterestGroup(w, loss(w, eager));
    const groupId = lawInterestGroup(founded, town, measureId)!;
    expect(groupId, label).toBeTruthy();
    expect(lawInterestMembers(founded, groupId), label).toEqual([eager]);
  });

  it("forms and joins a cause group from two recorded views in a generated place", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "shared-cause-generated-place-46",
        placeKey: drawn.town.key,
        startAge: 35,
        questionnaire: "skipped",
      }),
    ).game!;
    let world: World = game.world;
    const local = world.personOrder.filter(
      (id) =>
        world.people[id]!.homeJurisdictionId ===
        game.world.people[game.playerPersonId]!.homeJurisdictionId,
    );
    const [founder, neighbor] = local
      .filter((id) => id !== game.playerPersonId)
      .slice(0, 2);
    expect(
      founder,
      "two generated neighbors in the selected place",
    ).toBeDefined();
    expect(
      neighbor,
      "two generated neighbors in the selected place",
    ).toBeDefined();
    const jurisdictionId = world.people[founder!]!.homeJurisdictionId;
    const proposition = Object.values(world.policyCatalog.propositions)[0]!;
    const causeKey = `random-place-cause:${jurisdictionId}`;
    const cause = {
      key: causeKey,
      title: "Library access",
      goal: "keep neighborhood libraries open",
      jurisdictionId,
      sourceEventId: "pending" as EntityId,
      propositionId: proposition.id,
      desiredPosition: "support" as const,
    };
    world = recordWorldEvent(world, {
      stableKey: `${causeKey}:source`,
      type: "civic.shared-cause.raised",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [founder!],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["civic.shared-cause"],
      summary: "Neighbors raised the library access question.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = world.history.events.at(-1)!.id;
    const recordedCause = { ...cause, sourceEventId: eventId };
    for (const [index, personId] of [founder!, neighbor!].entries())
      world = recordPrivateBelief(world, {
        stableKey: `${causeKey}:view:${index}`,
        personId,
        propositionId: proposition.id,
        formedAt: world.currentDate,
        position: "support",
        conviction: "strong",
        salience: "high",
        flexibility: "open",
        rationale: null,
        formation: createFormationContext("reflection:initial"),
        supersedesBeliefId: null,
      });

    const founded = foundSharedCauseGroup(world, {
      cause: recordedCause,
      founderPersonId: founder!,
    });
    expect(founded.outcome).toBe("formed");
    expect(founded.decisionTraceId).toBeTruthy();
    const joined = joinSharedCauseGroup(founded.world, {
      cause: recordedCause,
      organizationId: founded.organizationId!,
      personId: neighbor!,
    });
    expect(joined.outcome).toBe("joined");
    expect(
      joined.world.history.organizations.find(
        (organization) => organization.id === founded.organizationId,
      )?.stableKey,
    ).toBe(sharedCauseGroupKey(jurisdictionId, causeKey));
    expect(
      joined.world.history.organizationParticipations.filter(
        (row) => row.organizationId === founded.organizationId,
      ),
    ).toHaveLength(2);
    let argued = recordWorldEvent(joined.world, {
      stableKey: `${causeKey}:argument`,
      type: "civic.shared-cause.member-argument",
      occurredAt: joined.world.currentDate,
      recordedAt: joined.world.currentDate,
      jurisdictionId,
      involvedEntityIds: [neighbor!, founder!],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [`shared-cause-action:protest`],
      summary: "A member asked the group to hold a protest.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const argumentEvent = argued.history.events.at(-1)!;
    argued = recordSharedCauseActionArgument(argued, {
      causeKey,
      organizationId: founded.organizationId!,
      personId: neighbor!,
      action: "protest",
      eventId: argumentEvent.id,
    });
    argued = recordEventKnowledge(argued, {
      stableKey: `${causeKey}:heard-argument`,
      personId: founder!,
      eventId: argumentEvent.id,
      learnedAt: argued.currentDate,
      believedSummary: argumentEvent.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const knowledge = argued.history.knowledge.at(-1)!;
    argued = recordWorldEvent(argued, {
      stableKey: `${causeKey}:decision-day`,
      type: "civic.shared-cause.decision-day",
      occurredAt: argued.currentDate,
      recordedAt: argued.currentDate,
      jurisdictionId,
      involvedEntityIds: [founder!],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["civic.shared-cause.decision-day"],
      summary: "The group considered what to do next.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const action = decideSharedCauseGroupAction(argued, {
      cause: recordedCause,
      organizationId: founded.organizationId!,
      decisionEventId: argued.history.events.at(-1)!.id,
      heardArguments: [{ action: "protest", knowledgeId: knowledge.id }],
    });
    expect(action.action).toBe("protest");
    assertWorldIntegrity(action.world);
  });
});
