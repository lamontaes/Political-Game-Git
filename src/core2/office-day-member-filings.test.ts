/**
 * Ordinances other members file reach the player's meeting (pool item
 * office-stopgap-office-day-timing): when the player sits on a town's
 * lawmaking body and holds the clock, the members' filings are put on the
 * meeting's agenda the day before and wait, still undecided, at the player's
 * stop; the player takes them up (or leaves them to the character) and they
 * are voted then, not at midnight before the stop. A place is drawn from all
 * 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { billOf, bodyOf } from "./modules/legislature";
import {
  adjourn,
  meetingInProgress,
  setStops,
  takeUpItem,
} from "./modules/office-day";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("a member's ordinance waits on the agenda at the player's stop and is voted when taken up", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "member-filings");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    tried.push(where);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const seat = townSeats(api).find(
      (s) =>
        s.holder?.personId &&
        (s.office.kind === "council" ||
          s.office.kind === "county-board" ||
          s.office.kind === "township-board") &&
        bodyOf(api, s.office.id),
    );
    if (!seat?.holder?.personId) continue;
    const me = seat.holder.personId;
    const player = new BenchPlayer(world.core, world.director);
    player.select(me);
    setStops(api, me, { "every-meeting": true });
    let waited = 0;
    for (let guard = 0; guard < 500 && waited < 3; guard += 1) {
      if (player.pollingPlace) player.leavePolls();
      const packet =
        player.packet?.kind === "stop"
          ? player.packet
          : player.advance(
              "calendar",
              addDays(
                makeIsoDate(player.packet?.at.date ?? world.core.date),
                7,
              ),
            ).packet;
      if (packet.kind === "complete") continue;
      if (packet.kind !== "stop") continue;
      const meeting = meetingInProgress(api);
      if (meeting) {
        const others = meeting.agenda.filter(
          (id) => billOf(api, id).sponsorId !== me,
        );
        for (const id of others) {
          // Filed by another member, and still undecided at the stop.
          expect(billOf(api, id).status, `${where}: ${id}`).toBe("drafted");
          waited += 1;
        }
        for (const id of meeting.agenda) takeUpItem(api, meeting.id, id, "own");
        adjourn(api, meeting.id);
        for (const id of others)
          expect(billOf(api, id).status, `${where}: ${id} voted`).not.toBe(
            "drafted",
          );
      }
      player.resume({
        kind: "stop",
        pauseId: (packet as { pauseId: string }).pauseId,
      });
    }
    console.log(
      `member-filings ${where}: ${waited} member filings met at the stop`,
    );
    if (waited > 0) return;
  }
  throw new Error(
    `no member filing reached a player's meeting; ${tried.join("; ")}`,
  );
}, 3_600_000);
