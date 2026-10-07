import { afterEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { daysBetween } from "../dates";
import { composeWorldTimeHandlers } from "../campaigns";
import {
  introduceMeasure,
  measureAmendments,
  measurePosition,
  placeMeasureOnCalendar,
} from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { rulePackById } from "../legislature-rule-packs";
import { nextMeasureNumbering } from "../measure-numbering";
import { municipalRulePackFor } from "../municipal-government";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { townCouncilProfilePackId } from "../town-council-profile";
import {
  homeLocalGovernmentUnits,
  localGovernmentJurisdiction,
} from "../nationwide-world/local-governments";
import { ensureJurisdiction } from "../national-election-geography";
import {
  ensureLocalCouncilMeetings,
  LOCAL_COUNCIL_MEETING,
  townQuestions,
} from "../living-world/local-council-meetings";
import {
  ensureLocalGovernmentSeats,
  sittingLocalOfficers,
} from "../living-world/local-government-seats";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { FutureDueItem, World } from "../types";
import { advanceWorld } from "../world";
import * as amendmentAuthors from "./amendment-authors";
import {
  amendmentAdmissible,
  floorStageTakesAmendments,
} from "./chamber-procedure";
import {
  createFormationContext,
  recordPrivateBelief,
  recordPublicPosition,
} from "../politics";
import { ensureCouncilPrinciples } from "./council-lawmaking";
import { mayAnswerQuestion } from "./question-authority";

const seed = "team9-a85-council-amendment-activity-20261001";
const place =
  CHIEF_EXECUTIVE_JURISDICTIONS[
    new SeededRng(seed).integer(0, CHIEF_EXECUTIVE_JURISDICTIONS.length)
  ]!;

/** The existing clock reaches the saved meeting and resolves its due item. */
function meet(world: World, due: FutureDueItem): World {
  return advanceWorld(
    world,
    daysBetween(world.currentDate, due.dueAt),
    composeWorldTimeHandlers(),
  );
}

function councilFixture(place: string, seed: string) {
  const small = smallWorld({ place, people: 4, seed });
  let world = ensureLocalCouncilMeetings(
    ensureLocalGovernmentSeats(small.world, small.personId),
    small.personId,
  );
  const firstMeeting = world.history.futureDueItems.find(
    (row) => row.transitionKey === LOCAL_COUNCIL_MEETING,
  )!;
  expect(firstMeeting).toBeDefined();
  const home = homeLocalGovernmentUnits(world, small.personId);
  const unit = [...home.municipal, ...home.townships, ...home.counties].find(
    (row) => firstMeeting.stableKey.includes(`:${row.id}:meeting:`),
  )!;
  expect(unit).toBeDefined();
  const compiled = municipalGovernmentForUnit(unit);
  const municipalPack = compiled ? municipalRulePackFor(compiled) : null;
  const pack = municipalPack?.ok
    ? municipalPack.pack
    : rulePackById(townCouncilProfilePackId(unit));
  const sponsor = sittingLocalOfficers(world, unit).find(
    (row) => !row.mayor && row.personId !== small.personId,
  )!;
  expect(sponsor).toBeDefined();
  const jurisdiction =
    unit.unitType === "municipality" ? null : localGovernmentJurisdiction(unit);
  if (jurisdiction) world = ensureJurisdiction(world, jurisdiction);
  const jurisdictionId = jurisdiction?.id ?? small.jurisdictionId;
  const proposition = townQuestions(world, jurisdictionId)[0]!;
  expect(proposition).toBeDefined();
  // Authored bill input isolates the reading activity; it does not claim spontaneous filing.
  world = introduceMeasure(world, {
    stableKey: `${seed}:received-ordinance`,
    jurisdictionId,
    rulePackId: pack.packId,
    ...nextMeasureNumbering(world, {
      jurisdictionId,
      originChamber: chamberByKey(pack, "council"),
      rulePackId: pack.packId,
    }),
    shortTitle: "Received council amendment activity fixture",
    summary:
      "Authored ordinance supplied to the existing council reading path.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: sponsor.personId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  world = placeMeasureOnCalendar(world, {
    stableKey: `${seed}:received-agenda`,
    measureId: measure.id,
  });
  return { world, small, pack, unit, measure };
}

afterEach(() => vi.restoreAllMocks());

describe(`A85 existing council meeting activity (${place}, ${seed})`, () => {
  it("does not infer amendment permission at an unread council reading", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    const { small, pack, world: opened } = councilFixture(place, seed);
    let world = opened;
    const offered = vi.spyOn(amendmentAuthors, "offerPlannedAmendment");
    const visited = new Set<string>();
    const readingMeasures = new Set<string>();
    // Introduction, agenda placement, then the next reading: all are actual saved meetings.
    for (let step = 0; step < 3; step += 1) {
      const due = world.history.futureDueItems.find(
        (row) =>
          row.transitionKey === LOCAL_COUNCIL_MEETING && !visited.has(row.id),
      );
      expect(
        due,
        "the seated council must save its next meeting",
      ).toBeDefined();
      visited.add(due!.id);
      for (const measure of world.history.legislativeMeasures ?? []) {
        if (
          measure.sponsorPersonId !== small.personId &&
          measurePosition(world, measure.id).phase === "on-floor"
        )
          readingMeasures.add(measure.id);
      }
      world = meet(world, due!);
    }
    expect(
      readingMeasures.size,
      "an actual NPC ordinance must reach its reading",
    ).toBeGreaterThan(0);
    expect(
      world.history.legislativeVotes?.some((vote) =>
        readingMeasures.has(vote.measureId),
      ),
      "the existing meeting must actually vote on that ordinance",
    ).toBe(true);
    const chamber = chamberByKey(pack, "council");
    expect(
      chamber.floorStages.every(
        (stage) => !floorStageTakesAmendments(chamber, stage),
      ),
    ).toBe(true);
    // The spy passes through; an unread rule cannot supply permission.
    expect(offered).not.toHaveBeenCalled();
    const restored = deserializeWorld(serializeWorld(world));
    expect(restored.history.legislativeAmendments).toEqual(
      world.history.legislativeAmendments,
    );
  });
  it("records a Charlottesville NPC amendment before its admitted Adoption vote and preserves it through Continue/repeat", () => {
    const fixture = councilFixture("5114968", `${seed}:charlottesville`);
    const { small, pack, unit, measure } = fixture;
    let world = fixture.world;
    expect(pack.packId).toBe("us-va-charlottesville-council-v1");
    const chamber = chamberByKey(pack, "council");
    expect(chamber.floorStages).toHaveLength(1);
    expect(chamber.floorStages[0]).toMatchObject({
      stageKey: "final-passage",
      label: "Adoption",
    });
    expect(floorStageTakesAmendments(chamber, chamber.floorStages[0]!)).toBe(
      true,
    );
    const seats = sittingLocalOfficers(world, unit).filter((row) => !row.mayor);
    expect(seats).toHaveLength(5);
    world = ensureCouncilPrinciples(world, seats);
    const billId = measure.propositionIds![0]!;
    const part = townQuestions(world, measure.jurisdictionId).find(
      (row) =>
        row.id !== billId &&
        amendmentAdmissible(world, pack, "council", measure, {
          propositionId: row.id,
          answer: "yes",
        }).admissible,
    )!;
    expect(
      part,
      "the sourced council rules must admit the proposed part",
    ).toBeDefined();
    // Authored positions give one member a central concern opposed by colleagues; the existing actor model chooses whether to offer it.
    for (const [index, seat] of seats.entries()) {
      for (const topic of ["bill", "part"] as const) {
        const propositionId = topic === "bill" ? billId : part.id;
        const position =
          topic === "bill"
            ? index === 2
              ? "oppose"
              : "support"
            : index === 0
              ? "support"
              : "oppose";
        const salience =
          topic === "bill"
            ? index === 2
              ? "high"
              : "moderate"
            : index === 0
              ? "central"
              : "high";
        world = recordPrivateBelief(world, {
          stableKey: `${seed}:cville:${seat.personId}:${topic}:view`,
          personId: seat.personId,
          propositionId,
          formedAt: world.currentDate,
          position,
          conviction: "strong",
          salience,
          flexibility: "firm",
          rationale: null,
          formation: createFormationContext("reflection:initial"),
          supersedesBeliefId: null,
        });
        world = recordPublicPosition(world, {
          stableKey: `${seed}:cville:${seat.personId}:${topic}:public`,
          personId: seat.personId,
          propositionId,
          statedAt: world.currentDate,
          stance: position,
          statement:
            "Authored fixture position stated before the council reading.",
          audience: "public",
          venue: null,
          sourceEventId: null,
          supersedesPublicPositionId: null,
        });
      }
    }
    const offered = vi.spyOn(amendmentAuthors, "offerPlannedAmendment");
    const due = world.history.futureDueItems.find(
      (row) => row.transitionKey === LOCAL_COUNCIL_MEETING,
    )!;
    expect(due).toBeDefined();
    world = meet(world, due);
    const amendment = measureAmendments(world, measure.id).at(-1)!;
    console.info(
      "A85_PLAN_BOUNDARY",
      JSON.stringify({
        measureId: measure.id,
        billId,
        partId: part.id,
        phase: measurePosition(world, measure.id),
        calls: offered.mock.calls
          .filter(([, input]) => input.measureId === measure.id)
          .map(([before, input]) => ({
            onDate: before.currentDate,
            stage: input.stage.stageKey,
            members: input.members.map((row) => row.personId),
            plan: amendmentAuthors.planFloorAmendment(before, input),
          })),
      }),
    );
    expect(amendment).toBeDefined();
    expect(amendment.offeredByPersonId).not.toBe(small.personId);
    expect(seats.map((row) => row.personId)).toContain(
      amendment.offeredByPersonId,
    );
    const calls = offered.mock.calls.filter(
      ([, input]) => input.measureId === measure.id,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]![1].stage).toMatchObject({
      stageKey: "final-passage",
      label: "Adoption",
    });
    expect(amendment.proposedSections?.length).toBeGreaterThan(0);
    for (const section of amendment.proposedSections ?? []) {
      expect(section.answers).toBeDefined();
      expect(
        mayAnswerQuestion(
          calls[0]![0],
          measure.jurisdictionId,
          section.answers!.propositionId,
        ),
      ).toBe(true);
      expect(calls[0]![1].admissible!(measure, section.answers!)).toBe(true);
    }
    const amendmentVote = world.history.legislativeVotes!.find(
      (row) => row.id === amendment.voteId,
    )!;
    const adoptionVote = world.history.legislativeVotes!.find(
      (row) => row.measureId === measure.id && row.id !== amendment.voteId,
    )!;
    expect(amendmentVote).toBeDefined();
    expect(adoptionVote).toBeDefined();
    expect(amendmentVote.sequence).toBeLessThan(adoptionVote.sequence);
    expect(amendmentVote.provenance.note).toMatch(/offered for this reason/);
    const restored = deserializeWorld(serializeWorld(world));
    expect(measureAmendments(restored, measure.id)).toEqual(
      measureAmendments(world, measure.id),
    );
    const nextDue = restored.history.futureDueItems.find(
      (row) => row.transitionKey === LOCAL_COUNCIL_MEETING && row.id !== due.id,
    )!;
    expect(nextDue).toBeDefined();
    const continued = meet(restored, nextDue);
    expect(measureAmendments(continued, measure.id)).toEqual(
      measureAmendments(world, measure.id),
    );
    expect(
      offered.mock.calls.filter(([, input]) => input.measureId === measure.id),
    ).toHaveLength(1);
    expect(
      continued.history.legislativeVotes!.filter(
        (row) => row.id === amendmentVote.id,
      ),
    ).toHaveLength(1);
    expect(
      continued.history.legislativeVotes!.filter(
        (row) => row.id === adoptionVote.id,
      ),
    ).toHaveLength(1);
    const receipt = {
      government: "us-va-charlottesville",
      pack: pack.packId,
      measureId: measure.id,
      authorId: amendment.offeredByPersonId,
      amendmentId: amendment.id,
      authorName: amendment.offeredByLabel,
      offeredAt: amendment.offeredAt,
      status: amendment.status,
      motive: amendment.authorMotive,
      amendmentVoteId: amendmentVote.id,
      adoptionVoteId: adoptionVote.id,
      reason: amendmentVote.provenance.note,
    };
    if (process.env.TEAM9_A85_RECEIPT) {
      writeFileSync(
        process.env.TEAM9_A85_RECEIPT,
        JSON.stringify(receipt, null, 2),
      );
    }
  });
});
