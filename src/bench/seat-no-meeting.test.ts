/**
 * A member of a body with no regular meeting (a federal chamber votes on its
 * floor calendar) can draft a bill: it stays drafted with no agenda date
 * instead of stopping the game. A random place from all 56.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { upcomingMeeting } from "../core2/modules/office-day";
import {
  OFFICES_MODULE_ID,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import { seatAct, seatView } from "./legislature";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("drafts a bill in a body that has no regular meeting", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "seat-no-meeting");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    tried.push(`${place.name} (${place.key})`);
    const terms = (seatId: string) =>
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[];
    for (const { seat } of townSeats(api)) {
      const holder = terms(seat.id)[0]?.personId;
      if (!holder || !world.core.people.has(holder)) continue;
      const seatBody = seatView(world.core, holder).bodies.find(
        (body) => !upcomingMeeting(api, body.officeId),
      );
      if (!seatBody) continue;
      const question = seatView(world.core, holder).questions[0];
      if (!question) continue;
      const bill = seatAct(world.core, holder, {
        kind: "draft",
        officeId: seatBody.officeId,
        question,
        value: 1,
      }) as { status: string; agendaDate?: string };
      if (bill.status !== "drafted") continue;
      expect(
        bill.agendaDate,
        `${place.name}, seed ${seed}:${draw}`,
      ).toBeUndefined();
      return;
    }
  }
  throw new Error(
    `No member of a body without a meeting could draft: ${tried.join("; ")}`,
  );
}, 3_600_000);
