/**
 * Probe (W-F, Nov 12): who the town's records seat on day one in drawn
 * places, by office, so a missing mayor's address is read as a fact of the
 * draws or a defect. Run: node --import tsx scripts/words/town-seats-probe.ts <base> <n>
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";

setBookkeeping(false);
const [base = "probe", count = "10"] = process.argv.slice(2);
for (let at = 0; at < Number(count); at += 1) {
  const label = createHash("sha256")
    .update(`${base}:${at}`)
    .digest("hex")
    .slice(0, 16);
  const place = drawPlace(label, "speech-outline");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const seats = townSeats(coreAPI(world.core));
  const kinds = new Map<string, { seats: number; held: number }>();
  for (const row of seats) {
    const key = `${row.office.level}:${row.office.kind}`;
    const was = kinds.get(key) ?? { seats: 0, held: 0 };
    kinds.set(key, {
      seats: was.seats + 1,
      held: was.held + (row.holder?.personId ? 1 : 0),
    });
  }
  console.log(
    `${place.name} (${place.key}), seed ${label}: ${seats.length} town seats; ${[...kinds].map(([k, v]) => `${k} ${v.held}/${v.seats}`).join(", ") || "none"}`,
  );
}
