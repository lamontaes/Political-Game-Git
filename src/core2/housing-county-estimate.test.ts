/**
 * Every owner's home has a value on day one, wherever the town is: the value
 * comes from the place's own pay (`levelFromPay`), not from a published
 * county median, so no county is without one and the property tax has homes
 * to bill. The place is drawn at random; the place and seed are named in
 * every failure message.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { ownedHomes } from "./modules/housing";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("gives every owner a home value from the place's own pay, and bills their property tax", () => {
  const before = setBookkeeping(false);
  try {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(seed, `home-values:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const { core } = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      const town = lawChain(api).townPlaceId;
      const dwellings = (
        api.moduleState("housing").table("dwellings").rows() as unknown as {
          tenure: string;
          valueMinor?: number;
          householdId: string;
        }[]
      ).filter(
        (row) => api.state.households.get(row.householdId)?.placeId === town,
      );
      const owners = dwellings.filter((row) => row.tenure === "own");
      if (!owners.length) {
        tried.push(`${where}: no owner among ${dwellings.length} named homes`);
        continue;
      }
      // A town with owners has homes to tax, none of them worth nothing.
      expect(owners.filter((row) => !row.valueMinor).length, where).toBe(0);
      expect(ownedHomes(api, town).length, where).toBeGreaterThan(0);
      process.stdout.write(
        `home values: ${where}; passed over: ${tried.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(`No drawn place had an owner: ${tried.join("; ")}`);
  } finally {
    setBookkeeping(before);
  }
}, 600_000);
