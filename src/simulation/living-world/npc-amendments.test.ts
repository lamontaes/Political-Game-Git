import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { floorStageTakesAmendments } from "../governing/chamber-procedure";
import {
  decideChamberVote,
  seatedChamberForPack,
} from "../governing/chamber-votes";
import { committeeRoster } from "../governing/committee-assignment";
import { scheduleInstitutionStep } from "../governing/legislative-clock";
import {
  ensureOfficeholderPrinciples,
  principleView,
  recordedPrinciplesForPerson,
} from "../governing/officeholder-principles";
import {
  introduceMeasure,
  measureAmendments,
  measurePosition,
  placeMeasureOnCalendar,
  recordCommitteeDisposition,
  referMeasure,
} from "../legislation";
import { legislativeBlueprint } from "../legislation-scenarios";
import { defaultOriginChamber } from "../legislature-rules";
import { lifePlaces } from "../life-places";
import { nextMeasureDesignation } from "../measure-numbering";
import { createFormationContext, recordPrinciples } from "../politics";
import { formViewFromRecordedPrinciples } from "../principled-view-formation";
import { latestPrivateBelief } from "../queries";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { voteBundle } from "../vote-bundle";
import { advanceWorld } from "../world";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";

/**
 * Build 25 step 3 in a watched world: on the floor day the legislative clock
 * gives a member the chance to offer an amendment of their own, for a
 * recorded reason, and the chamber decides it.
 *
 * The place is drawn by a named seed from every place a new game can open
 * in, narrowed by data to those whose legislature a new game seats with a
 * floor stage that takes amendments. No place is named here.
 *
 * The world is seeded so a member already holds a qualifying view: a few
 * members come to hold, at full strength, every principle a question bears
 * on, and form their view on it through the one belief pipeline; the rest of
 * the chamber holds the opposite principles. The bill is moved to the floor
 * calendar through the canonical legislative writers (the committee's report
 * carries its members' own decisions), and the clock runs only to the floor
 * day. What the member offers, why, and how the chamber votes is the
 * engine's decision on the clock.
 */
const DRAW_SEED = "build-25:watched-amendments:2";
const AUTHORS = 3;

function floorVoteOf(world: World, measureId: EntityId) {
  return (
    (world.history.legislativeVotes ?? []).find(
      (vote) => vote.measureId === measureId && vote.purpose === "floor-stage",
    ) ?? null
  );
}

function reachFloor(world: World, measureId: EntityId): World {
  const registry = createCampaignElectionTransitionRegistry();
  let next = world;
  for (let day = 0; day < 10 && !floorVoteOf(next, measureId); day += 1)
    next = advanceWorld(next, 1, registry);
  return next;
}

describe("members amend a bill for their own reasons in a watched world", () => {
  it("offers, decides and records an NPC amendment on the clock, with Save and Continue replay", () => {
    // Every place a new game seats a legislature for, whose origin chamber's
    // first floor stage takes amendments.
    const places = lifePlaces().flatMap((place) => {
      const scenarioKey = place.capabilities.legislativeScenarioKey;
      if (!scenarioKey) return [];
      const origin = defaultOriginChamber(
        legislativeBlueprint(scenarioKey).pack,
      );
      const first = origin.floorStages[0];
      return first && floorStageTakesAmendments(origin, first)
        ? [{ placeKey: place.key, scenarioKey }]
        : [];
    });
    expect(places.length).toBeGreaterThan(0);
    const { placeKey, scenarioKey } =
      places[new SeededRng(DRAW_SEED).integer(0, places.length)]!;
    const label = `${placeKey} (seed ${DRAW_SEED})`;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `${DRAW_SEED}:${placeKey}`,
        placeKey,
        startAge: 30,
        startingLife: "legislative-office",
      }),
    ).game!;
    const blueprint = legislativeBlueprint(scenarioKey);
    const pack = blueprint.pack;
    const chamber = defaultOriginChamber(pack);
    const body = seatedChamberForPack(
      game.world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    )!.body;
    const npcIds = body.members
      .map((member) => member.personId)
      .filter(
        (id): id is EntityId => id !== null && id !== game.playerPersonId,
      );
    let world = ensureOfficeholderPrinciples(game.world, npcIds);

    // The part a member will care about: a state question whose principles
    // weigh enough that holding them all at full strength makes it central,
    // and a bill question in the same policy field, so the part is germane.
    const catalog = world.policyCatalog;
    const stateQuestion = (id: EntityId) =>
      catalog.issues[catalog.propositions[id]!.issueId]?.levels?.includes(
        "state",
      ) ?? false;
    const domainOf = (id: EntityId) =>
      catalog.issues[catalog.propositions[id]!.issueId]?.domainId;
    const weightOf = (id: EntityId) =>
      (catalog.propositions[id]!.principles ?? []).reduce(
        (sum, bearing) => sum + (bearing.weight ?? 1),
        0,
      );
    const siblingsOf = (id: EntityId) =>
      catalog.propositionOrder.filter(
        (other) =>
          other !== id &&
          stateQuestion(other) &&
          domainOf(other) === domainOf(id),
      );
    const part =
      catalog.propositionOrder.find(
        (id) =>
          stateQuestion(id) &&
          weightOf(id) >= 2.25 &&
          siblingsOf(id).length > 0,
      ) ?? null;
    expect(part, label).not.toBeNull();

    // A few members hold every principle the part bears on, at full strength;
    // the rest hold the opposite. Authored principle records through the
    // canonical writer, each superseding what the member held.
    const authors = npcIds.slice(0, AUTHORS);
    const bearings = catalog.propositions[part!]!.principles!;
    const records = npcIds.flatMap((personId) =>
      bearings.map((bearing) => {
        const agrees = authors.includes(personId);
        const consistent = bearing.bearing === "consistent-with";
        return {
          stableKey: `watched-amendments:principle:${personId}:${bearing.principleId}`,
          personId,
          principleId: bearing.principleId,
          formedAt: world.currentDate,
          stance:
            consistent === agrees
              ? ("endorses" as const)
              : ("rejects" as const),
          strength: 1,
          conviction: "strong" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("reflection:initial"),
          supersedesPrincipleRecordId:
            [...recordedPrinciplesForPerson(world, personId)]
              .filter((record) => record.principleId === bearing.principleId)
              .sort((a, b) => a.sequence - b.sequence)
              .at(-1)?.id ?? null,
        };
      }),
    );
    world = recordPrinciples(world, records);
    // Each author forms their view through the one belief pipeline.
    for (const personId of authors)
      world = formViewFromRecordedPrinciples(world, {
        stableKey: `watched-amendments:view:${personId}:${part}`,
        personId,
        propositionId: part!,
      });
    for (const personId of authors) {
      const view = latestPrivateBelief(world, personId, part!);
      expect(view?.position, label).toBe("support");
      expect(view?.salience, label).toBe("central");
      expect(view?.formation.decisionTraceIds.length).toBeGreaterThan(0);
    }

    // A member who is not an author files a bill on the sibling question;
    // it is referred, the committee's members decide its report, and it is
    // placed on the floor calendar.
    // The sponsor writes the bill from their own views: the first question in
    // the part's field their principles lean on, answered as they lean.
    const sponsor = npcIds[AUTHORS]!;
    const siblings = siblingsOf(part!);
    const billQuestion =
      siblings.find((id) => principleView(world, sponsor, id)) ?? siblings[0]!;
    const billAnswer =
      principleView(world, sponsor, billQuestion)?.answer ?? "yes";
    world = introduceMeasure(world, {
      stableKey: "watched-amendments:bill",
      jurisdictionId: blueprint.context.jurisdiction.id,
      rulePackId: pack.packId,
      designation: nextMeasureDesignation(world, {
        jurisdictionId: blueprint.context.jurisdiction.id,
        originChamber: chamber,
      }),
      shortTitle: "A member's bill",
      summary: "A member files a bill on a question they hold a view on.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: sponsor,
      originChamberKey: chamber.chamberKey,
      propositionIds: [billQuestion],
      propositionAnswers: [{ propositionId: billQuestion, answer: billAnswer }],
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    const committee = chamber.committees[0]!;
    world = referMeasure(world, {
      stableKey: "watched-amendments:refer",
      measureId,
      committeeKey: committee.committeeKey,
    });
    const roster = committeeRoster(
      body,
      chamber.committees,
      committee.committeeKey,
      `${pack.packId}:${chamber.chamberKey}`,
    );
    world = recordCommitteeDisposition(world, {
      stableKey: "watched-amendments:committee",
      measureId,
      recommendation: "favorable",
      dispositions: decideChamberVote(world, {
        stableKey: "watched-amendments:committee",
        question: {
          question: {
            measureId,
            purpose: "committee-report",
            forumKey: committee.committeeKey,
            floorStageKey: null,
            amendmentStableKey: null,
            provisionKey: null,
          },
          questionLabel: `${committee.name} report`,
        },
        members: roster,
        playerPersonId: game.playerPersonId,
        playerBallot: null,
        nonpartisan: blueprint.nonpartisan,
      }),
      rationale: "The committee voted on reporting the bill.",
      provenance: {
        method: "member-decisions",
        note: "Committee members' recorded decisions for this bill.",
        sourceEntityIds: [],
      },
    });
    expect(measurePosition(world, measureId).phase, label).toBe(
      "awaiting-floor",
    );
    world = placeMeasureOnCalendar(world, {
      stableKey: "watched-amendments:calendar",
      measureId,
    });
    world = scheduleInstitutionStep(world, measureId);

    // Save and Continue before the floor day; both run to it.
    const restored = deserializeWorld(serializeWorld(world));
    const done = reachFloor(world, measureId);
    const replayed = reachFloor(restored, measureId);

    const amendment = measureAmendments(done, measureId).at(-1);
    expect(amendment, `${label}: no member offered an amendment`).toBeDefined();
    expect(amendment!.authorMotive).toMatch(/^(pass|sink|record|ride)$/);
    const amendmentVote = done.history.legislativeVotes!.find(
      (vote) => vote.id === amendment!.voteId,
    )!;
    expect(amendmentVote.provenance.method).toBe("member-decisions");
    expect(amendmentVote.provenance.note).toMatch(/author/);
    const floor = floorVoteOf(done, measureId)!;
    const parts = voteBundle(done, floor).parts.map(
      (entry) => entry.answers?.propositionId,
    );
    const offered = amendment!.proposedSections![0]!.answers!;
    // A member who holds a settled view never offers the opposite of it; a
    // view the clock formed for this floor came through the one belief
    // pipeline, with its decision trace.
    const author = amendment!.offeredByPersonId!;
    const heldBefore = latestPrivateBelief(
      world,
      author,
      offered.propositionId,
    );
    const authorView = latestPrivateBelief(done, author, offered.propositionId);
    if (authorView?.position === "support" || authorView?.position === "oppose")
      expect(authorView.position).toBe(
        offered.answer === "yes" ? "support" : "oppose",
      );
    if (authorView && authorView.id !== heldBefore?.id)
      expect(authorView.formation.decisionTraceIds.length).toBeGreaterThan(0);
    // The members' principles on the part are what the engine read; each
    // seated member's lean on it matches the side they were given.
    for (const personId of npcIds)
      expect(principleView(world, personId, part!)?.answer).toBe(
        authors.includes(personId) ? "yes" : "no",
      );
    // An adopted amendment's part is on the bill the chamber passed or
    // refused; a rejected one's is not.
    expect(parts.includes(offered.propositionId)).toBe(
      amendment!.status === "adopted",
    );
    expect(measureAmendments(replayed, measureId)).toEqual(
      measureAmendments(done, measureId),
    );
    expect(floorVoteOf(replayed, measureId)?.dispositions).toEqual(
      floor.dispositions,
    );
  }, 120_000);
});
