import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import view from "./dev-views/budget-amendments";
import { buildBenchWorld } from "./world";

/**
 * Dev mode's Budget amendments view shows, for the player's town government, the arithmetic that
 * let its body amend the adopted budget and each amendment bill's recorded cause (owner, Nov 16:
 * what code traces must be traceable in dev mode). Pinned: Lincolnshire, Kentucky (seed pin-bs:1,
 * source budget-season) played one year, where the body files amendments for a cause.
 */
describe("dev mode's Budget amendments view", () => {
  it("shows the room, what is already amended in, and each bill's cause", () => {
    const place = drawPlace("pin-bs:1", "budget-season");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
    const route = view.routes!["GET budget-amendments"]!;
    const shown = route({
      mode: { core: world.core },
      q: () => "",
      input: {},
    } as never) as {
      government: string | null;
      room: {
        roomMinor: number;
        cause: string;
        nowMinor: number;
        paceMinor: number;
        plannedMinor: number;
        amendedMinor: number;
      } | null;
      bills: { id: string; line: string; deltaMinor: number; cause: string }[];
    };
    const where = `${place.name}, seed pin-bs:1`;
    expect(shown.government, where).not.toBeNull();
    expect(
      shown.bills.length,
      `${where}: amendment bills shown`,
    ).toBeGreaterThan(0);
    for (const bill of shown.bills)
      expect(
        ["receipts-over-plan", "receipts-under-plan"],
        `${where}: bill ${bill.id}`,
      ).toContain(bill.cause);
    // The room is the plain arithmetic the view names: planned revenue times the take against its
    // own earlier pace, less what is already amended in.
    if (shown.room) {
      const { nowMinor, paceMinor, plannedMinor, amendedMinor, roomMinor } =
        shown.room;
      expect(
        Math.abs(
          roomMinor -
            Math.round(
              plannedMinor * (nowMinor / paceMinor - 1) - amendedMinor,
            ),
        ),
        `${where}: room is the shown arithmetic`,
      ).toBeLessThanOrEqual(Math.max(2, plannedMinor * 0.001));
    }
  }, 600000);
});
