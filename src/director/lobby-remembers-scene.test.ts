import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  INTEREST_GROUPS_MODULE_ID,
  type LobbyMeeting,
} from "../core2/modules/interest-groups";
import { LEGISLATURE_MODULE_ID, members } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// A group's lobbyist who made the group's case to a member remembers how the
// member voted (owner, Nov 8: "subtle and open threats"). A sitting member of
// a body is played through ten days in a drawn place as the bench plays it.
// The interest-group engine's lobbying meeting and the legislature's vote
// record are the two records the scene reads; the test writes them by hand
// (a played year in one town seldom holds a lobbied vote the member went
// against), so it proves the edge, not how often it comes: a vote against a
// group's way brings its lobbyist two days later, and a vote with the group's
// way brings no one.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;

function localMember(core: CoreState): PersonId | null {
  const api = coreAPI(core);
  if (!core.modules.has(OFFICES_MODULE_ID)) return null;
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return null;
  const town = core.people.get(core.playerId!)?.placeId;
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as TermRow[];
  const local = terms
    .filter((term) => {
      const person = core.people.get(term.personId as PersonId);
      return (
        person?.alive === true &&
        person.placeId === town &&
        members(api, term.officeId).length > 1
      );
    })
    .sort(
      (a, b) =>
        a.officeId.localeCompare(b.officeId) || a.id.localeCompare(b.id),
    );
  return (local[0]?.personId as PersonId | undefined) ?? null;
}

it(`a vote against a lobbying group's way brings its lobbyist, a vote with it brings no one (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "lobby-remembers");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const memberId = localMember(core);
    if (!memberId || !core.modules.has(INTEREST_GROUPS_MODULE_ID)) {
      tried.push(`${where}: no sitting member or no interest groups`);
      continue;
    }
    const api = coreAPI(core);
    const member = core.people.get(memberId)!;
    const lobbyistId = [...core.people.values()]
      .filter(
        (person) =>
          person.alive &&
          person.id !== memberId &&
          person.placeId === member.placeId &&
          person.birthDate <= "2000-01-01",
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]?.id;
    if (!lobbyistId) {
      tried.push(`${where}: no one to lobby`);
      continue;
    }
    const meetings = api
      .moduleState(INTEREST_GROUPS_MODULE_ID)
      .table("meetings");
    // Two bills the group lobbied the member on: it wanted one passed (+1) and
    // one defeated (-1). The member voted yes on both: against the second.
    for (const [billId, number, side] of [
      ["bill-test-for", "H.B. 101", P.one],
      ["bill-test-against", "H.B. 202", P.negativeOne],
    ] as const) {
      meetings.put({
        id: `lobby:group-test:${billId}:${memberId}`,
        groupId: "group-test",
        billId,
        memberId,
        lobbyistId,
        date: core.date,
        annualCostMinor: P.zero,
        share: P.one,
        side,
      } satisfies LobbyMeeting as never);
      api.emit({
        id: `office.voted:${billId}:${memberId}`,
        date: core.date,
        kind: "office.voted",
        personIds: [memberId],
        placeId: member.placeId,
        source: {
          tag: "SOURCED",
          citation: `Vote on ${number}`,
          asOf: core.date,
        },
        publicRecord: true,
        facts: { billId, number, vote: "yes" },
      });
    }
    core.focusPersonIds.add(memberId);
    director.watch(core, memberId);
    const book = director.ledger.people.get(memberId)!;
    const seen: { billId: string; text: string; asker: string }[] = [];
    let packet = advancePlayerV1(core, {
      controlledPersonId: memberId,
      through: {
        date: addDays(makeIsoDate(core.date), 10),
        minuteOfDay: P.zero,
      },
    });
    while (packet.kind !== "complete") {
      if (packet.kind === "stop") {
        for (const stop of packet.stop.modules) {
          const entry = book.schedule.find(
            (row) => row.momentId === stop.recordId,
          );
          const moment = book.momentsById.get(stop.recordId);
          if (
            !entry ||
            !moment ||
            !entry.bindings.some((row) => row.typeKey === "lobby-remembers")
          )
            continue;
          const result = purposeScene(core, director, memberId, entry, {
            typeKey: "lobby-remembers",
          });
          if (result?.kind !== "composed") continue;
          const { scene } = result;
          const here = `${where}: ${moment.causeId}`;
          expect(scene.purpose, here).toBe("lobby-remembers");
          expect(scene.askerId, here).toBe(lobbyistId);
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expectUpToFourDifferent(root, here);
          for (const row of root)
            expect(["tell", "comfort", "refuse", "deflect"], here).toContain(
              row.move,
            );
          for (const row of [scene.talk.state, ...root])
            expect(row.text, here).not.toMatch(
              /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
            );
          seen.push({
            billId: moment.causeId.split(":")[1]!,
            text: scene.talk.state.text,
            asker: scene.askerId,
          });
        }
        packet = resumePlayerV1(core, {
          kind: "stop",
          pauseId: packet.pauseId,
        });
      } else
        packet = resumePlayerV1(core, {
          kind: "choice",
          pauseId: packet.pauseId,
          offerId: packet.offers[P.zero]!.offerId,
        });
    }
    // Only the vote against the group's way (the bill it wanted defeated) brings the lobbyist.
    if (!seen.length) {
      tried.push(`${where}: no lobby-remembers scene in ten days`);
      continue;
    }
    expect(
      seen.map((row) => row.billId),
      where,
    ).toEqual(["bill-test-against"]);
    process.stdout.write(`LOBBY REMEMBERS ${where}\n  ${seen[0]!.text}\n`);
    return;
  }
  throw new Error(`no lobby scene: ${tried.join("; ")} (seed ${seed})`);
}, 3_600_000);
