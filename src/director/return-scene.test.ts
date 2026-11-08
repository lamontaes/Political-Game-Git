import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { composeScene } from "./scene";

// A homecoming stages the `return` scene from the justice engine's release
// record (Lives, Nov 8, 2026). Terms run past a year, so a release is rare in
// a played year; the record here is written as the justice engine writes it
// (kind, shape and facts of `justice.released`), once for the player coming
// home and once for a housemate coming home to the player.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);

describe("a release stages the return scene", () => {
  it("stages return for the one released and for the family waiting", () => {
    for (const mode of ["released", "waiting"] as const) {
      const place = drawPlace(`${seed}:${mode}`, "return-scene");
      const where = `${place.name} (${place.key}), seed ${seed}:${mode}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const api = coreAPI(core);
      const player = core.people.get(playerId!)!;
      if (!director.ledger.people.has(playerId!))
        director.watch(core, playerId!);
      const other = (core.households.get(player.householdId)?.memberIds ?? [])
        .map((id) => core.people.get(id as PersonId)!)
        .find((row) => row.id !== player.id && row.alive);
      if (!other) continue;
      const releasedId = mode === "released" ? player.id : other.id;
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      api.emit({
        id: `justice.released:custody:${releasedId}:${core.date}`,
        date: core.date,
        kind: "justice.released",
        personIds: [releasedId],
        witnessIds: mode === "waiting" ? [player.id] : [],
        placeId: player.placeId,
        publicRecord: true,
        news: true,
        facts: { sentenceId: "sentence:test" },
        source: {
          tag: "SOURCED",
          citation: "Release at the end of the prison term the court set.",
          asOf: core.date,
        },
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const book = director.ledger.people.get(playerId!)!;
      const entry = book.schedule.find(
        (row) =>
          row.momentId.includes("justice.released") &&
          row.bindings.some((bound) => bound.typeKey === "return"),
      );
      expect(entry, `${where}: release stages no return`).toBeTruthy();
      expect(composeScene(core, director, playerId!, entry!)).toBeTruthy();
    }
  }, 300_000);
});
