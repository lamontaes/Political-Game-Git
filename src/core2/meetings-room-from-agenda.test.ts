/**
 * A meeting's room comes from its own causes (lift-the-pins family 30c): the
 * comment period holds the speakers the meeting's length gives each item on
 * its agenda, and a town hall holds everyone whose own drive beats the
 * evening's cost. Played in places drawn from all 56 until a body has a bill
 * waiting; each place and seed is named.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  agendaOf,
  LEGISLATURE_MODULE_ID,
  sittingDayHours,
  type BillRow,
} from "./modules/legislature";
import {
  commentRoom,
  holdTownHall,
  meetingParameter,
  townHallDrives,
} from "./modules/meetings";
import { coreAPI } from "./state";

const PLACES = 4;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the comment room is the meeting's hours over the podium time, shared by the agenda, and the town hall holds everyone driven", () => {
  const seen: string[] = [];
  const was = setBookkeeping(false);
  try {
    for (let n = 0; n < PLACES; n++) {
      const place = drawPlace(
        createHash("sha256").update(`${base}:${n}`).digest("hex"),
        "meetings-room-from-agenda",
      );
      const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const bills = () =>
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .rows() as unknown as BillRow[];
      let date = makeIsoDate(core.date);
      const end = addDays(date, 150);
      let bill: BillRow | undefined;
      while (date < end && !bill) {
        date = addDays(date, 1);
        advanceCore(core, date);
        bill = bills().find((b) => b.status === "drafted");
      }
      if (!bill) {
        seen.push(`${where}: no bill waited in 150 days`);
        continue;
      }
      const agenda = agendaOf(api, bill.bodyOfficeId).length;
      expect(
        agenda,
        `${where}: the bill is on its body's agenda`,
      ).toBeGreaterThan(0);
      expect(commentRoom(api, bill), where).toBe(
        Math.floor(
          sittingDayHours(api, bill.bodyOfficeId) /
            meetingParameter("publicCommentHours") /
            agenda,
        ),
      );
      // A town hall seats everyone whose drive beats the evening's cost.
      const host = [...core.people.values()].find(
        (p) => p.alive && p.id !== core.playerId && p.tier !== "husk",
      )!;
      const driven = townHallDrives(api, host.id).length;
      const hall = holdTownHall(api, { hostId: host.id });
      expect(hall.attendeeIds.length, where).toBe(driven);
      seen.push(
        `${where}: ${agenda} on the agenda, room ${commentRoom(api, bill)}, hall of ${hall.attendeeIds.length}`,
      );
    }
    process.stdout.write(`meetings-room-from-agenda\n${seen.join("\n")}\n`);
    expect(
      seen.filter((s) => !s.includes("no bill waited")).length,
      seen.join("; "),
    ).toBeGreaterThan(0);
  } finally {
    setBookkeeping(was);
  }
}, 900_000);
