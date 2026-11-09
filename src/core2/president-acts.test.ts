/**
 * The President acts when nobody plays them (Nation, Nov 8): in a played
 * world the sitting president (not the player) nominates every open cabinet
 * post and the Senate votes, each a public record. Played in a place drawn
 * from all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { cabinetOf } from "./office-day-federal-president";
import { coreAPI } from "./state";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("an unplayed president nominates the cabinet and the Senate votes", () => {
  const place = drawPlace(seed, "president-acts");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const kinds: string[] = [];
  api.subscribeEvents(
    "nation-test",
    ["cabinet-nominated", "cabinet-confirmed", "cabinet-rejected"],
    (_api, event) => {
      kinds.push(`${event.kind}:${event.id}`);
    },
  );
  let day = makeIsoDate(world.core.date);
  const end = addDays(day, 120);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(world.core, day);
  }
  const where = `${place.name}, seed ${seed}`;
  const nominated = kinds.filter((k) => k.startsWith("cabinet-nominated"));
  expect(nominated.length, `${where}: nominations in 120 days`).toBeGreaterThan(
    0,
  );
  const decided = kinds.filter((k) => !k.startsWith("cabinet-nominated"));
  expect(decided.length, `${where}: Senate votes in 120 days`).toBeGreaterThan(
    0,
  );
  const held = cabinetOf(api).filter((row) => row.status === "confirmed");
  expect(held.length, `${where}: confirmed secretaries`).toBeGreaterThan(0);
  process.stdout.write(
    `nation proof: president acts: ${where}; ${nominated.length} nominations, ${decided.length} Senate votes, ${held.length} confirmed; first ${nominated[0]}\n`,
  );
}, 900000);
