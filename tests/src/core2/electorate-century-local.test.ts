import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import {
  centuryLocalSeats,
  centurySeatRace,
} from "../../../src/core2/electorate-century";
import { gameStartDate } from "../../../src/core2/game-start";
import { OFFICES_MODULE_ID } from "../../../src/core2/modules/offices";
import { coreAPI } from "../../../src/core2/state";

// The century runs the played town's own offices (its mayor, council and county) from 1925 beside
// the state legislatures (row 15, slice 1). Every elected local seat has a century seat; the term
// the offices engine seats in it follows the century's career and its last race; the seat's term
// length and its election year stagger are the offices' own. The place is drawn from all 56 on a
// seed nobody chose (LOCAL_CENTURY_SEED pins one for a re-run); a place with no elected local
// office is passed over and named.
const seed = process.env.LOCAL_CENTURY_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;

interface OfficeRow {
  id: string;
  kind: string;
  jurisdiction: string;
  elected: boolean;
  termYears?: number;
}
interface SeatRow {
  id: string;
  officeId: string;
  district: string | null;
}
interface TermRow {
  seatId: string;
  status: string;
  startDate: string;
  serviceStart?: string;
  elected?: { date: string; share: number };
}

it("the century runs each elected local seat, and the term seated in it follows the century's career and last race", () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let i = 0; i < DRAWS; i += 1) {
    const place = drawPlace(`${seed}:${i}`, "electorate-century-local");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const start = gameStartDate();
    const seatsOf = centuryLocalSeats(world.core.seed, start);
    const offices = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .rows() as unknown as OfficeRow[]
    ).filter((o) => o.elected && !o.jurisdiction.startsWith("US"));
    if (!offices.length || !seatsOf.size) {
      passed.push(`${place.name ?? place.key} (${place.key})`);
      continue;
    }
    const seats = api
      .moduleState(OFFICES_MODULE_ID)
      .table("seats")
      .rows() as unknown as SeatRow[];
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
    const where = `${place.name ?? place.key} (${place.key}), seed ${place.seed}`;
    let checked = 0;
    for (const office of offices)
      for (const seat of seats.filter((s) => s.officeId === office.id)) {
        const century = seatsOf.get(seat.id);
        expect(
          century,
          `${where}: ${seat.id} has a century seat`,
        ).toBeDefined();
        expect(century!.termYears, `${where}: ${seat.id} term length`).toBe(
          office.termYears,
        );
        const term = terms.find(
          (t) => t.seatId === seat.id && t.status === "serving",
        );
        if (!term?.elected) continue;
        const year = Number(term.elected.date.slice(0, 4));
        // The term's election year is on the seat's own cycle: the stagger the offices engine gave it.
        const cycle = century!.cycleYear ?? year;
        expect(
          (((year - cycle) % century!.termYears!) + century!.termYears!) %
            century!.termYears!,
          `${where}: ${seat.id} elected ${year} off its cycle ${cycle}`,
        ).toBe(0);
        // Its recorded share is the century's race for that year, to the digit.
        const race = centurySeatRace(world.core.seed, office, seat, year);
        expect(
          race,
          `${where}: ${seat.id} has the century's ${year} race`,
        ).toBeDefined();
        expect(term.elected.share, `${where}: ${seat.id} share`).toBeCloseTo(
          race!.winnerShare,
          9,
        );
        // The holder's service began no earlier than the century says the seat was first won: the
        // offices engine may cut a career short (the holder's age at the seat's first term, a term
        // limit), so service starts at or after the first win, never before it.
        if (term.serviceStart)
          expect(
            Number(term.serviceStart.slice(0, 4)) - century!.firstWon,
            `${where}: ${seat.id} service start against first win ${century!.firstWon}`,
          ).toBeGreaterThanOrEqual(0);
        checked += 1;
      }
    expect(
      checked,
      `${where}: no local seat had a recorded election`,
    ).toBeGreaterThan(0);
    return;
  }
  throw new Error(
    `no drawn place had an elected local office in ${DRAWS} draws (base ${seed}); passed over ${passed.join("; ")}`,
  );
}, 3_600_000);
