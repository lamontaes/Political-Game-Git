/**
 * A town body whose law has its candidates run by party opens with each seat
 * held by a party, split as the town's voters lean (owner's playthrough,
 * Nov 23, row C9: a New Jersey borough's council "elected by party" held
 * nobody's party on day one). The flag `byParty` on a local office is the
 * elections lane's reading of the class's statute; here every council is
 * flagged so the seating is read in a played world on a drawn place, and the
 * draw is read across many bodies for how the mix follows the lean.
 */
import { randomBytes } from "node:crypto";
import type * as OfficesLocal from "./offices-local";
import { describe, expect, it, vi } from "vitest";

vi.mock("./offices-local", async (importOriginal) => {
  const real = await importOriginal<typeof OfficesLocal>();
  return {
    ...real,
    localOfficesForPlace: (key: string) =>
      real
        .localOfficesForPlace(key)
        .map((o) => (o.kind === "council" ? { ...o, byParty: true } : o)),
  };
});

import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { townBodyParties, townRightShare } from "./electorate-places";
import { OFFICES_MODULE_ID, townSeats } from "./modules/offices";
import { partySide } from "./appointments";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(8).toString("hex");
console.log(`town-seat-party: seed ${seed}`);

describe("a by-party town body is seated by the town's lean", () => {
  it("gives the right party more seats as the lean rises, never fewer, with no seat flipping alone", () => {
    const ids = Array.from({ length: 9 }, (_, i) => `seat:test:${i}`);
    let last = -1;
    for (let lean = 0; lean <= 1.0001; lean += 0.05) {
      const parties = townBodyParties(seed, lean, ids);
      const right = parties.filter((p) => p && partySide(p) > 0).length;
      expect(right).toBeGreaterThanOrEqual(last);
      expect(right).toBe(Math.round(lean * ids.length));
      last = right;
    }
    expect(townBodyParties(seed, null, ids).every((p) => p === null)).toBe(
      true,
    );
  });

  it("opens a drawn town's flagged council with a party in every seat, split as its county leans", () => {
    // A drawn place with no council of its own (a township with a board, a town the
    // listing gives no government) is passed over and named; the draw goes on.
    const passedOver: string[] = [];
    for (let draw = 0; draw < 12; draw += 1) {
      const place = drawPlace(seed, `town-seat-party:${draw}`);
      const world = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const council = townSeats(api).filter((s) => s.office.kind === "council");
      if (!council.length) {
        passedOver.push(`${place.name} (${place.key})`);
        continue;
      }
      console.log(
        `town-seat-party: ${place.name} (${place.key}); passed over: ${passedOver.join("; ") || "none"}`,
      );
      const lean = townRightShare(api.state);
      expect(lean, "the town's county lean").not.toBeNull();
      const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
      const parties = council.map(
        (s) =>
          (
            terms.query("bySeatStatus", [s.seat.id, "serving"]) as unknown as {
              party: string | null;
            }[]
          )[0]?.party ?? null,
      );
      expect(
        parties.every((p) => p),
        `parties ${parties.join(", ")}`,
      ).toBe(true);
      const right = parties.filter((p) => partySide(p!) > 0).length;
      expect(right).toBe(Math.round(lean! * council.length));
      return;
    }
    throw new Error(`no drawn place had a council: ${passedOver.join("; ")}`);
  }, 600_000);
});
