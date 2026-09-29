import { describe, expect, it } from "vitest";

import {
  addDays,
  candidacyPackForJurisdiction,
  CONCESSION_EVENT,
  ELECTION_NIGHT_LOCATION_KEY,
  electionContestResult,
  VICTORY_SPEECH_EVENT,
} from "../simulation";
import { electionSpeechGiven } from "../simulation/campaign-speeches";
import { ageOnDate } from "../simulation/dates";
import { householdMembershipsAt } from "../simulation/life-queries";
import { startHouseholdMembership } from "../simulation/life";
import { recordMemory } from "../simulation/records";
import {
  householdmatesOf,
  speechReception,
} from "../simulation/speech-reception";
import {
  retellSpeeches,
  SPEECH_MEMORY_FADE_DAYS,
} from "../simulation/speech-retelling";
import { createExplicitGeographyLife } from "./new-game-geography";
import {
  fileForOffice,
  giveElectionSpeech,
  projectCampaign,
} from "./campaign-projection";
import {
  electionNightLocationKey,
  placeForLocationKey,
} from "./place-backdrops";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * Election night is said out loud: the rival gives their speech when the race
 * closes, and the player gives theirs only by choosing to, as a victory speech
 * or a concession to the person who beat them.
 */
describe("election-night speeches", () => {
  it("has the rival speak at once and waits for the player to choose", () => {
    const created = createExplicitGeographyLife({
      placeKey: "2743000", // Minneapolis, Minnesota
      seed: "election-speeches",
      startAge: 40,
      startKind: "normal",
      depth: "summarize-earlier-life",
    });
    const personId = created.game.playerPersonId;
    const office = candidacyPackForJurisdiction(
      created.game.world.people[personId]!.homeJurisdictionId,
    )!.offices.find((candidate) => candidate.officeKey.endsWith(":senate"))!;
    let world = fileForOffice(
      created.game.world,
      personId,
      null,
      office.officeKey,
      addDays(created.game.world.currentDate, 28),
    );
    for (
      let day = 0;
      day < 40 && projectCampaign(world, personId).phase === "active";
      day += 1
    )
      world = passOrdinaryDays(world);
    const contest = world.history.electionContests!.at(-1)!;
    const result = electionContestResult(world, contest.id)!;
    expect(result).not.toBeNull();
    const rival = contest.candidatePersonIds.find((id) => id !== personId)!;
    const speeches = (subject: string, w = world) =>
      w.history.events.filter(
        (event) =>
          (event.type === VICTORY_SPEECH_EVENT ||
            event.type === CONCESSION_EVENT) &&
          event.participants.some(
            (participant) =>
              participant.personId === subject &&
              participant.role === "focus:subject",
          ),
      );
    // The rival has spoken; the player has not.
    expect(speeches(rival)).toHaveLength(1);
    expect(speeches(rival)[0]!.type).toBe(
      result.winnerPersonId === rival ? VICTORY_SPEECH_EVENT : CONCESSION_EVENT,
    );
    expect(speeches(personId)).toHaveLength(0);
    const view = projectCampaign(world, personId);
    expect(view.speech).toMatchObject({
      kind: result.winnerPersonId === personId ? "victory" : "concession",
      given: null,
    });

    const spoken = giveElectionSpeech(world, personId);
    expect(speeches(personId, spoken)).toHaveLength(1);
    expect(projectCampaign(spoken, personId).speech?.given).toMatch(
      result.winnerPersonId === personId
        ? /gave a victory speech after winning the race for/
        : /conceded the race for .+ to /,
    );
    // The speech is worded from the moves the speaker made: it opens by
    // thanking the room, and a concession names the person who won.
    const words = projectCampaign(spoken, personId).speech?.words;
    expect(words).not.toBeNull();
    expect(words!.opening).toMatch(/^“Thank you/);
    expect(words!.text.startsWith(words!.opening.slice(1, -1))).toBe(true);
    if (result.winnerPersonId !== personId) {
      const winner = spoken.people[result.winnerPersonId]!;
      expect(words!.text).toContain(`${winner.givenName} ${winner.familyName}`);
    }
    // The same saved speech reads the same every time.
    expect(projectCampaign(spoken, personId).speech?.words).toEqual(words);
    // Giving it twice says nothing new.
    expect(giveElectionSpeech(spoken, personId)).toBe(spoken);

    // Steps 4 to 6: the people who live with the speaker were in the room.
    // Each heard it firsthand, reacted in their own way, and remembers it.
    const speech = electionSpeechGiven(spoken, contest.id, personId)!;
    // Steps 4 to 6 (continued): the room holds the people the speaker lives
    // with, family and close friends from the same place, and campaign staff.
    const housemates = householdmatesOf(spoken, personId);
    expect(housemates.length).toBeGreaterThan(0);
    const witnesses = speechReception(spoken, speech)!
      .event.participants.filter((row) => row.role === "observation:witness")
      .map((row) => row.personId);
    for (const housemate of housemates) expect(witnesses).toContain(housemate);
    for (const witnessId of witnesses)
      expect(spoken.people[witnessId]!.homeJurisdictionId).toBeDefined();
    for (const witnessId of witnesses) {
      expect(speech.involvedEntityIds).toContain(witnessId);
      expect(
        spoken.history.knowledge.some(
          (row) =>
            row.personId === witnessId &&
            row.eventId === speech.id &&
            row.source.kind === "direct",
        ),
      ).toBe(true);
      expect(
        spoken.history.memories.some(
          (row) => row.personId === witnessId && row.eventId === speech.id,
        ),
      ).toBe(true);
    }
    const reception = speechReception(spoken, speech)!;
    const { cheered, applauded } = reception.counts;
    expect(cheered + applauded + reception.counts["stayed-quiet"]).toBe(
      witnesses.length,
    );
    expect(words!.heard).toBe(reception.event.summary);

    // Step 7: someone who remembers it well tells the people they live with
    // who were not there, and each of them remembers it one step less sharply.
    const holderId = housemates[0]!;
    const home = householdMembershipsAt(spoken, personId)[0]!.household;
    const newcomerId = spoken.personOrder.find(
      (id) =>
        !speech.involvedEntityIds.includes(id) &&
        ageOnDate(spoken.people[id]!.birthDate, spoken.currentDate) >= 5 &&
        !spoken.history.knowledge.some(
          (row) => row.personId === id && row.eventId === speech.id,
        ),
    )!;
    // Fixture: the witness's memory is strong, and someone who was not there
    // moves in afterwards.
    let told = recordMemory(spoken, {
      stableKey: "test:holder-memory",
      personId: holderId,
      eventId: speech.id,
      formedAt: spoken.currentDate,
      rememberedSummary: speech.summary,
      interpretation: "It stayed with them.",
      strength: "strong",
      relevanceTags: ["speech.heard"],
      supersedesMemoryId: spoken.history.memories.find(
        (row) => row.personId === holderId && row.eventId === speech.id,
      )!.id,
    });
    told = startHouseholdMembership(told, {
      stableKey: "test:newcomer",
      personId: newcomerId,
      householdId: home.id,
      startedAt: told.currentDate,
      residenceRole: "secondary",
      kind: "resident:member",
      provenance: { kind: "authored", note: "Retelling fixture" },
    });
    told = retellSpeeches(told);
    expect(
      told.history.knowledge.find(
        (row) => row.personId === newcomerId && row.eventId === speech.id,
      )?.source,
    ).toEqual({ kind: "told-by", sourcePersonId: holderId, claimId: null });
    expect(
      told.history.memories.find(
        (row) => row.personId === newcomerId && row.eventId === speech.id,
      )?.strength,
    ).toBe("moderate");
    // The speaker is never told about their own speech.
    expect(
      told.history.knowledge.some(
        (row) =>
          row.personId === personId &&
          row.eventId === speech.id &&
          row.source.kind === "told-by",
      ),
    ).toBe(false);
    // Retelling the same month again tells nobody twice.
    expect(retellSpeeches(told).history.knowledge).toHaveLength(
      told.history.knowledge.length,
    );
    // A memory nobody retells for the fade period weakens one step.
    const later = retellSpeeches({
      ...told,
      currentDate: addDays(told.currentDate, SPEECH_MEMORY_FADE_DAYS),
    });
    expect(
      later.history.memories
        .filter((row) => row.personId === holderId && row.eventId === speech.id)
        .at(-1)?.strength,
    ).toBe("moderate");
    // Election night is a place: the venue, on the day the player spoke, and
    // never before they have or on a later day.
    expect(electionNightLocationKey(world, personId)).toBeNull();
    expect(electionNightLocationKey(spoken, personId)).toBe(
      ELECTION_NIGHT_LOCATION_KEY,
    );
    expect(
      placeForLocationKey(spoken, personId, ELECTION_NIGHT_LOCATION_KEY),
    ).toBe("election-night-venue");
    expect(
      electionNightLocationKey(passOrdinaryDays(spoken), personId),
    ).toBeNull();
  }, 300_000);
});
