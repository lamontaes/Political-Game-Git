import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { centuryCongressSeat } from "../../../src/core2/electorate-century";
import { gameStartDate } from "../../../src/core2/game-start";
import { OFFICES_MODULE_ID } from "../../../src/core2/modules/offices";
import { pastTown } from "../../../src/core2/past-bodies";
import { buildPriorElections } from "../../../src/core2/past-elections";
import { coreAPI } from "../../../src/core2/state";

// Row 15 of the refactoring map (Nov 26): which day-one race comes from the century and which
// from past-elections.ts's own tenure-band path. In a century world every seat the century
// counts keeps the century's own record on its prior election; nothing the century does not
// count claims one. The place and seed are drawn and named, never pinned.
const seed = process.env.PAST_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const api = coreAPI(world.core);

describe(`prior elections name the century's count (${world.place.key}, seed ${seed})`, () => {
  it("keeps a century record on every race the century counted, and on no other", () => {
    const offices = new Map(
      (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .rows() as unknown as {
          id: string;
          kind: string;
          jurisdiction: string;
        }[]
      ).map((office) => [office.id, office]),
    );
    const seats = new Map(
      (
        api.moduleState(OFFICES_MODULE_ID).table("seats").rows() as unknown as {
          id: string;
          district: string | null;
        }[]
      ).map((seat) => [seat.id, seat]),
    );
    const rows = buildPriorElections(api, pastTown(api, seed));
    expect(rows.length).toBeGreaterThan(0);
    const counted: string[] = [];
    const notCounted: string[] = [];
    for (const row of rows) {
      const office = offices.get(row.officeId);
      const seat = seats.get(row.seatId);
      if (!office || !seat) continue;
      const president =
        office.kind === "president" || office.kind === "vice-president";
      const century = president
        ? true
        : centuryCongressSeat(seed, world.core.startedAt, office, seat) !==
          undefined;
      if (century) {
        counted.push(row.id);
        expect(row.centuryRecordId, row.id).toBeDefined();
      } else {
        notCounted.push(row.id);
        expect(row.centuryRecordId, row.id).toBeUndefined();
      }
    }
    // Every world holds the President from the century. A place may have no elected local office
    // at all (a county-governed place), so the others are reported, not required.
    expect(counted.length).toBeGreaterThan(0);
    process.stdout.write(
      `prior elections: ${counted.length} from the century, ${notCounted.length} from the tenure band\n`,
    );
  });
});
