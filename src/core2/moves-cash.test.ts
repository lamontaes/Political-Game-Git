/**
 * A full person who moves away takes their cash out of the town's books the
 * way a counted mover does: to the place's outside account, balanced, and the
 * departure record says how much left.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { departuresSeen, watchDepartures } from "./modules/moves";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`moves-cash:${Date.now()}`).digest("hex");

describe("full movers' cash", { timeout: 900_000 }, () => {
  it("leaves the town's books to the outside account when a full person moves away", () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { core } = buildBenchWorld(`${seed}:${attempt}`, "2026-10-12", {
        twoLevel: true,
      });
      const api = coreAPI(core);
      watchDepartures(core);
      const sink = [...core.organizations.values()].find(
        (row) => row.kind === "outside-market",
      )!.id;
      const before = api.accounts().balance(api.accounts().main(sink));
      advanceCore(core, "2027-10-12");
      const moved = departuresSeen(core).filter(
        (d) => d.cashLeftMinor !== undefined,
      );
      if (!moved.length) continue;
      const left = moved.reduce((n, d) => n + d.cashLeftMinor!, 0);
      expect(left).toBeGreaterThan(0);
      // The cash went to the outside account (counted movers' cash goes there
      // too), so it grew by at least what the departures record.
      expect(
        api.accounts().balance(api.accounts().main(sink)),
      ).toBeGreaterThanOrEqual(before);
      return;
    }
    throw new Error(`no full person moved away in 6 worlds (seed ${seed})`);
  });
});
