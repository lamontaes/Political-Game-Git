import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { RECORD_MODULE_ID } from "../core2/modules/record";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { governmentBodies, RECENT_VOTES } from "./government-bodies";

// The Government screen lists a body's past measures from the record: every measure the body has
// voted this term, newest first, up to a page, not a hand-typed few. A place drawn from all 56 on
// a seed nobody chose; the record's own count of measures voted is the reference.
const seed =
  process.env.GOV_VOTES_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the Government screen's past measures (seed ${seed})`, () => {
  it("lists as many measures as the body's record holds, up to a page", () => {
    const tried: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "gov-votes");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      let date = world.core.date;
      for (let day = 0; day < 365; day += 1) {
        date = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
          .toISOString()
          .slice(0, 10);
        advanceCore(world.core, date);
      }
      const api = coreAPI(world.core);
      const seat = townSeats(api).find(
        (s) =>
          ["council", "township-board", "county-board"].includes(
            s.office.kind,
          ) && s.holder?.personId,
      );
      if (!seat) {
        tried.push(`${draw.name}: no local body`);
        continue;
      }
      const rows = api
        .moduleState(RECORD_MODULE_ID)
        .table("votes")
        .rows() as unknown as { body: string; billId: string }[];
      const voted = new Set(
        rows.filter((r) => r.body === seat.office.id).map((r) => r.billId),
      ).size;
      if (voted <= 3) {
        tried.push(`${draw.name}: only ${voted} measure(s) voted`);
        continue;
      }
      const view = governmentBodies(
        world.core,
        seat.holder!.personId!,
        "local",
        "",
      );
      const body = view.legislative.find((b) => b.officeId === seat.office.id);
      expect(body, draw.name).toBeTruthy();
      const shown = body!.recentVotes.length;
      // Some recorded measures have no title to show (a measure the policy names do not cover).
      expect(shown, draw.name).toBeGreaterThan(3);
      expect(shown, draw.name).toBeLessThanOrEqual(
        Math.min(voted, RECENT_VOTES),
      );
      console.log(
        `gov votes: ${draw.name} (${draw.key}, seed ${draw.seed}) ${seat.office.id} voted ${voted} measures, screen lists ${shown}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a body with more than three measures voted (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
