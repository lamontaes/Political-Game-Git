import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./modules/offices";
import { winningPersonId } from "./modules/voting";
import { drawPlace } from "../../scripts/core2-year/place";

it("resolves term aliases without rewriting real official person ids", () => {
  const seed = process.env.OFFICE_RECORD_SEED ?? randomBytes(8).toString("hex");
  const place = drawPlace(seed, "office-records");
  console.log({ seed, place });
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  for (const { seat } of townSeats(api)) {
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[];
    for (const term of terms) {
      const resolved = winningPersonId(api, `official:${term.id}`);
      expect(core.people.has(resolved)).toBe(true);
      expect(winningPersonId(api, resolved)).toBe(resolved);
      if (term.personId) expect(resolved).toBe(term.personId);
    }
  }
}, 120_000);
