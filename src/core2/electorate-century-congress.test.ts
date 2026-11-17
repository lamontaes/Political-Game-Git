/**
 * Day one's Congress is the century's (owner, Nov 17, 2026, CTO line 6935086070 on #9747: "Day one
 * is whatever that history produced: who holds every office, party control"). Every House seat and
 * the Senate by class are counted from 1926 on the one path with play (electorate.ts
 * `countParties`), and every engine reads the century's Congress through `worldRoster`. Every
 * world is a drawn place (skill drawn-place-tests); each assertion names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { partySide } from "./appointments";
import { setBookkeeping } from "./bookkeeping";
import { centuryOf, senateClassUp } from "./electorate-century";
import { worldRoster } from "./electorate-places";
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

const RUN = `history-congress:${Date.now()}`;

describe("the century elects day one's Congress", () => {
  it("seats the century's members in the town's state, and every engine reads the century's chambers, at two drawn places", () => {
    setBookkeeping(false);
    for (let i = 0; i < 2; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-congress");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const century = centuryOf(place.seed, gameStartDate());
      const api = coreAPI(world.core);
      const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
      const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
      // The town's own senators and House members hold the century's seats, side for side.
      let checked = 0;
      for (const row of terms.query("byStatus", [
        "serving",
      ]) as unknown as TermRow[]) {
        const office = offices.get(row.officeId) as unknown as
          { kind: string; jurisdiction: string } | undefined;
        if (office?.jurisdiction !== place.state) continue;
        const key =
          office.kind === "us-senate"
            ? `${place.state}:senate:${row.seatId.split(":").at(-1)}`
            : office.kind.startsWith("us-house")
              ? `${place.state}:house:${String(Number(/^\d+$/.test(row.seatId.split(":").at(-1)!) ? row.seatId.split(":").at(-1) : 0))}`
              : undefined;
        if (!key) continue;
        const seat =
          century.seats.get(key) ?? century.seats.get(`${place.state}:house:0`);
        expect(seat, `${where}: ${row.seatId}`).toBeDefined();
        expect(partySide(row.party), `${where}: ${row.seatId}`).toBe(
          seat!.side,
        );
        checked += 1;
      }
      expect(
        checked,
        `${where}: the state's seats in Congress`,
      ).toBeGreaterThan(0);
      // Every engine's Congress (legislature, officials, parties, the President's desk) reads
      // the roster, and the roster's chambers are the century's last count.
      const last = century.congresses.at(-1)!;
      const roster = worldRoster(place.seed).congress;
      let houseR = 0,
        houseD = 0,
        senateR = 0,
        senateD = 0;
      for (const seats of Object.values(roster))
        for (const [seatKey, holders] of Object.entries(seats))
          for (const party of holders) {
            const right = partySide(party) > 0;
            if (seatKey === "senate") {
              if (right) senateR += 1;
              else senateD += 1;
            } else if (right) houseR += 1;
            else houseD += 1;
          }
      expect(
        { houseR, houseD, senateR, senateD },
        `${where}: day one's chambers against ${last.id}`,
      ).toEqual({
        houseR: last.house.republican,
        houseD: last.house.democratic,
        senateR: last.senate.republican,
        senateD: last.senate.democratic,
      });
    }
  }, 240_000);

  it("differs between drawn worlds: each party holds the House on day one somewhere", () => {
    const control = new Map<string, string>();
    for (let i = 0; i < 12; i += 1) {
      const place = drawPlace(`${RUN}:worlds:${i}`, "history-congress");
      const last = centuryOf(place.seed, gameStartDate()).congresses.at(-1)!;
      control.set(
        `${place.name} (${place.key}), world seed ${place.seed}`,
        last.house.republican > last.house.democratic ? "R" : "D",
      );
    }
    expect(
      new Set(control.values()).size,
      `day one's House majority by drawn world: ${JSON.stringify([...control])}`,
    ).toBe(2);
  }, 120_000);

  it("elects each Senate seat only in its class's years, and keeps a seat's last races", () => {
    const place = drawPlace(`${RUN}:classes`, "history-congress");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    for (const seat of centuryOf(place.seed, gameStartDate()).seats.values()) {
      expect(seat.races.length, `${where} ${seat.key}`).toBeGreaterThan(0);
      expect(seat.races.length, `${where} ${seat.key}`).toBeLessThanOrEqual(3);
      for (const race of seat.races)
        if (seat.chamber === "senate")
          expect(
            senateClassUp(seat.senateClass, race.year),
            `${where} ${race.id}`,
          ).toBe(true);
        else expect(race.year % 2, `${where} ${race.id}`).toBe(0);
    }
  });
});
