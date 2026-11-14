import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  billOf,
  LEGISLATURE_MODULE_ID,
  members,
  votesOn,
} from "../core2/modules/legislature";
import {
  adjourn,
  deskWaiting,
  leaveDeskToCharacter,
  meetingInProgress,
  meetingOf,
  releaseHold,
  takeUpItem,
} from "../core2/modules/office-day";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

// A seated member of a town board hears the floor before the roll, on the
// meeting's own day or the days of its notice, never after the vote
// (Words lead, Nov 14: the scene goes before the roll). The speaker's packet
// holds what the bill is about, one reason a speaker may say aloud, and the
// size of the body, so a small board is not worded like a chamber. Three named
// places, one fixed seed each, played for the first weeks of a year.
const PLACES = [
  { seed: "meet-a1:0", name: "Delta City, Mississippi" },
  { seed: "meet-a1:1", name: "Roy, Montana" },
  { seed: "meet-a1:2", name: "Klamath Falls, Oregon" },
] as const;
const DAYS = 20;

function localMember(core: CoreState): PersonId | null {
  const api = coreAPI(core);
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

describe("the floor is heard before the roll at a town board", () => {
  for (const { seed, name } of PLACES)
    it(`${name} (${seed})`, () => {
      setBookkeeping(false);
      const place = drawPlace(seed, "meetings-floor");
      expect(place.name).toBe(name);
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const personId = localMember(core);
      expect(personId, "a sitting member who is a full person").toBeTruthy();
      core.focusPersonIds.add(personId!);
      director.watch(core, personId!);
      const book = director.ledger.people.get(personId!)!;
      const heard: string[] = [];
      let pressed = false;
      let packet = advancePlayerV1(core, {
        controlledPersonId: personId!,
        through: {
          date: addDays(makeIsoDate(core.date), DAYS),
          minuteOfDay: P.zero,
        },
      });
      while (packet.kind !== "complete") {
        if (packet.kind === "stop") {
          for (const stop of packet.stop.modules) {
            const entry = book.schedule.find(
              (row) => row.momentId === stop.recordId,
            );
            if (!entry?.bindings.some((row) => row.typeKey === "floor-debate"))
              continue;
            const result = purposeScene(core, director, personId!, entry, {
              typeKey: "floor-debate",
            });
            if (result?.kind !== "composed") continue;
            const { scene } = result;
            const cause = core.durableLog.get(scene.cause.id)!;
            const billId = String(cause.facts!.billId);
            const bill = billOf(api, billId)!;
            const here = `${name}: ${billId}`;
            // Before the roll: the bill still waits on the floor, and nobody has voted it.
            expect(bill.status, here).toBe("drafted");
            expect(votesOn(api, billId), here).toHaveLength(0);
            // The meeting it is for has not met yet today or is still ahead.
            const meeting = meetingOf(
              api,
              `meeting:${cause.facts!.chamber}:${bill.floorDate ?? core.date}`,
            );
            if (meeting) expect(meeting.status, here).toBe("scheduled");
            const keys = scene.facts.map((row) => row.key);
            const reasons = keys.filter((key) => key.startsWith("reason-"));
            expect(reasons, `${here}: exactly one public reason`).toHaveLength(
              1,
            );
            expect([
              "reason-own-view",
              "reason-people",
              "reason-own-bill",
            ]).toContain(reasons[0]);
            // Never a deal or a lobby aloud.
            expect(keys.join(" "), here).not.toMatch(/deal|lobby|trait/);
            expect(keys.includes("speaker-wrote-it"), here).toBe(
              bill.sponsorId === scene.askerId,
            );
            const seats = members(api, String(cause.facts!.chamber)).length;
            // One register, from the body's own row: a state or federal chamber is formal.
            const registers = keys.filter((key) => key.startsWith("body-"));
            expect(registers, `${here}: one register`).toHaveLength(1);
            expect(registers[0], here).toBe(
              seats <= 7 ? "body-small" : "body-council",
            );
            const section = bill.provisions[0];
            if (section?.kind === "policy-question")
              expect(keys, `${here}: what the bill is about`).toContain(
                "issue",
              );
            // The player holds their ground against a speaker who presses: the
            // reply record keeps a strained tie, which the tie and the Journal read.
            if (!pressed) {
              const first = scene.talk.tree.replies.findIndex(
                (row) => row.line.move === "disagree",
              );
              const next = scene.talk.tree.replies[first]?.next;
              const second = next?.replies.findIndex(
                (row) => row.line.move === "disagree",
              );
              if (first >= 0 && second !== undefined && second >= 0) {
                const replyId = replyInScene(
                  core,
                  director,
                  personId!,
                  entry,
                  [first, second],
                  { typeKey: "floor-debate" },
                );
                const reply = core.durableLog.get(replyId!);
                expect(reply?.facts?.ending, here).toBe("held-against");
                expect(reply?.facts?.keeps, here).toBe("relationship-strained");
                pressed = true;
              }
            }
            heard.push(`${here} on ${core.date}`);
          }
          const meeting = meetingInProgress(api);
          if (meeting) {
            for (const billId of meeting.agenda.filter(
              (id) => !meeting.takenUp.includes(id),
            ))
              takeUpItem(api, meeting.id, billId, "own");
            adjourn(api, meeting.id);
          }
          for (const bill of deskWaiting(api, true))
            leaveDeskToCharacter(api, bill.id);
          for (const stop of packet.stop.modules)
            if (stop.hold) releaseHold(api, stop.recordId);
          const before = packet.pauseId;
          packet = resumePlayerV1(core, { kind: "stop", pauseId: before });
          expect(
            packet.kind === "stop" && packet.pauseId === before,
            "a stop that did not clear",
          ).toBe(false);
        } else
          packet = resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[P.zero]!.offerId,
          });
      }
      expect(core.modules.has(LEGISLATURE_MODULE_ID)).toBe(true);
      expect(pressed, `${name}: a reply pressed on the floor`).toBe(true);
      expect(
        heard,
        `${name}: a floor debate heard before a roll`,
      ).not.toHaveLength(0);
    }, 240_000);
});
