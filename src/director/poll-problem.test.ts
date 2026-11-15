/**
 * Trouble at the polling place (items scene-trouble-at-the-polling-place and
 * words-run-poll-problem-lines-are-composed), pinned to two named places and
 * fixed seeds, one for each way a state treats a voter not on the rolls:
 *
 * - Adell, Wisconsin (key 5500450, seed reg-pin-wi): same-day registration. The
 *   poll worker offers the table; nothing is registered until the player presses
 *   "register me here"; then the ballot opens and the day keeps it.
 * - Sherrodsville, Ohio (key 3972242, seed reg-pin-oh): no same-day
 *   registration. The worker refuses the ballot, the player's reply ends the
 *   visit, and the voting engine keeps the refusal with its reason.
 *
 * Why these run long: the time is the game's own played days (the world opens
 * 2025-01-20; Adell's election is 2026-04-07 and Sherrodsville's is 2025-11-04).
 * The limits are near twice the measured time.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import {
  VOTING_MODULE_ID,
  pollingStatus,
  reviewVoterRegistrations,
} from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { CoreAPI } from "../core2/types";
import { composeJournal } from "./journal";
import { pollProblemTalk, sayAtPolls } from "./poll-problem";
import { markBallot, stagedPollingVisit } from "./polling-place";

setBookkeeping(false);

interface PollDay {
  readonly date: string;
  readonly personId?: string;
  readonly outcome?: string;
  readonly why?: string;
}
const rowsOf = <T>(api: CoreAPI, table: string) =>
  api.moduleState(VOTING_MODULE_ID).table(table).rows() as unknown as T[];

/** The first election day the town's own races hold after the world opens. */
function nextTownElection(api: CoreAPI): string {
  return (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as { id: string; electionDate: string }[]
  )
    .filter(
      (c) =>
        c.id.startsWith("contest:seat:gus") && c.electionDate > api.state.date,
    )
    .map((c) => c.electionDate)
    .sort()[0]!;
}

/** The player at the polls the day of the election, moved out of the household ten days before so the rolls do not hold them. */
function playerAtThePolls(key: string, seed: string) {
  const world = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const player = core.people.get(core.playerId!)!;
  const election = nextTownElection(api);
  // The director watches the player, as the game does, so the eve stages the polls.
  director.watch(core, player.id);
  advanceCore(core, addDays(makeIsoDate(election), -10));
  api.changeHouseholdV1({
    personIds: [player.id],
    householdId: `${player.householdId}:poll-problem-test`,
    source: {
      tag: "ESTIMATED",
      citation: "A test's staged move",
      asOf: api.state.date,
      estimatedFrom: "poll-problem.test.ts",
    },
  });
  reviewVoterRegistrations(api);
  advanceCore(core, addDays(makeIsoDate(election), -1));
  const visit = stagedPollingVisit(
    core,
    director.ledger,
    player.id,
    makeIsoDate(election),
  )!;
  return { core, api, director, player, election, visit };
}

describe("trouble at the polling place (pinned places, fixed seeds)", () => {
  it("Adell WI, seed reg-pin-wi: the worker offers the table, nothing is registered until the player presses, and then they vote", () => {
    const where = "Adell, Wisconsin (5500450), seed reg-pin-wi";
    const { core, api, director, player, election, visit } = playerAtThePolls(
      "5500450",
      "reg-pin-wi",
    );
    expect(visit, `${where}: the polls are staged`).toBeTruthy();
    expect(visit.standing, where).toBe("same-day");
    const talk = pollProblemTalk(core, visit)!;
    expect(talk, `${where}: the worker has a scene`).toBeTruthy();
    expect(talk.lines.length, where).toBeGreaterThan(1);
    // Nothing registered for the player without their press: they are still off the rolls.
    expect(pollingStatus(api, player.id, election), where).toBe("same-day");
    expect(() =>
      markBallot(core, director.ledger, visit, visit.contests[0]!.id, null),
    ).toThrow(/Register at the polling place/);
    // The reply that asks to be registered is the player's own press.
    const accept = talk.choices.find((choice) => choice.move === "accept");
    expect(accept, `${where}: a reply asks to be registered`).toBeTruthy();
    const done = sayAtPolls(core, director.ledger, visit, accept!.index);
    expect(done.ending, where).toBe("registered");
    // Traced: the reply and the day's row resolve by their record ids.
    const replyId = `scene-reply:polling-place:${visit.record.id}:${accept!.index}`;
    expect(
      resolveSavedTraceV1(core, replyId).status,
      `${where}: ${replyId} traces`,
    ).not.toBe("record-not-found");
    expect(pollingStatus(api, player.id, election), where).toBe("on");
    const day = rowsOf<PollDay>(api, "pollDays").find(
      (row) => row.date === election && row.personId === player.id,
    );
    expect(day?.outcome, where).toBe("registers-at-polls");
    // And the ballot is theirs to mark.
    const fresh = stagedPollingVisit(
      core,
      director.ledger,
      player.id,
      makeIsoDate(election),
    )!;
    expect(fresh.standing, where).toBe("on");
    markBallot(core, director.ledger, fresh, fresh.contests[0]!.id, null);
    // The Journal tells it, citing the day's own row, once the day has come.
    advanceCore(core, addDays(makeIsoDate(election), 1));
    const told = composeJournal(core, director, player.id).flatMap(
      (chapter) => chapter.lines,
    );
    expect(
      told.find(
        (line) =>
          line.text === "I registered at the polls and voted." &&
          line.sourceRecordIds.includes(`poll-day:${election}:${player.id}`),
      ),
      `${where}: the Journal line`,
    ).toBeTruthy();
  }, 225_000);

  it("Sherrodsville OH, seed reg-pin-oh: the worker refuses the ballot and the refusal is kept with its reason", () => {
    const where = "Sherrodsville, Ohio (3972242), seed reg-pin-oh";
    const { core, api, director, player, election, visit } = playerAtThePolls(
      "3972242",
      "reg-pin-oh",
    );
    expect(visit, `${where}: the polls are staged`).toBeTruthy();
    expect(["old-address", "not-registered"], where).toContain(visit.standing);
    const talk = pollProblemTalk(core, visit)!;
    expect(talk, `${where}: the worker has a scene`).toBeTruthy();
    // No reply registers them here: this state does not register at the polls.
    expect(
      talk.choices.some((choice) => choice.move === "accept"),
      where,
    ).toBe(false);
    const leave = talk.choices.find((choice) => choice.move === "leave");
    expect(leave, `${where}: a reply leaves`).toBeTruthy();
    const done = sayAtPolls(core, director.ledger, visit, leave!.index);
    expect(done.ending, where).toBeTruthy();
    const day = rowsOf<PollDay>(api, "pollDays").find(
      (row) => row.date === election && row.personId === player.id,
    );
    expect(day?.outcome, where).toBe("not-on-the-list");
    expect(day?.why, where).toBe(visit.standing);
    expect(
      director.ledger.pollingVisits.get(visit.record.id)?.status,
      where,
    ).toBe("turned-away");
    advanceCore(core, addDays(makeIsoDate(election), 1));
    const told = composeJournal(core, director, player.id).flatMap(
      (chapter) => chapter.lines,
    );
    expect(
      told.find(
        (line) =>
          /I did not vote\.$/.test(line.text) &&
          line.sourceRecordIds.includes(`poll-day:${election}:${player.id}`),
      ),
      `${where}: the Journal line, among ${JSON.stringify(told.slice(-4).map((line) => [line.text, line.sourceRecordIds]))}`,
    ).toBeTruthy();
  }, 150_000);
});
