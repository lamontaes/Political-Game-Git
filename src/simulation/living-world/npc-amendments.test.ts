import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../campaigns";
import {
  formAmendmentAuthorsViews,
  planFloorAmendment,
} from "../governing/amendment-authors";
import {
  amendmentAdmissible,
  floorStageTakesAmendments,
} from "../governing/chamber-procedure";
import { seatedChamberForPack } from "../governing/chamber-votes";
import { scheduleInstitutionStep } from "../governing/legislative-clock";
import { ensureOfficeholderPrinciples } from "../governing/officeholder-principles";
import { introduceMeasure, measureAmendments } from "../legislation";
import { legislativeBlueprint } from "../legislation-scenarios";
import { defaultOriginChamber } from "../legislature-rules";
import { nextMeasureDesignation } from "../measure-numbering";
import { stateLegislators } from "../nationwide-world/state-legislature-opening";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { latestPrivateBelief } from "../queries";
import type {
  EntityId,
  LegislativeMeasureRecord,
  PropositionAnswerRef,
  World,
} from "../types";
import { voteBundle } from "../vote-bundle";
import { advanceWorld } from "../world";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";

/**
 * Build 25 step 3 in a watched world: a bill a member files goes through the
 * legislative clock, and before the floor question another member offers an
 * amendment of their own, for a recorded reason, which the chamber decides.
 *
 * The place is drawn at random (CTO ruling, September 28, 11:00 p.m.) among
 * the places whose legislature a new game seats: Nebraska, Alaska and
 * Kentucky. The seed is named so the draw can be read back.
 */
const SEATED_PLACES = ["nebraska", "alaska", "kentucky"] as const;
const DRAW_SEED = "build-25:watched-amendments:1";

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
  for (let day = 0; day < 90 && !floorVoteOf(next, measureId); day += 1)
    next = advanceWorld(next, 1, registry);
  return next;
}

/**
 * The world on the day the committee reports the bill, when members count the
 * floor with the committee's recommendation in hand; null if the bill never
 * reports, or goes to the floor the same day.
 */
function reachCommitteeReport(world: World, measureId: EntityId): World | null {
  const registry = createCampaignElectionTransitionRegistry();
  let next = world;
  for (let day = 0; day < 90; day += 1) {
    if (floorVoteOf(next, measureId)) return null;
    if (
      (next.history.legislativeVotes ?? []).some(
        (vote) =>
          vote.measureId === measureId && vote.purpose === "committee-report",
      )
    )
      return next;
    next = advanceWorld(next, 1, registry);
  }
  return null;
}

describe("members amend a bill for their own reasons in a watched world", () => {
  it("offers, decides and records an NPC amendment on the clock, with Save and Continue replay", () => {
    // The kind of place this needs: a seated chamber with a floor stage that
    // takes amendments. Alaska's pack reads its one floor stage as closed.
    const amendable = SEATED_PLACES.filter((place) => {
      const origin = defaultOriginChamber(legislativeBlueprint(place).pack);
      return origin.floorStages.some((stage) =>
        floorStageTakesAmendments(origin, stage),
      );
    });
    const placeKey =
      amendable[new SeededRng(DRAW_SEED).integer(0, amendable.length)]!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `${DRAW_SEED}:${placeKey}`,
        placeKey,
        startAge: 30,
        startingLife: "legislative-office",
      }),
    ).game!;
    const blueprint = legislativeBlueprint(placeKey);
    const pack = blueprint.pack;
    const chamber = defaultOriginChamber(pack);
    const members = stateLegislators(
      game.world,
      `${pack.packId}:candidacy`,
    ).filter(
      (member) =>
        member.officeKey === `${pack.packId}:${chamber.chamberKey}` &&
        member.personId !== game.playerPersonId,
    );
    let world = ensureOfficeholderPrinciples(
      game.world,
      members.map((member) => member.personId),
    );
    // The chamber as the clock seats it.
    const seats = seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    )!.body.members;
    const questions = world.policyCatalog.propositionOrder.filter((id) => {
      const proposition = world.policyCatalog.propositions[id]!;
      return (
        (proposition.principles?.length ?? 0) > 0 &&
        world.policyCatalog.issues[proposition.issueId]?.levels?.includes(
          "state",
        )
      );
    });

    // A member files a bill on one question after another, until one draws
    // a colleague's amendment: most bills draw none.
    let measureId: EntityId | null = null;
    for (const [index, propositionId] of questions.entries()) {
      const sponsor = members[index % members.length]!;
      const filed = introduceMeasure(world, {
        stableKey: `watched-amendments:${index}`,
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
        sponsorPersonId: sponsor.personId,
        originChamberKey: chamber.chamberKey,
        propositionIds: [propositionId],
        propositionAnswers: [{ propositionId, answer: "yes" }],
      });
      const candidate = filed.history.legislativeMeasures!.at(-1)!.id;
      // Members plan an amendment when the bill reaches the floor, with the
      // committee's report in hand, so the count is read then.
      const reported = reachCommitteeReport(
        scheduleInstitutionStep(filed, candidate),
        candidate,
      );
      if (!reported) continue;
      const ask = {
        measureId: candidate,
        chamber,
        stage: chamber.floorStages.find((stage) =>
          floorStageTakesAmendments(chamber, stage),
        )!,
        members: seats,
        stableKey: "watched-amendments:would-anyone",
        admissible: (
          bill: LegislativeMeasureRecord,
          part: PropositionAnswerRef,
        ) =>
          amendmentAdmissible(reported, pack, chamber.chamberKey, bill, part)
            .admissible,
      };
      // Members plan from saved views, formed first as the clock forms them.
      const plan = planFloorAmendment(
        formAmendmentAuthorsViews(reported, ask),
        ask,
      );
      if (!plan) continue;
      world = reported;
      measureId = candidate;
      break;
    }
    expect(
      measureId,
      `no bill drew an amendment in ${placeKey}`,
    ).not.toBeNull();

    const restored = deserializeWorld(serializeWorld(world));
    const done = reachFloor(world, measureId!);
    const replayed = reachFloor(restored, measureId!);

    const amendment = measureAmendments(done, measureId!).at(-1);
    expect(amendment?.authorMotive).toMatch(/^(pass|sink|record|ride)$/);
    const amendmentVote = done.history.legislativeVotes!.find(
      (vote) => vote.id === amendment!.voteId,
    )!;
    expect(amendmentVote.provenance.method).toBe("member-decisions");
    expect(amendmentVote.provenance.note).toMatch(/author/);
    const floor = floorVoteOf(done, measureId!)!;
    const parts = voteBundle(done, floor).parts.map(
      (part) => part.answers?.propositionId,
    );
    const offered = amendment!.proposedSections![0]!.answers!.propositionId;
    // A member may add a part they hold no settled view on, for what it does
    // to the count (a sink or a pass amendment); one who holds a settled view
    // never offers the opposite of it. A view the clock formed for this floor
    // came through the one belief pipeline, with its decision trace.
    const author = amendment!.offeredByPersonId!;
    const heldBefore = latestPrivateBelief(world, author, offered);
    const authorView = latestPrivateBelief(done, author, offered);
    if (authorView?.position === "support" || authorView?.position === "oppose")
      expect(authorView.position).toBe(
        amendment!.proposedSections![0]!.answers!.answer === "yes"
          ? "support"
          : "oppose",
      );
    if (authorView && authorView.id !== heldBefore?.id)
      expect(authorView.formation.decisionTraceIds.length).toBeGreaterThan(0);
    // An adopted amendment's part is on the bill the chamber passed or
    // refused; a rejected one's is not.
    expect(parts.includes(offered)).toBe(amendment!.status === "adopted");
    expect(measureAmendments(replayed, measureId!)).toEqual(
      measureAmendments(done, measureId!),
    );
    expect(floorVoteOf(replayed, measureId!)?.dispositions).toEqual(
      floor.dispositions,
    );
  }, 300_000);
});
