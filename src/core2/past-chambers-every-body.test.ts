import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { chambersOf } from "./past-laws";
import { townOffices } from "./past-bodies";
import { coreAPI } from "./state";

// Every body the live legislature runs has a past: Playtest Nov 24, the
// lead's trace of places whose council or board listed no recent votes. The
// prior term chose its bodies from its own list of office kinds, which had
// fallen behind the live engine's (a township board, a unicameral
// legislature), so a Connecticut or Rhode Island town board, the D.C.
// Council, Guam's and the Virgin Islands' legislatures and Nebraska's had no
// prior term at all. The oracle is the live engine's own set of lawmaking
// kinds (office-day-state.ts LEGISLATURE_KINDS and world-legislating.ts
// townBodies), not the past's list.
const LIVE_BODY_KINDS = new Set([
  "council",
  "county-board",
  "township-board",
  "legislature-lower",
  "legislature-upper",
  "legislature-unicameral",
]);
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`every lawmaking body covering a town has a prior term, seed ${seed}`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  const kindsSeen = new Set<string>();
  let placesChecked = 0;
  for (let draw = 0; draw < 12 && placesChecked < 4; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "past-chambers-every-body");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    let built: ReturnType<typeof buildBenchWorld>;
    try {
      built = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      passedOver.push(`${where}: ${error.message}`);
      continue;
    }
    const api = coreAPI(built.core);
    const hasPast = new Set(chambersOf(api).map((c) => c.office.id));
    const bodies = townOffices(api).filter((o) => LIVE_BODY_KINDS.has(o.kind));
    for (const office of bodies) {
      kindsSeen.add(office.kind);
      expect(
        hasPast.has(office.id),
        `${where}: the ${office.kind} ${office.id} has no prior term`,
      ).toBe(true);
    }
    placesChecked += 1;
  }
  expect(placesChecked, `passed over: ${passedOver.join("; ")}`).toBe(4);
  expect(
    kindsSeen.size,
    "no lawmaking body in any place drawn",
  ).toBeGreaterThan(0);
}, 200_000);
