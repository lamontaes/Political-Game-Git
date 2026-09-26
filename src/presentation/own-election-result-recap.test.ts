import { describe, expect, it } from "vitest";

import {
  addDays,
  deserializeWorld,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { electiveOfficesForJurisdiction } from "../simulation/candidacy";
import { campaignUntilDecided } from "../../tests/fixtures/campaign-fixture";
import { fileForOffice, projectCampaign } from "./campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { requireLocalityInState } from "./new-game-geography";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { projectJournalView } from "./journal-views";
import { composeConnectiveNarration } from "./life-narration";
import { projectLifeRecord } from "./life-record";
import { projectStoryMoment } from "./life-story";
import { projectWorld39News } from "./world39-news";
import { projectWorldRecap } from "./world-recap";

/**
 * The player's own race, decided, reaches the player.
 *
 * Owner's playtests, 2026-09-23: a San Antonio council race and a Eufaula,
 * Alabama mayoral race were decided and nothing said so. The recap after the
 * election listed only withdrawn city proposals, because the result's own
 * record names the player and the recap left out everything the player took
 * part in. The afterword under the result also called a man "them".
 */
function raceIn(
  state: string,
  town: string,
  seed: string,
  office: (officeKey: string, title: string) => boolean,
) {
  const home = requireLocalityInState(state, town);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      placeKey: home.key,
      household: "lives-alone",
      gender: "male",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const seat = electiveOfficesForJurisdiction(
    game.world.people[personId]!.homeJurisdictionId,
  ).find((option) => office(option.officeKey, option.office.title))!;
  expect(seat).toBeDefined();
  const filed = fileForOffice(
    game.world,
    personId,
    null,
    seat.officeKey,
    addDays(game.world.currentDate, 21),
  );
  return { world: filed, personId };
}

const mayoralRaceInEufaula = (seed: string) =>
  raceIn("US-AL", "Eufaula", seed, (_key, title) => title === "Mayor");

const councilRaceInSanAntonio = (seed: string) =>
  raceIn("US-TX", "San Antonio", seed, (key) => key.endsWith("governing-body"));

/** Ordinary days, one at a time, until the race is decided. */
function liveUntilDecided(world: World, personId: EntityId): World {
  let next = world;
  for (
    let day = 0;
    day < 40 && projectCampaign(next, personId).phase === "active";
    day += 1
  ) {
    next = passOrdinaryDays(next);
  }
  return deserializeWorld(serializeWorld(next));
}

describe("the player's own election result", () => {
  it("leads the recap after a race the player did no work in, and the afterword says him", () => {
    const { world, personId } = mayoralRaceInEufaula("eufaula-result-loss");
    // The frontier as it stood when the player last caught up: filing day.
    const frontier = world.history.nextSequence;
    const decided = liveUntilDecided(world, personId);
    const view = projectCampaign(decided, personId);
    expect(view.phase).toBe("lost");

    const recap = projectWorldRecap(decided, personId, frontier)!;
    expect(recap).not.toBeNull();
    const first = recap.entries[0]!;
    expect(first.ownResult).toBe(true);
    expect(first.headline).toMatch(
      /^You lost the race for Mayor, \d+\.\d% to \d+\.\d%\.$/,
    );
    const result = decided.history.electionContestResults!.find(
      (record) => record.outcomeEventId === first.eventId,
    )!;
    expect(result.winnerPersonId).not.toBe(personId);
    // The winner is there to open, and the player is not listed as a stranger.
    expect(first.people.map((person) => person.personId)).toContain(
      result.winnerPersonId,
    );
    expect(first.people.map((person) => person.personId)).not.toContain(
      personId,
    );

    // A recap read from after the result no longer carries it.
    const caughtUp = projectWorldRecap(
      decided,
      personId,
      recap.throughSequence,
    );
    expect(caughtUp?.entries.some((entry) => entry.ownResult) ?? false).toBe(
      false,
    );

    // The loss is stated without the stock consolation that used to follow.
    expect(view.afterword).toMatch(/lost, \d+(\.\d)?% to \d+(\.\d)?%\.$/);
    expect(view.afterword).not.toMatch(/not the end of/);
    expect(view.afterword).not.toMatch(/\bthem\b/);
  }, 600_000);

  it("reports a win the same way, in his pronouns", () => {
    const { world, personId } = mayoralRaceInEufaula("eufaula-result-win");
    const frontier = world.history.nextSequence;
    const decided = campaignUntilDecided(world, personId, 40);
    const view = projectCampaign(decided, personId);
    // This seed's afternoons of work carry the race.
    expect(view.phase).toBe("won");
    const recap = projectWorldRecap(decided, personId, frontier)!;
    const first = recap.entries[0]!;
    expect(first.ownResult).toBe(true);
    expect(first.headline).toMatch(
      /^You won the race for Mayor, \d+\.\d% to \d+\.\d%\.$/,
    );
    expect(view.afterword).not.toMatch(/\b(them|theirs)\b/);
    if (/term begins/.test(view.afterword!)) {
      expect(view.afterword).toMatch(/until then the office is not his\./);
    }
  }, 600_000);

  it("reaches the moment, the journal and the news in San Antonio, from the recorded result", () => {
    const { world, personId } = councilRaceInSanAntonio("san-antonio-council");
    const filedOn = world.currentDate;
    const decided = liveUntilDecided(world, personId);
    const view = projectCampaign(decided, personId);
    expect(view.phase).toBe("lost");
    const contest = decided.history.electionContests!.find((candidate) =>
      candidate.candidatePersonIds.includes(personId),
    )!;
    const result = decided.history.electionContestResults!.find(
      (record) => record.contestId === contest.id,
    )!;
    const own = result.tallies.find(
      (tally) => tally.candidatePersonId === personId,
    )!;
    const best = result.tallies.find(
      (tally) => tally.candidatePersonId === result.winnerPersonId,
    )!;
    const sentence = `You lost the race for ${contest.office.title}, ${(own.voteShare * 100).toFixed(1)}% to ${(best.voteShare * 100).toFixed(1)}%.`;

    // The moment: the next thing the life says leads with the result.
    const moment = projectStoryMoment(decided, personId);
    expect(moment.connective.sentences).toContain(sentence);
    const bridged = composeConnectiveNarration({
      world: decided,
      personId,
      since: filedOn,
    });
    expect(bridged.opening).toBe(false);
    const index = bridged.sentences.indexOf(sentence);
    expect(index).toBeGreaterThan(-1);
    expect(
      bridged.sources.find((source) => source.sentenceIndex === index),
    ).toMatchObject({
      kind: "civic",
      anchors: [{ store: "events", recordId: result.outcomeEventId }],
    });

    // The journal's chronicle and its record both keep it.
    const journal = projectJournalView(decided, personId, "chapters", null);
    expect(
      journal.sections.some((section) =>
        section.entries.some((entry) => entry.text === sentence),
      ),
    ).toBe(true);
    expect(
      projectLifeRecord(decided, personId).chapters.some((chapter) =>
        chapter.entries.some(
          (entry) =>
            entry.sentence === sentence &&
            entry.anchors[0]!.recordId === result.outcomeEventId,
        ),
      ),
    ).toBe(true);

    // The news around town carries the recorded result the day after.
    expect(
      projectWorld39News(decided, personId).publicEvents.some(
        (event) => event.id === result.outcomeEventId,
      ),
    ).toBe(true);

    // A week on, the result is no longer what a fresh moment opens with, but
    // the journal still has it.
    const later = passOrdinaryDays(decided, 8);
    expect(
      projectStoryMoment(later, personId).connective.sentences,
    ).not.toContain(sentence);
    expect(
      projectLifeRecord(later, personId).chapters.some((chapter) =>
        chapter.entries.some((entry) => entry.sentence === sentence),
      ),
    ).toBe(true);
  }, 600_000);
});
