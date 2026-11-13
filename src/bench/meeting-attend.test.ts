/**
 * The screens' side of a resident at a meeting (pool item
 * meetings-resident-player-speaks-at-public-comment): the Calendar's meeting
 * entry says the meeting can be attended once its agenda is posted, the mark
 * shows on it, the meeting panel tells a resident from a member (no vote, no
 * adjournment), speaking goes through the panel's own route, and leaving lets
 * the day go on. A place is drawn from all 56; set GOLDEN_PATH_SEED to
 * reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { remarksOn } from "../core2/modules/meetings";
import { coreAPI, type CoreState } from "../core2/state";
import { calendarItems } from "./calendar";
import {
  leaveHoldsToCharacter,
  meetingAdjourn,
  meetingAttend,
  meetingItem,
  meetingSceneView,
  meetingSpeak,
} from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

function step(player: BenchPlayer) {
  if (player.pollingPlace) player.leavePolls();
  const packet = player.packet;
  if (packet?.kind === "stop")
    player.resume({ kind: "stop", pauseId: packet.pauseId });
  else if (packet?.kind === "choice")
    player.resume({ kind: "own-choice", pauseId: packet.pauseId });
  else player.advance("day");
}

it("the Calendar offers a posted meeting, the panel lets a resident speak and leave, and nothing else", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "meeting-attend-screens");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as CoreState;
    const api = coreAPI(core);
    const me = core.playerId!;
    const player = new BenchPlayer(core, world.director);
    player.select(me);
    player.advance("day");
    const end = new Date(
      Date.parse(`${core.date}T00:00:00Z`) + 150 * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    const offered = () =>
      calendarItems(core, me).filter((item) => item.kind === "meeting");
    let sawOffer = false;
    let emptyRooms = 0;
    let done = false;
    for (let guard = 0; guard < 2_000 && core.date < end && !done; guard += 1) {
      for (const item of offered()) {
        if (!item.attend || item.attend.marked) continue;
        sawOffer = true;
        meetingAttend(core, item.attend.officeId, item.attend.date, true);
        // The same entry now shows the mark, and pressing again takes it back.
        const marked = offered().find(
          (other) => other.recordIds[0] === item.attend!.officeId,
        );
        expect(marked?.attend?.marked, `${where}: marked`).toBe(true);
        // The plan is said in words, with the hour as people say it.
        expect(marked?.attend?.plan, `${where}: the plan`).toMatch(
          /\d (a|p)\.m\./,
        );
        expect(item.attend.plan, `${where}: no plan before the mark`).toBeNull();
        meetingAttend(core, item.attend.officeId, item.attend.date, false);
        expect(
          offered().find(
            (other) => other.recordIds[0] === item.attend!.officeId,
          )?.attend?.marked,
          `${where}: taken back`,
        ).toBe(false);
        meetingAttend(core, item.attend.officeId, item.attend.date, true);
      }
      step(player);
      const minute = player.packet?.at.minuteOfDay ?? 18 * 60;
      const stopped =
        player.packet?.kind === "stop" &&
        (
          player.packet as { stop?: { modules?: { reasonKey: string }[] } }
        ).stop?.modules?.some((m) => m.reasonKey === "office-day.meeting");
      const scene = stopped ? meetingSceneView(core, me, minute) : null;
      if (!scene) continue;
      // One line under the title for a resident: an empty agenda, or, only at
      // the first meeting they come to, what they can do here.
      const items = scene.items.length;
      if (!items || emptyRooms === 0)
        expect(scene.note, `${where}: the resident's line`).toMatch(
          items ? /speak for or against/ : /\S/,
        );
      else expect(scene.note, `${where}: said once`).toBeNull();
      // In the room, not at the table.
      expect(scene.seated, `${where}: not seated`).toBe(false);
      expect(
        scene.members.some((m: { you?: boolean }) => m.you),
        `${where}: no member is the player`,
      ).toBe(false);
      const item = scene.items.find((row) => !row.takenUp);
      if (!item) {
        emptyRooms += 1;
        meetingAdjourn(core, scene.id);
        continue;
      }
      meetingSpeak(core, scene.id, item.billId, "against");
      const after = meetingSceneView(core, me, minute)!;
      expect(
        after.items
          .find((row) => row.billId === item.billId)
          ?.remarks.some(
            (r: { position: number; name: string }) =>
              r.position < 0 && r.name.length > 0,
          ),
        `${where}: listed among those who spoke against`,
      ).toBe(true);
      expect(
        remarksOn(api, item.billId).some(
          (r) => r.personId === me && r.signedUp && r.position === -1,
        ),
        `${where}: one remark on the record`,
      ).toBe(true);
      // A resident has no vote here.
      expect(() => meetingItem(core, scene.id, item.billId, "yes")).toThrow();
      // The panel's one closing control is their leaving.
      meetingAdjourn(core, scene.id);
      expect(
        meetingSceneView(core, me, minute)?.id,
        `${where}: left the room`,
      ).not.toBe(scene.id);
      // Whatever else holds the clock that day is left the same way, and the day goes on.
      const day = core.date;
      for (let more = 0; more < 20 && core.date <= day; more += 1) {
        leaveHoldsToCharacter(core, me);
        step(player);
      }
      expect(core.date > day, `${where}: the day went on`).toBe(true);
      done = true;
    }
    if (done) {
      console.log(
        `meeting-attend-screens ${where}: spoke against an item and left; ${emptyRooms} earlier meetings had no item`,
      );
      return;
    }
    tried.push(
      `${where}: offered ${sawOffer}, ${emptyRooms} meetings with no item`,
    );
  }
  throw new Error(`no meeting with an item was reached; ${tried.join("; ")}`);
}, 3_600_000);
