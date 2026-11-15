/**
 * Voter registration is a record (pool item elections-voter-registration-
 * record). Pinned to three named places and fixed seeds, one for each way a
 * state treats a person who moved or never registered:
 *
 * - Sherrodsville, Ohio (key 3972242): no automatic and no same-day
 *   registration, so a person not on the rolls on election day is turned away.
 * - Adell, Wisconsin (key 5500450): same-day registration, so they register
 *   at the polls and vote.
 * - North Hyde Park, Vermont (key 5050725): automatic registration, so a move
 *   registers the person at the new address the day it is seen.
 *
 * Each world opens already in motion (the survey's share off the rolls), a
 * household's precinct is kept when other households arrive, and the day keeps
 * a record of who registered at the polls or was turned away.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { cpsRegistered } from "../electorate-places";
import { addressKeyOf } from "../electorate-registration";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { automaticRegistrationInForce } from "../law-reach/group-a-voting";
import { coreAPI } from "../state";
import type { CoreAPI, CoreState, PersonState } from "../types";
import { ELECTIONS_MODULE_ID, ballot } from "./elections";
import {
  VOTING_MODULE_ID,
  castBallot,
  pollingPlaceOf,
  pollingStatus,
  registerToVote,
  registeredShareOfRoll,
  reviewVoterRegistrations,
} from "./voting";

setBookkeeping(false);

interface Registration {
  readonly personId: string;
  readonly registered: boolean;
  readonly addressKey: string | null;
  readonly since: string;
  readonly how: string;
  readonly staleSince: string | null;
}
interface PollDay {
  readonly id: string;
  readonly date: string;
  readonly personId?: string;
  readonly outcome?: string;
}

const rowsOf = <T>(api: CoreAPI, table: string) =>
  api.moduleState(VOTING_MODULE_ID).table(table).rows() as unknown as T[];
const townPlaceIdOf = (api: CoreAPI) =>
  (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("town")
      .get("town") as unknown as {
      townPlaceId: string;
    }
  ).townPlaceId;
const registrationOf = (api: CoreAPI, personId: string) =>
  api
    .moduleState(VOTING_MODULE_ID)
    .table("registrations")
    .get(`registration:${personId}`) as unknown as Registration | undefined;

/** The first election day the town's own races hold after the world opens, from the contests' own dates. */
function nextTownElection(api: CoreAPI): string {
  const dates = (
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
    .sort();
  return dates[0]!;
}

/** Adults who can leave their household without leaving a child alone, each to a household of their own. */
function leavers(api: CoreAPI, count: number): PersonState[] {
  const core = api.state as CoreState;
  const adultAge = api.parameter("votingAge");
  const out: PersonState[] = [];
  for (const person of [...core.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (out.length >= count) break;
    if (!person.alive || person.id === core.playerId) continue;
    if (person.placeId !== townPlaceIdOf(api)) continue;
    const members = core.households.get(person.householdId)?.memberIds ?? [];
    const others = members
      .filter((id) => id !== person.id)
      .map((id) => core.people.get(id)!);
    const grown = (p: PersonState) =>
      core.date.slice(0, 4) > p.birthDate.slice(0, 4) &&
      Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >=
        adultAge;
    if (!grown(person) || !others.length || !others.some(grown)) continue;
    // Nobody else in the household has already left it for a household of their own.
    if (out.some((o) => o.householdId === person.householdId)) continue;
    out.push(person);
  }
  return out;
}

function worldAt(key: string, seed: string) {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  return { core, api: coreAPI(core) };
}

function moveOut(api: CoreAPI, movers: readonly PersonState[]) {
  movers.forEach((person, i) =>
    api.changeHouseholdV1({
      personIds: [person.id],
      householdId: `${person.householdId}:registration-test-${i}`,
      source: {
        tag: "ESTIMATED",
        citation: "A test's staged move",
        asOf: api.state.date,
        estimatedFrom: "voter-registration.test.ts",
      },
    }),
  );
}

// Why two of these run long: the time is the game's own played days. Sherrodsville
// plays 289 days (the world opens 2025-01-20, the town's election is 2025-11-04,
// staged moves land 10 days before it) and Adell plays 443 days (the election is
// 2026-04-07); a world builds in about 7 s. North Hyde Park is a small place that
// plays 71 days. The player tests play the same days: Adell's 443, Sherrodsville's
// 224 (to 60 days before its election). The limits are near twice the measured time.
describe("voter registration (pinned places, fixed seeds)", () => {
  it("Sherrodsville OH, seed reg-pin-oh: the world opens in motion, a mover is at the old address and is turned away at the polls", () => {
    const where = "Sherrodsville, Ohio (3972242), seed reg-pin-oh";
    const { core, api } = worldAt("3972242", "reg-pin-oh");
    expect(automaticRegistrationInForce(api), where).toBe(false);
    // In motion: some named adults are off the rolls, and the town's share on them is near the survey's.
    const rows = rowsOf<Registration>(api, "registrations");
    expect(rows.length, where).toBeGreaterThan(20);
    expect(
      rows.some((r) => !r.registered),
      `${where}: someone is not registered`,
    ).toBe(true);
    const survey = cpsRegistered("OH")!;
    const share = registeredShareOfRoll(api);
    expect(
      Math.abs(share - survey),
      `${where}: ${share} against ${survey}`,
    ).toBeLessThan(0.08);
    // A precinct is kept: another household's arrival moves nobody's.
    const homes = [
      ...new Set(
        [...core.people.values()]
          .filter((p) => p.placeId === townPlaceIdOf(api))
          .map((p) => p.householdId),
      ),
    ].slice(0, 25);
    const precinctsOf = () =>
      Object.fromEntries(
        rowsOf<{ householdId: string; precinct: number }>(
          api,
          "householdPrecincts",
        ).map((r) => [r.householdId, r.precinct]),
      );
    const before = precinctsOf();
    expect(
      Object.keys(before).length,
      `${where}: precincts assigned`,
    ).toBeGreaterThan(0);

    // Ten days before the town's election, twenty adults move out to homes of their own.
    const election = nextTownElection(api);
    advanceCore(core, addDays(makeIsoDate(election), -10));
    const movers = leavers(api, 20);
    expect(movers.length, where).toBeGreaterThan(5);
    const oldKeys = new Map(movers.map((p) => [p.id, addressKeyOf(api, p)]));
    moveOut(api, movers);
    reviewVoterRegistrations(api);
    for (const mover of movers) {
      const row = registrationOf(api, mover.id)!;
      const now = core.people.get(mover.id)!;
      expect(addressKeyOf(api, now), `${where}: ${mover.id}`).not.toBe(
        oldKeys.get(mover.id),
      );
      // Still registered, at the address they left, until their wait ends.
      if (row.registered)
        expect(row.addressKey, `${where}: ${mover.id}`).not.toBe(
          addressKeyOf(api, now),
        );
    }
    advanceCore(core, addDays(makeIsoDate(election), 1));
    const day = rowsOf<PollDay>(api, "pollDays").filter(
      (r) => r.date === election && r.personId,
    );
    const turned = day.filter((r) => r.outcome === "not-on-the-list");
    expect(
      turned.length,
      `${where}: turned away on ${election}`,
    ).toBeGreaterThan(0);
    // Everyone turned away is someone who moved lately or never registered, by record.
    for (const row of turned) {
      const reg = registrationOf(api, row.personId!)!;
      const moved = movers.some((m) => m.id === row.personId);
      expect(moved || !reg.registered || reg.staleSince !== null, row.id).toBe(
        true,
      );
    }
    // And the household precincts of everyone who did not move are as they were.
    const after = precinctsOf();
    for (const home of homes)
      if (before[home] !== undefined)
        expect(after[home], `${where}: ${home}`).toBe(before[home]);
    // Reading a polling place adds no record of its own.
    const sizeBefore = rowsOf(api, "householdPrecincts").length;
    pollingPlaceOf(api, movers[0]!.id, election);
    expect(rowsOf(api, "householdPrecincts").length).toBe(sizeBefore);
  }, 100_000);

  it("Adell WI, seed reg-pin-wi: a mover not on the rolls registers at the polls and votes, and the day keeps it", () => {
    const where = "Adell, Wisconsin (5500450), seed reg-pin-wi";
    const { core, api } = worldAt("5500450", "reg-pin-wi");
    const election = nextTownElection(api);
    advanceCore(core, addDays(makeIsoDate(election), -10));
    const movers = leavers(api, 40);
    expect(movers.length, where).toBeGreaterThan(5);
    moveOut(api, movers);
    advanceCore(core, addDays(makeIsoDate(election), 1));
    const day = rowsOf<PollDay>(api, "pollDays").filter(
      (r) => r.date === election && r.personId,
    );
    expect(
      day.filter((r) => r.outcome === "not-on-the-list").length,
      `${where}: same-day registration turns nobody away`,
    ).toBe(0);
    const registered = day.filter((r) => r.outcome === "registers-at-polls");
    expect(
      registered.length,
      `${where}: registered at the polls on ${election}`,
    ).toBeGreaterThan(0);
    for (const row of registered) {
      const reg = registrationOf(api, row.personId!)!;
      expect(reg.how, row.id).toBe("at-the-polls");
      expect(reg.since, row.id).toBe(election);
      expect(reg.registered, row.id).toBe(true);
    }
  }, 225_000);

  it("North Hyde Park VT, seed reg-pin-vt: a move registers the person at the new address when it is seen, in a state with automatic registration", () => {
    const where = "North Hyde Park, Vermont (5050725), seed reg-pin-vt";
    const { core, api } = worldAt("5050725", "reg-pin-vt");
    expect(automaticRegistrationInForce(api), where).toBe(true);
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const movers = leavers(api, 10).filter((p) => registrationOf(api, p.id));
    expect(movers.length, where).toBeGreaterThan(3);
    moveOut(api, movers);
    advanceCore(core, addDays(makeIsoDate(core.date), 31));
    for (const mover of movers) {
      const row = registrationOf(api, mover.id)!;
      const now = core.people.get(mover.id)!;
      expect(row.registered, `${where}: ${mover.id}`).toBe(true);
      expect(row.addressKey, `${where}: ${mover.id}`).toBe(
        addressKeyOf(api, now),
      );
      expect(row.how, `${where}: ${mover.id}`).toBe("automatic");
    }
  }, 40_000);

  it("Adell WI, seed reg-pin-wi: the player who moved is told the day will register them, marks a ballot, and registers at the polls", () => {
    const where = "Adell, Wisconsin (5500450), seed reg-pin-wi";
    const { core, api } = worldAt("5500450", "reg-pin-wi");
    const player = core.people.get(core.playerId!)!;
    const election = nextTownElection(api);
    advanceCore(core, addDays(makeIsoDate(election), -10));
    moveOut(api, [player]);
    reviewVoterRegistrations(api);
    // The one read: a same-day state registers a person off the rolls at the polls.
    const standing = pollingStatus(api, player.id, election);
    expect(standing, where).toBe("same-day");
    const contest = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as { id: string; electionDate: string }[]
    ).find(
      (c) =>
        c.electionDate === election &&
        c.id.startsWith("contest:seat:gus") &&
        ballot(api, c.id).length > 0,
    )!;
    castBallot(
      api,
      player.id,
      contest.id,
      ballot(api, contest.id)[0]!.personId,
    );
    advanceCore(core, addDays(makeIsoDate(election), 1));
    const ballotRow = api
      .moduleState(VOTING_MODULE_ID)
      .table("ballots")
      .get(`ballot:${contest.id}:${player.id}`) as unknown as {
      voted: boolean;
    };
    expect(ballotRow.voted, where).toBe(true);
    {
      const day = rowsOf<PollDay>(api, "pollDays").find(
        (r) => r.date === election && r.personId === player.id,
      );
      expect(day?.outcome, where).toBe("registers-at-polls");
      expect(registrationOf(api, player.id)?.how, where).toBe("at-the-polls");
    }
  }, 225_000);

  it("Sherrodsville OH, seed reg-pin-oh: the player who moved sees they are not on the list, registers by their own act, and is on it", () => {
    const where = "Sherrodsville, Ohio (3972242), seed reg-pin-oh";
    const { core, api } = worldAt("3972242", "reg-pin-oh");
    const player = core.people.get(core.playerId!)!;
    const election = nextTownElection(api);
    // A month before the election, early enough to register by the deadline.
    advanceCore(core, addDays(makeIsoDate(election), -60));
    moveOut(api, [player]);
    reviewVoterRegistrations(api);
    const before = pollingStatus(api, player.id, election);
    expect(["old-address", "not-registered"], where).toContain(before);
    expect(registerToVote(api, player.id), where).toBe(true);
    expect(pollingStatus(api, player.id, election), where).toBe("on");
    const row = registrationOf(api, player.id)!;
    expect(row.how, where).toBe("by-the-player");
    // Registering again changes nothing: they are on the rolls at this address.
    expect(registerToVote(api, player.id), where).toBe(false);
    // The registration act is the same record every named voter's rule reads.
    expect(
      rowsOf<Registration>(api, "registrations").filter(
        (r) => r.personId === player.id,
      ),
    ).toHaveLength(1);
  }, 70_000);
});
