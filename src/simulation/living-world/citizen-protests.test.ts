import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  evaluatePoliticalBeliefFormation,
  applyNpcPoliticalBeliefFormation,
} from "../political-belief-formation";
import { partyOpinionSubject } from "../political-opinion-subjects";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { addDays, ageOnDate } from "../dates";
import { SeededRng } from "../rng";
import type { EntityId, SimulationMoment, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { PARTY_QUESTIONS } from "./party-evolution";
import { organizeCitizenProtest } from "./citizen-protests";
import { onShiftAt, workSchedulesFor } from "./work-schedules";

const seed = "citizen-protest-random-place-proof-2026-10-06";

function randomLocality(seedValue: string) {
  const states = lifePlaceStateIdentities();
  const rng = new SeededRng(seedValue);
  const start = rng.integer(0, states.length);
  for (let offset = 0; offset < states.length; offset += 1) {
    const state = states[(start + offset) % states.length]!;
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0];
    if (place) return { state, place };
  }
  throw new Error("No random locality is available for the new-game proof.");
}

let world: World;
let organizerPersonId: EntityId;
let invitees: readonly [EntityId, EntityId];
let venueJurisdictionId: EntityId;
let venueLabel: string;

beforeAll(() => {
  const { state, place } = randomLocality(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
      depth: "summarize-earlier-life",
    }),
  ).game!;
  world = game.world;
  organizerPersonId = game.playerPersonId;
  const organizer = world.people[organizerPersonId]!;
  venueJurisdictionId = organizer.homeJurisdictionId!;
  venueLabel = `${world.jurisdictions[venueJurisdictionId]!.name} City Hall`;
  const residents = world.personOrder.filter((personId) => {
    const person = world.people[personId];
    return (
      person &&
      personId !== organizerPersonId &&
      person.homeJurisdictionId === venueJurisdictionId &&
      ageOnDate(person.birthDate, world.currentDate) >= 18 &&
      !world.history.personDeaths.some((death) => death.personId === personId)
    );
  });
  if (residents.length < 2)
    throw new Error(
      `New game in ${place.key}, ${state.name} has fewer than two adult neighbors.`,
    );
  invitees = [residents[0]!, residents[1]!];
}, 90_000);

function explicitView(
  personId: EntityId,
  optionKey: string,
  suffix: string,
): void {
  const question = PARTY_QUESTIONS[0]!;
  world = applyNpcPoliticalBeliefFormation(
    world,
    evaluatePoliticalBeliefFormation(world, {
      stableKey: `test:protest-view:${suffix}:${personId}`,
      personId,
      subject: partyOpinionSubject(question.key),
      randomness: "none",
      beliefDimensions: {
        conviction: "settled",
        salience: "central",
        flexibility: "firm",
      },
      factors: [
        {
          stableKey: `test:protest-view:${suffix}`,
          favors: `option:${optionKey}`,
          sourceType: "context:fixture",
          importance: "decisive",
          confidence: "high",
          explanation: "An explicitly saved political view for this test.",
          sourceRefs: [],
        },
      ],
    }),
  );
}

describe("citizen protest attendance", () => {
  it("records a random-place new-game protest from named neighbors' own saved views", () => {
    const issue = PARTY_QUESTIONS[0]!;
    const protestOption = issue.options[0]!;
    const opposingOption = issue.options[1]!;
    explicitView(invitees[0], protestOption.key, "support");
    explicitView(invitees[1], opposingOption.key, "oppose");

    const noShiftMoment = findMomentWithoutInviteeShifts(world, invitees);
    const result = organizeCitizenProtest(world, {
      stableKey: "citizen-protest-random-place-proof",
      organizerPersonId,
      venueJurisdictionId,
      venueLabel,
      issueKey: issue.key,
      protestOptionKey: protestOption.key,
      invitedPersonIds: invitees,
      at: noShiftMoment,
    });

    expect(result).not.toBeNull();
    const created = result!;
    expect(created.event.type).toBe("civic.protest");
    expect(created.invitedPersonIds).toEqual(invitees);
    expect(created.attendeePersonIds).toContain(invitees[0]);
    expect(created.attendeePersonIds).not.toContain(invitees[1]);
    expect(created.namedHeadcount).toBe(1 + created.attendeePersonIds.length);
    expect(created.event.visibility).toBe("public");
    expect(created.event.context.location).toMatchObject({
      jurisdictionId: venueJurisdictionId,
      label: venueLabel,
    });
    const traces = created.world.history.decisionTraces.filter(
      (trace) =>
        trace.context.decisionType === "civic.protest-attendance" &&
        invitees.includes(trace.context.actorPersonId),
    );
    expect(traces).toHaveLength(2);
    expect(traces.map((trace) => trace.selectedOptionKey)).toEqual([
      "attend",
      "stay-home",
    ]);
    expect(created.world.history.events).toContainEqual(
      expect.objectContaining({
        type: "civic.protest-invitation",
        visibility: "limited",
      }),
    );
    assertWorldIntegrity(created.world);
    console.log(
      `CITIZEN PROTEST PROOF seed=${seed} place=${venueLabel} venueJurisdiction=${venueJurisdictionId} date=${created.event.occurredAt} world=${created.world.id} event=${created.event.id} organizer=${organizerPersonId} attendees=${created.attendeePersonIds.join(",")} namedHeadcount=${created.namedHeadcount}`,
    );
  }, 90_000);

  it("does not invite the same neighbor twice or record future protests", () => {
    const issue = PARTY_QUESTIONS[0]!;
    const input = {
      stableKey: "invalid-protest-input",
      organizerPersonId,
      venueJurisdictionId,
      venueLabel,
      issueKey: issue.key,
      protestOptionKey: issue.options[0]!.key,
      invitedPersonIds: [invitees[0], invitees[0]],
    };
    expect(() => organizeCitizenProtest(world, input)).toThrow(
      "A protest invitation list cannot repeat a person.",
    );
    const tomorrow: SimulationMoment = {
      ...world.currentMoment,
      date: addDays(world.currentDate, 1),
    };
    expect(() =>
      organizeCitizenProtest(world, {
        ...input,
        stableKey: "future-protest-input",
        invitedPersonIds: [],
        at: tomorrow,
      }),
    ).toThrow("A protest is recorded only on its actual current date.");
  });
});

function findMomentWithoutInviteeShifts(
  source: World,
  people: readonly EntityId[],
): SimulationMoment {
  for (let minuteOfDay = 0; minuteOfDay < 24 * 60; minuteOfDay += 15) {
    const at = { ...source.currentMoment, minuteOfDay };
    if (
      people.every(
        (personId) =>
          !workSchedulesFor(source, personId, at.date).some((schedule) =>
            onShiftAt(schedule, at),
          ),
      )
    )
      return at;
  }
  throw new Error("The two proof neighbors have no common off-shift moment.");
}
