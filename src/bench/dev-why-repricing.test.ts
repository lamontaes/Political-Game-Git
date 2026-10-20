/**
 * Dev mode's why panel for a credit line's repricing, in a generated world
 * (places drawn from all 56 on a seed nobody chose; DEV_WHY_REPRICING_SEED
 * pins one): the rate history comes from the macro engine's own rows and
 * names the central bank meeting behind each change.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { findRecord } from "./dev-trace";
import { whyPanels } from "./dev-why";
import { buildBenchWorld } from "./world";

const seed =
  process.env.DEV_WHY_REPRICING_SEED ?? randomBytes(8).toString("hex");
const maxPlaces = 8;

interface Repricing {
  id: string;
  facilityId: string;
  borrowerId: string;
  date: string;
  meetingId: string;
  fromRate: number;
  toRate: number;
}

describe("the why panel of a credit line's repricing", () => {
  it("lists the line's rate changes, each with the meeting behind it", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let i = 0; i < maxPlaces; i += 1) {
      const place = drawPlace(i ? `${seed}:${i}` : seed, "dev-why-repricing");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const api = coreAPI(core);
      const rows = api
        .moduleState("macro")
        .table("repricings")
        .rows() as unknown as Repricing[];
      const row = rows[0];
      if (!row) {
        tried.push(`${where}: no credit line was repriced in a year`);
        continue;
      }
      const [panel] = whyPanels(core, row.id, findRecord(core, row.id));
      const mine = rows
        .filter((r) => r.facilityId === row.facilityId)
        .sort((a, b) => a.date.localeCompare(b.date));
      expect(panel, where).toBeDefined();
      expect(panel!.rows.length, where).toBe(mine.length);
      expect(
        panel!.rows.map((r) => r.id),
        where,
      ).toEqual(mine.map((r) => r.meetingId));
      expect(
        panel!.rows.map((r) => r.label),
        where,
      ).toEqual(mine.map((r) => r.date));
      for (const r of panel!.rows)
        expect(
          api.moduleState("macro").table("meetings").get(r.id!),
          `${r.id} in ${where}`,
        ).toBeDefined();
      return;
    }
    throw new Error(
      `No drawn place repriced a credit line (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
