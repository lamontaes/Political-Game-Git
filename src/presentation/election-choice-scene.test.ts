import { describe, expect, it } from "vitest";

import { addDays } from "../simulation/dates";
import { createFutureTransitionHandlerRegistry } from "../simulation/future-transitions";
import { createDemoWorld } from "../simulation/demo";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  electionContestResult,
  electionContestTransitionHandler,
  recordPlayerElectionChoice,
  scheduleElectionContest,
} from "../simulation/election-contests";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { drawRandomPlace } from "../../tests/support/random-place";
import { advanceWorld } from "../simulation/world";
import { playerElectionChoiceSceneRow } from "./election-choice-scene";

describe("player election choice scene row", () => {
  it("offers named candidates and abstention, reflecting the saved choice", () => {
    let world = createDemoWorld("election-choice-scene-seed");
    const candidate1 = world.personOrder[0]!;
    const candidate2 = world.personOrder[1]!;
    const voterPersonId = world.personOrder[2]!;
    const jurisdictionId = world.jurisdictionOrder[0]!;
    world = { ...world, control: { kind: "person", personId: voterPersonId } };
    world = scheduleElectionContest(world, {
      stableKey: "scene-choice:mayor",
      jurisdictionId,
      office: {
        officeKey: "mayor",
        title: "Mayor",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate: addDays(world.currentDate, 10),
      candidatePersonIds: [candidate1, candidate2],
      provenance: { method: "authored", sourceEntityIds: [], note: null },
    });
    const contest = world.history.electionContests!.at(-1)!;
    world = recordPlayerElectionChoice(world, {
      contestId: contest.id,
      selectedOptionKey: candidate2,
    });

    expect(playerElectionChoiceSceneRow(world)).toEqual({
      kind: "election-choice",
      stableKey: `scene-choice:mayor:player-choice-scene:${voterPersonId}`,
      contestId: contest.id,
      actorPersonId: voterPersonId,
      prompt: "Who do you want to vote for as Mayor?",
      options: [
        { optionKey: candidate1, label: expect.any(String) },
        { optionKey: candidate2, label: expect.any(String) },
        { optionKey: "abstain", label: "Abstain" },
      ],
      selectedOptionKey: candidate2,
    });
  });

  it("counts a saved choice in a fresh game at a seeded random place", () => {
    const seed = "session46-player-vote-random-place";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
      startAge: 30,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    let world = game.world;
    const voterPersonId = game.playerPersonId;
    const jurisdictionId = world.people[voterPersonId]!.homeJurisdictionId;
    const candidatePersonId = world.personOrder.find(
      (personId) => personId !== voterPersonId,
    );
    if (!candidatePersonId)
      throw new Error("The generated place has no ballot candidate.");
    world = { ...world, control: { kind: "person", personId: voterPersonId } };
    const electionDate = addDays(world.currentDate, 3);
    world = scheduleElectionContest(world, {
      stableKey: "fresh-game-player-vote:local",
      jurisdictionId,
      office: {
        officeKey: "local-council",
        title: "Town Council",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate,
      candidatePersonIds: [candidatePersonId],
      provenance: { method: "simulated", sourceEntityIds: [], note: null },
    });
    const contest = world.history.electionContests!.at(-1)!;
    world = recordPlayerElectionChoice(world, {
      contestId: contest.id,
      selectedOptionKey: candidatePersonId,
    });
    const row = playerElectionChoiceSceneRow(world)!;
    expect(row.contestId).toBe(contest.id);
    expect(row.options.map((option) => option.optionKey)).toEqual([
      candidatePersonId,
      "abstain",
    ]);

    const registry = createFutureTransitionHandlerRegistry([
      [ELECTION_CONTEST_TRANSITION_KEY, electionContestTransitionHandler],
    ]);
    world = advanceWorld(world, 3, registry);
    const result = electionContestResult(world, contest.id);
    expect(result?.ballots).toContainEqual({
      voterPersonId,
      selectedOptionKey: candidatePersonId,
      source: "player-choice",
    });
    expect(result?.tallies[0]?.votes).toBeGreaterThan(0);
    console.info(
      JSON.stringify({
        proof: "Session 46 player vote",
        place: place.key,
        seed,
        worldId: game.world.id,
        playerPersonId: voterPersonId,
        contestId: contest.id,
        choice: candidatePersonId,
        ballot: result?.ballots?.find(
          (ballot) => ballot.voterPersonId === voterPersonId,
        ),
        tally: result?.tallies,
      }),
    );
  });
});
