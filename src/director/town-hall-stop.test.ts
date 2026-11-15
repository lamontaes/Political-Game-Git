import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { members } from "../core2/modules/legislature";
import {
  adjourn,
  meetingInProgress,
  releaseHold,
  takeUpItem,
} from "../core2/modules/office-day";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A member who hosted a town hall is stopped for the resident's question the
// day it is held, as a player is for a floor debate (Words lead, Nov 14: the
// stop belongs to the host). Roy, Montana, seed meet-a1:1: the town board's
// first halls are late January and February. The played file for the second reader lists the
// replies; here the stop, its cause, and that no reply is an unmarked lie.
it("Roy, Montana (meet-a1:1): the host is stopped for the resident's question", () => {
  setBookkeeping(false);
  const place = drawPlace("meet-a1:1", "meetings-floor");
  expect(place.name).toBe("Roy, Montana");
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const town = core.people.get(core.playerId!)?.placeId;
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as TermRow[];
  const host = terms
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
    )[0]?.personId as PersonId;
  expect(host, "a sitting member who is a full person").toBeTruthy();
  core.focusPersonIds.add(host);
  director.watch(core, host);
  const book = director.ledger.people.get(host)!;
  const stopped: string[] = [];
  let packet = advancePlayerV1(core, {
    controlledPersonId: host,
    through: { date: addDays(makeIsoDate(core.date), 40), minuteOfDay: P.zero },
  });
  while (packet.kind !== "complete") {
    if (packet.kind === "stop") {
      for (const stop of packet.stop.modules) {
        const entry = book.schedule.find(
          (row) => row.momentId === stop.recordId,
        );
        if (
          !entry?.bindings.some((row) => row.typeKey === "town-hall-question")
        )
          continue;
        const result = purposeScene(core, director, host, entry, {
          typeKey: "town-hall-question",
        });
        expect(result?.kind, `${core.date}`).toBe("composed");
        if (result?.kind !== "composed") continue;
        const { scene } = result;
        expect(core.durableLog.get(scene.cause.id)?.kind).toBe("town-hall");
        const moves = scene.talk.tree.replies.map((row) => row.line.move);
        expect(moves.length, "the host has something to say").toBeGreaterThan(
          1,
        );
        expect(moves, "no unmarked lie among the replies").not.toContain("lie");
        stopped.push(`${core.date}: ${scene.askerId}`);
      }
      const meeting = meetingInProgress(api);
      if (meeting) {
        for (const billId of meeting.agenda.filter(
          (id) => !meeting.takenUp.includes(id),
        ))
          takeUpItem(api, meeting.id, billId, "own");
        adjourn(api, meeting.id);
      }
      for (const stop of packet.stop.modules)
        if (stop.hold) releaseHold(api, stop.recordId);
      packet = resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
    } else
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: packet.offers[P.zero]!.offerId,
      });
  }
  expect(stopped.length, "the town hall stopped the day").toBeGreaterThan(0);
}, 150_000);
