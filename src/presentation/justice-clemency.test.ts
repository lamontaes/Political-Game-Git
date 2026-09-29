import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation";
import { currentGoverningOffices } from "../simulation/governing/state-governing";
import {
  clemencyPetitions,
  clemencyPetitionStatus,
  fileClemencyPetition,
} from "../simulation/justice/clemency";
import {
  ANSWER_TAG,
  BODY_TAG,
  CLEMENCY_ANSWER_EVENT,
  PETITION_TAG,
} from "../simulation/justice/clemency-records";
import { EXECUTIVE_BODY } from "../simulation/justice/clemency-rules";
import {
  CLEMENCY_GRANTED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
} from "../simulation/justice/jail-terms";
import {
  caseCourse,
  jailTermOn,
  referForProsecution,
  referralStableKey,
  sentencesOf,
} from "../simulation/justice/prosecution";
import { ageOnDate } from "../simulation/dates";
import type { EntityId, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/** A life in one state, with the governor the game plays. */
function lifeIn(stateKey: string, seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: stateKey,
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
}

/** A referral key whose drawn course, in this world, ends in jail. */
function jailKey(world: World, prefix: string, from: number): string {
  for (let index = from; index < from + 500; index += 1) {
    const key = `${prefix}:${index}`;
    const course = caseCourse(world, referralStableKey(key), "documentary", 1);
    if (course.sentence?.kind === "jail" && course.sentence.months >= 9)
      return key;
  }
  throw new Error("No jail course in 500 keys.");
}

function refer(world: World, personId: EntityId, key: string): World {
  return referForProsecution(world, {
    stableKey: key,
    subjectPersonId: personId,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    offenseKey: "campaign-funds-personal-use",
    referredBy: { kind: "regulator", label: "state regulator", personId: null },
    basisEventIds: [],
    evidence: "documentary",
    standingFindings: 1,
  }).world;
}

/** Six of the game's adults in the player's town, each jailed for 9+ months. */
function watchedWorld(stateKey: string, seed: string) {
  const start = lifeIn(stateKey, seed);
  const adults = Object.values(start.world.people)
    .filter(
      (person) =>
        person.id !== start.playerId &&
        person.homeJurisdictionId ===
          start.world.people[start.playerId]!.homeJurisdictionId &&
        ageOnDate(person.birthDate, start.world.currentDate) >= 25,
    )
    .slice(0, 6);
  let world = start.world;
  let from = 0;
  for (const person of adults) {
    const key = jailKey(world, `clemency-${stateKey}`, from);
    from = Number(key.split(":").at(-1)) + 1;
    world = refer(world, person.id, key);
  }
  // Charged at 60 days, sentenced at 180, then a year to ask and be answered.
  return { adults, world, later: passOrdinaryDays(world, 180 + 365) };
}

function answersOf(world: World, petitionId: EntityId) {
  return world.history.events.filter(
    (event) =>
      event.type === CLEMENCY_ANSWER_EVENT &&
      event.tags.includes(`${PETITION_TAG}${petitionId}`),
  );
}

/**
 * Oregon: the governor alone holds clemency (Or. Const. art. V sec. 14). Six
 * of the game's own people are jailed; each decides whether to ask, and the
 * governor the game plays answers each request on their own reasons.
 */
describe("clemency in a place where the governor decides alone", () => {
  const { adults, world, later } = watchedWorld("US-OR", "clemency-US-OR");

  it("jails the people it refers", () => {
    expect(adults).toHaveLength(6);
    for (const person of adults)
      expect(sentencesOf(later, person.id).length).toBe(1);
  });

  it("answers every request at the governor's desk, and no request is left hanging", () => {
    const petitions = clemencyPetitions(later);
    expect(petitions.length).toBeGreaterThan(0);
    // Oregon elects a governor in November 2026, so the answer comes from
    // whoever held the office that day: the one at the start or the winner.
    const governors = [world, later].map(
      (moment) =>
        currentGoverningOffices(moment).find(
          (office) => office.stateUsps === "OR",
        )!.holderPersonId,
    );
    for (const petition of petitions) {
      const answers = answersOf(later, petition.id);
      expect(answers).toHaveLength(1);
      const decider = answers[0]!.participants.find(
        (entry) => entry.role === "agency:decider",
      )?.personId;
      expect(governors).toContain(decider);
      expect(clemencyPetitionStatus(later, petition.id)).not.toBe("open");
    }
    // Each answer is the governor's own recorded reasoning, not a draw.
    const traces = later.history.decisionTraces.filter(
      (trace) => trace.context.decisionType === "justice.clemency-decision",
    );
    expect(traces.length).toBe(petitions.length);
  });

  it("ends a granted jail term on the day of the grant", () => {
    for (const grant of later.history.events.filter(
      (event) => event.type === CLEMENCY_GRANTED_EVENT,
    )) {
      const personId = grant.participants[0]!.personId;
      expect(jailTermOn(later, personId)).toBeNull();
      const sentence = sentencesOf(later, personId)[0]!;
      expect(sentence.clemency?.eventId).toBe(grant.id);
      expect(sentence.until).toBe(grant.occurredAt);
      expect(grant.visibility).toBe("public");
    }
  });
});

/**
 * Texas: the Board of Pardons and Paroles must recommend before the governor
 * may grant (Tex. Const. art. IV sec. 11(b)). The board is not seated yet, so
 * it answers from the case record (UNSEATED_BODY_READING, a placeholder).
 */
describe("clemency in a place where the board must say yes first", () => {
  const { world, later } = watchedWorld("US-TX", "clemency-US-TX");

  it("reaches the governor only after the board has said yes", () => {
    const petitions = clemencyPetitions(later);
    expect(petitions.length).toBeGreaterThan(0);
    const governors = [world, later].map(
      (moment) =>
        currentGoverningOffices(moment).find(
          (office) => office.stateUsps === "TX",
        )!.holderPersonId,
    );
    let reachedGovernor = 0;
    for (const petition of petitions) {
      const answers = answersOf(later, petition.id);
      if (answers.length === 0) continue;
      expect(answers[0]!.tags).toContain(`${BODY_TAG}board`);
      const governorAnswer = answers.find((event) =>
        event.tags.includes(`${BODY_TAG}${EXECUTIVE_BODY}`),
      );
      if (!governorAnswer) continue;
      reachedGovernor += 1;
      expect(answers[0]!.tags).toContain(`${ANSWER_TAG}favorable`);
      expect(governors).toContain(
        governorAnswer.participants.find(
          (entry) => entry.role === "agency:decider",
        )?.personId,
      );
    }
    expect(reachedGovernor).toBeGreaterThan(0);
  });

  it("grants nothing the board turned down", () => {
    for (const grant of later.history.events.filter(
      (event) => event.type === CLEMENCY_GRANTED_EVENT,
    )) {
      const petitionId = grant.tags
        .find((tag) => tag.startsWith(PETITION_TAG))!
        .slice(PETITION_TAG.length) as EntityId;
      expect(
        answersOf(later, petitionId).every((event) =>
          event.tags.includes(`${ANSWER_TAG}favorable`),
        ),
      ).toBe(true);
    }
  });
});

describe("a request with no conviction behind it", () => {
  it("is refused", () => {
    const { world, playerId } = lifeIn("US-OR", "clemency-refusal");
    const sentenced = world.history.events.find(
      (event) => event.type === PROSECUTION_SENTENCED_EVENT,
    );
    expect(sentenced).toBeUndefined();
    const result = fileClemencyPetition(world, {
      personId: playerId,
      sentencedEventId: "evt_missing" as EntityId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.reason).toBe(
        "There is no recorded conviction to ask about.",
      );
  });
});
