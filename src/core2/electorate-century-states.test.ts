/**
 * Day one's governors and statewide officers are the century's (owner, Nov 17, 2026, CTO line
 * 6935086070 on #9747: "Day one is whatever that history produced: who holds every office"). Each
 * partisan statewide office is elected in its own cycle from 1925 on the one path with play.
 * Every world is a drawn place (skill drawn-place-tests); each assertion names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { partySide } from "./appointments";
import { setBookkeeping } from "./bookkeeping";
import { centuryOf } from "./electorate-century";
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

const RUN = `history-states:${Date.now()}`;

describe("the century elects day one's governors and statewide officers", () => {
  it("seats the century's statewide officers in the town's state, with their careers, at two drawn places", () => {
    setBookkeeping(false);
    let checked = 0;
    for (let i = 0; i < 2; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-states");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const century = centuryOf(place.seed, gameStartDate());
      const api = coreAPI(world.core);
      const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
      for (const row of api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[]) {
        const office = offices.get(row.officeId) as unknown as
          { kind: string; jurisdiction: string; level: string } | undefined;
        if (office?.level !== "state" || office.kind.startsWith("legislature"))
          continue;
        const seat = century.seats.get(
          `${office.jurisdiction}:executive:${office.kind}`,
        );
        if (!seat) continue;
        expect(partySide(row.party), `${where}: ${row.seatId}`).toBe(seat.side);
        checked += 1;
      }
    }
    expect(
      checked,
      "statewide officers checked at the two places",
    ).toBeGreaterThan(0);
  }, 240_000);

  it("differs between drawn worlds, keeps term limits, and gives no two races one share", () => {
    const governors = new Map<string, number>();
    for (let i = 0; i < 6; i += 1) {
      const place = drawPlace(`${RUN}:worlds:${i}`, "history-states");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      const seats = [...centuryOf(place.seed, gameStartDate()).seats.values()];
      governors.set(
        where,
        seats.filter((s) => s.rosterKey === "governor" && s.side > 0).length,
      );
      // A holder never wins more terms than their office allows.
      for (const seat of seats)
        if (seat.termLimit)
          expect(seat.termsWon, `${where} ${seat.key}`).toBeLessThanOrEqual(
            seat.termLimit,
          );
      // Two races are never the same count: each has its own candidates.
      const shares = new Map<number, string>();
      for (const seat of seats)
        for (const race of seat.races) {
          expect(shares.get(race.winnerShare), `${where} ${race.id}`).toBe(
            undefined,
          );
          shares.set(race.winnerShare, race.id);
        }
    }
    expect(
      new Set(governors.values()).size,
      `Republican governors on day one by drawn world: ${JSON.stringify([...governors])}`,
    ).toBeGreaterThan(1);
  }, 120_000);
});
