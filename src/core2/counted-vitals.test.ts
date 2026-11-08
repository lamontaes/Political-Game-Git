/**
 * The counted tier's births and deaths are kept in play (Dev Tester, Nov 8:
 * Willow Creek, California logged 43 births against 1,755 deaths in twenty
 * years because only full people log them; the wider population was born and
 * died all along). The renewal engine keeps a running total of real people
 * born and dead in each place's carry row, and the vital statistics read it.
 * With bookkeeping on, the monthly counts rows must add up to the same totals.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";

it("the carry rows' born and died totals equal what the monthly counts rows record (Futiga, American Samoa, seed dpA)", () => {
  const place = drawPlace("dpA", "drift-played");
  setBookkeeping(true);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const store = coreAPI(core).moduleState(RENEWAL_MODULE_ID);
    const carry = store.table("countedCarry").rows() as unknown as {
      born?: number;
      died?: number;
    }[];
    const counts = store.table("counts").rows() as unknown as {
      deathCauses: Record<string, number>;
    }[];
    const born = carry.reduce((n, row) => n + (row.born ?? 0), 0);
    const died = carry.reduce((n, row) => n + (row.died ?? 0), 0);
    const recorded = counts.reduce(
      (n, row) => n + Object.values(row.deathCauses).reduce((a, b) => a + b, 0),
      0,
    );
    const where = `${place.name}, seed ${place.seed}`;
    expect(born, `${where}: counted births in a year`).toBeGreaterThan(0);
    expect(died, `${where}: counted deaths in a year`).toBeGreaterThan(0);
    expect(died, `${where}: deaths against the counts rows`).toBe(recorded);
  } finally {
    setBookkeeping(false);
  }
}, 1_800_000);
