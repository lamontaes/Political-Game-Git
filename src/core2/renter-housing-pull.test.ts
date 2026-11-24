// @vitest-environment node
/** A renter weighs a state's housing prices more than an owner does, so the counted movers' pull toward a cheaper-housing state is stronger for renters. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import rppHousing from "./data/regional/rpp-housing.json" with { type: "json" };
import regions from "./data/regional/regions.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { pullBetween, runtimeOf } from "./modules/counted-moves";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "renter-housing-pull");
const WAGES = 60_000;
const ratio = (fips: string) => {
  const row = (
    rppHousing.byFips as Record<string, { allItems: number; housing: number }>
  )[fips];
  return row ? row.housing / row.allItems : undefined;
};

it(
  `a renter's pull toward cheaper housing is stronger than an owner's: ${place.name}, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const rt = runtimeOf(api)!;
      const fipsOf = new Map(
        Object.entries(regions.states).map(([fips, s]) => [
          (s as { usps: string }).usps,
          fips,
        ]),
      );
      const homeRatio = ratio(fipsOf.get(rt.townState)!);
      expect(homeRatio, "home state has a housing price record").toBeDefined();
      // The state, other than home, whose housing is cheapest against its all-items level.
      const cheapest = [...fipsOf.entries()]
        .filter(([usps, fips]) => usps !== rt.townState && ratio(fips))
        .sort((a, b) => ratio(a[1])! - ratio(b[1])!)[0]!;
      if (ratio(cheapest[1])! >= homeRatio!) {
        process.stdout.write(
          `RENTER-PULL ${place.name} (${place.key}, seed ${place.seed}): home ${rt.townState} is already the cheapest on housing; nothing to compare\n`,
        );
        return;
      }
      rt.netCache.clear();
      const owner = pullBetween(
        api,
        rt,
        rt.townState,
        cheapest[0],
        WAGES,
        new Map(),
        false,
      ).income;
      const renter = pullBetween(
        api,
        rt,
        rt.townState,
        cheapest[0],
        WAGES,
        new Map(),
        true,
      ).income;
      process.stdout.write(
        `RENTER-PULL ${place.name} (${place.key}, seed ${place.seed}), home ${rt.townState} to ${cheapest[0]}: income pull at $${WAGES} owner ${owner.toFixed(4)}, renter ${renter.toFixed(4)} (log units)\n`,
      );
      expect(renter).toBeGreaterThan(owner);
      // The monthly weighing runs on it in the played world.
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 35));
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
