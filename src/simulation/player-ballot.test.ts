import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  playerBallotScene,
  savePlayerBallotChoice,
} from "../presentation/player-ballot";
import {
  countRecordedVoterBallots,
  type RecordedVoterCountInput,
} from "./election-contests";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { isEligibleVoterIn } from "./issue-record";
import { deserializeWorld, serializeWorldPayload } from "./serialization";
import type { World } from "./types";

const seed = "session-110-player-ballot";
const place = drawRandomPlace(seed);
function setup() {
  const fixture = smallWorld({ place: place.key, seed, people: 6 });
  let world = fixture.world;
  const voters = world.personOrder.filter((id) =>
    isEligibleVoterIn(world, id, fixture.jurisdictionId, world.currentDate),
  );
  const personId = voters[0]!;
  world = { ...world, control: { kind: "person", personId } };
  const candidatePersonIds = voters.slice(-2);
  expect(candidatePersonIds).toHaveLength(2);
  for (const voterId of voters.filter((id) => id !== candidatePersonIds[0]))
    world = recordPrivateBelief(world, {
      stableKey: `ballot-view:${voterId}`,
      personId: voterId,
      propositionId: null,
      subject: { kind: "official", personId: candidatePersonIds[0]! },
      formedAt: world.currentDate,
      position: "support",
      conviction: "strong",
      salience: "central",
      flexibility: "firm",
      rationale: "The voter supports this candidate's recorded position.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
  const ballot: RecordedVoterCountInput = {
    stableKey: "player-ballot:contest",
    jurisdictionId: fixture.jurisdictionId,
    electionDate: world.currentDate,
    candidatePersonIds,
  };
  return { world, personId, ballot };
}
function ownBallot(world: World, input: ReturnType<typeof setup>) {
  const result = countRecordedVoterBallots(world, input.ballot);
  expect(result).not.toBeNull();
  return {
    result: result!,
    vote: result!.recordedBallots.find(
      (row) => row.personId === input.personId,
    )!,
  };
}
describe("the player's choice joins the one recorded voter count", () => {
  it("counts the saved candidate choice even when the player's view favors another", () => {
    const input = setup();
    expect(
      playerBallotScene(input.world, input.ballot)?.choices.map(
        (row) => row.key,
      ),
    ).toEqual([...input.ballot.candidatePersonIds, "abstain"]);
    const world = savePlayerBallotChoice(
      input.world,
      input.ballot,
      input.ballot.candidatePersonIds[1]!,
    );
    const reloaded = deserializeWorld(serializeWorldPayload(world));
    const { result, vote } = ownBallot(reloaded, input);
    expect(vote.optionKey).toBe(input.ballot.candidatePersonIds[1]);
    expect(vote.choiceEventId).toBe(world.history.events.at(-1)!.id);
    expect(
      result.tallies.find((row) => row.candidatePersonId === vote.optionKey)
        ?.votes,
    ).toBe(1);
  });
  it("uses the existing decision for an unsaved player", () => {
    const input = setup();
    expect(ownBallot(input.world, input).vote).toMatchObject({
      optionKey: input.ballot.candidatePersonIds[0],
      choiceEventId: null,
    });
  });
  it("counts explicit abstention without assigning a candidate vote", () => {
    const input = setup();
    const world = savePlayerBallotChoice(input.world, input.ballot, "abstain");
    const reloaded = deserializeWorld(serializeWorldPayload(world));
    const { result, vote } = ownBallot(reloaded, input);
    expect(vote.optionKey).toBe("abstain");
    expect(result.abstentions).toBe(1);
    expect(result.tallies.reduce((sum, row) => sum + row.votes, 0)).toBe(
      result.recordedBallots.filter(
        (row) => row.optionKey !== null && row.optionKey !== "abstain",
      ).length,
    );
  });
  it("keeps another contest's answer out and revalidates offered choices", () => {
    const input = setup();
    const world = savePlayerBallotChoice(
      input.world,
      { ...input.ballot, stableKey: "other-contest" },
      "abstain",
    );
    expect(ownBallot(world, input).vote.choiceEventId).toBeNull();
    expect(() =>
      savePlayerBallotChoice(world, input.ballot, "unknown-candidate"),
    ).toThrow("unavailable");
  });
  it("has exactly one recorded voter counting function", () => {
    const source = readFileSync(
      new URL("./election-contests.ts", import.meta.url),
      "utf8",
    );
    expect(
      source.match(/export function countRecordedVoterBallots\(/g),
    ).toHaveLength(1);
  });
});
