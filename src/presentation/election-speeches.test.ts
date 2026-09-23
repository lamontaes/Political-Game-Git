import { describe, expect, it } from "vitest";

import {
  addDays,
  candidacyPackForJurisdiction,
  CONCESSION_EVENT,
  electionContestResult,
  VICTORY_SPEECH_EVENT,
} from "../simulation";
import { createExplicitGeographyLife } from "./new-game-geography";
import {
  fileForOffice,
  giveElectionSpeech,
  projectCampaign,
} from "./campaign-projection";
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
    // Giving it twice says nothing new.
    expect(giveElectionSpeech(spoken, personId)).toBe(spoken);
  }, 300_000);
});
