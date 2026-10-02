import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { daysBetween } from "../dates";
import { composeWorldTimeHandlers } from "../campaigns";
import {
  introduceMeasure,
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

afterEach(() => vi.restoreAllMocks());

describe(`A85 existing council meeting activity (${place}, ${seed})`, () => {
  it("asks the existing amendment writer before voting on a saved NPC ordinance", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
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
      unit.unitType === "municipality"
        ? null
        : localGovernmentJurisdiction(unit);
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
    // The spy passes through: it supplies neither an amendment nor a member's choice.
    expect(offered.mock.calls.length).toBeGreaterThan(0);
    for (const [before, input] of offered.mock.calls) {
      const measure = before.history.legislativeMeasures?.find(
        (row) => row.id === input.measureId,
      );
      expect(measure).toBeDefined();
      expect(measure!.sponsorPersonId).not.toBe(small.personId);
      expect(measurePosition(before, input.measureId).phase).toBe("on-floor");
      expect(input.members.length).toBeGreaterThan(0);
      for (const member of input.members) {
        expect(member.personId).toBeTruthy();
        expect(before.people[member.personId!]).toBeDefined();
      }
      expect(input.chamber.chamberKey).toBe("council");
      expect(input.stage.stageKey).toBeTruthy();
    }
    const restored = deserializeWorld(serializeWorld(world));
    expect(restored.history.legislativeAmendments).toEqual(
      world.history.legislativeAmendments,
    );
  });
});
