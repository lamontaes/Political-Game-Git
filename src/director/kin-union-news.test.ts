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
import { SITUATION_LIBRARY } from "./scheduling";

// A relative far away marries or splits and the player hears of it (owner,
// Nov 1: "EVERY. LIFE. IS. SIMULATED."; the Nov 8 lives rulings): the
// partnerships engine writes `family.partnered` and `family.separated` for
// people living elsewhere, with their relatives in the played town as
// witnesses, and the director's news-arrives scene tells it at home. A world
// is drawn from all 56 places on a seed the builder did not choose; a relative
// of the player who lives in another household has their union written by the
// engine's own writer, and the scene must stand on that record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);

describe("a relative's marriage or split is news at home", () => {
  it("stages the news-arrives scene from the engine's own union record", () => {
    const place = drawPlace(`${seed}:0`, "kin-union-news");
    const where = `${place.name} (${place.key}), seed ${seed}:0`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const api = coreAPI(core);
    const player = core.people.get(playerId!)!;
    if (!director.ledger.people.has(playerId!)) director.watch(core, playerId!);
    // A living relative of the player who is not in the player's household.
    const relative = [...player.familyIds]
      .map((id) => core.people.get(id as PersonId))
      .find(
        (row) =>
          row?.alive &&
          row.householdId !== player.householdId &&
          row.id !== playerId,
      );
    expect(
      relative,
      `${where}: the player has no relative elsewhere`,
    ).toBeTruthy();
    const partner = [...core.people.values()].find(
      (row) =>
        row.alive &&
        row.id !== relative!.id &&
        row.householdId !== relative!.householdId &&
        row.id !== playerId,
    )!;
    for (const together of [true, false]) {
      // The same scene with the same people is not staged again inside the repeat window.
      if (!together)
        advanceCore(
          core,
          addDays(
            makeIsoDate(core.date),
            SITUATION_LIBRARY.scheduling.repeatDays + 1,
          ),
        );
      api.setPartnersV1({
        personIds: [relative!.id, partner.id],
        together,
        source: {
          tag: "SOURCED",
          asOf: core.date,
          citation: "A relative's union, written by the partnerships writer.",
        },
        witnessIds: [playerId!],
        ...(together ? { facts: { union: "married" } } : {}),
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const kind = together ? "family.partnered" : "family.separated";
      const event = [...core.durableLog.values()].find(
        (row) => row.kind === kind && row.personIds.includes(relative!.id),
      );
      expect(event, `${where}: no ${kind}`).toBeTruthy();
      const book = director.ledger.people.get(playerId!)!;
      const entry = book.schedule.find((row) =>
        row.momentId.includes(event!.id),
      );
      process.stdout.write(
        `EVENT ${kind} persons=${event!.personIds.length} witnesses=${(event!.witnessIds ?? []).length} moment=${director.ledger.people.get(playerId!)!.momentsById.get(entry!.momentId)?.label}\n`,
      );
      expect(entry, `${where}: no moment for ${kind}`).toBeTruthy();
      expect(
        entry!.bindings.some((row) => row.typeKey === "news-arrives"),
        `${where}: ${kind} is not the news-arrives scene (${entry!.bindings.map((row) => row.typeKey).join(", ") || "no types"}, ${entry!.outcome})`,
      ).toBe(true);
      const scene = composeScene(core, director, playerId!, entry!);
      expect(scene, `${where}: ${kind} does not compose`).toBeTruthy();
      process.stdout.write(
        `KIN UNION ${where} ${kind}: ${JSON.stringify(scene!.narration.map((row) => row.text)).slice(0, 500)}\n`,
      );
    }
  }, 300_000);
});
