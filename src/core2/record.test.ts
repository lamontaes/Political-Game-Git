/**
 * M4-06 (golden path step 11): the record follows you.
 *
 * In a random place an incumbent made a promise in a real speech, then cast a
 * vote that broke it. At the next election that record changes specific
 * voters' choices, each with its reason on their ballot, and the rival's
 * attack ad draws on it (and only on it).
 *
 * The council vote is written through `recordVote` directly: an edge-case
 * fixture until councils on core2 (golden path step 6) cast votes themselves.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI, registerModule } from "./state";
import {
  openRecord,
  recordVote,
  voteRecordId,
  votesOf,
} from "./modules/record";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { searchCorePlaces } from "./place-lookup";
import { setKeepEveryonesWhy } from "./why-kept";
import { scenario, seed, states, pick, START } from "./record-test-kit";

describe("M4-06 the record follows you", () => {
  // A voter's reasons are saved for the player's circle only (Keep it simple,
  // Oct 11; the test switch of Oct 25). This case reads the record reasons on
  // the ballots of voters nobody in the player's circle deals with, so it asks
  // for everyone's, and puts the setting back for the next case.
  let keptBefore = false;
  beforeAll(() => {
    keptBefore = setKeepEveryonesWhy(true);
  });
  afterAll(() => {
    setKeepEveryonesWhy(keptBefore);
  });

  it("an incumbent's broken promise changes specific voters' choices, with reasons, and feeds the rival's attack ad", () => {
    // Whether the record flips anyone depends on how close the race is for the
    // voters who weigh it, which no place guarantees: draw places (bounded)
    // until one has a weighed voter whose margin is smaller than the record's
    // swing, then that record must change a choice there.
    const tried: string[] = [];
    for (let draw = 0; draw < 6; draw += 1) {
      const result = scenario(draw);
      if (result.skipped) {
        tried.push(`${result.where}: ${result.skipped}`);
        continue;
      }
      if (result.flippable === 0) {
        tried.push(
          `${result.where}: ${result.weighed} weighed, none close enough`,
        );
        continue;
      }
      expect(result.changed, result.where).toBeGreaterThan(0);
      return;
    }
    throw new Error(
      `No race close enough for the record to matter: ${tried.join("; ")}`,
    );
    // Each draw builds and plays a world, so the search carries a limit for
    // its draws, not the 30-second default.
  }, 300_000);
});

describe("a vote by a member who isn't a full person", () => {
  // Regression (wire-all-modules, Oct 12): with Congress voting in the played
  // world, each of its members' votes became its own story in the town and
  // every resident heard hundreds a session, slowing the year tenfold. The
  // roll call's own story carries the count; the vote stays on the record.
  it("is on the record but is not its own event", () => {
    const state = pick(states, "outsider:state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "outsider:place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 20,
      }),
    );
    openRecord(core);
    const heard: string[] = [];
    registerModule(core, {
      id: "probe-vote-recorded",
      eventKinds: ["vote-recorded"],
      onEvent: (_api, event) => void heard.push(event.id),
    });
    const api = coreAPI(core);
    const resident = [...core.people.keys()].sort()[0]!;
    const outsider = "official:congress:seat:US-AK:us-house:00";
    for (const personId of [resident, outsider])
      recordVote(api, {
        personId,
        body: "office:test",
        billId: "bill:test:2026-001",
        measureId: "2026-001",
        stance: { question: PLATFORM_QUESTIONS[0]!, position: 1 },
        passed: null,
      });
    const where = `seed ${seed}, ${state} place ${key}`;
    expect(votesOf(api, outsider).length, where).toBe(1);
    expect(votesOf(api, resident).length, where).toBe(1);
    expect(heard, where).toEqual([
      `vote-recorded:${voteRecordId("bill:test:2026-001", PLATFORM_QUESTIONS[0]!, resident)}`,
    ]);
  });
});
