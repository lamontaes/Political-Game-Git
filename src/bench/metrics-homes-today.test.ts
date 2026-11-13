import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townFigures } from "../core2/modules/housing";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import { metricsView } from "./metrics";

// Metrics' typical rent and home value are today's, not the opening's: two years into
// Joseph City, Arizona the screen still read "Typical monthly rent $904 · Typical home
// value $198,000", the figures of the opening day (Playtester P2, Nov 13).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`Metrics reads today's rent and home value, a year on, seed ${seed}`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  let checked = 0;
  for (let draw = 0; draw < 6 && checked < 2; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "metrics-homes-today");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const today = townFigures(api, town);
    if (!today.rentMinor || !today.homeValueMinor) {
      passedOver.push(`${where}: no renter or owned home on record`);
      continue;
    }
    const rows = metricsView(core, town, playerId!).sections.find(
      (section) => section.key === "housing",
    )?.rows as { key: string; now: number }[] | undefined;
    expect(rows, `${where}: no homes section`).toBeDefined();
    expect(rows!.find((row) => row.key === "rent")?.now, where).toBe(
      today.rentMinor,
    );
    expect(rows!.find((row) => row.key === "homeValue")?.now, where).toBe(
      today.homeValueMinor,
    );
    checked += 1;
  }
  expect(checked, `passed over: ${passedOver.join("; ")}`).toBe(2);
}, 900_000);
