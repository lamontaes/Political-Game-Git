/**
 * An official has a living cost and cash from the day the officials engine seats them (pool item
 * gov-elected-official-seated-without-money): a bribe weighs its amount against a month of the
 * official's living costs plus their cash, so a seated official with neither takes any bribe.
 * Played day by day in a place drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins
 * one), every official the engine holds, the day it first holds them, has a living cost.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { allOfficials } from "./modules/officials";
import { placeStateKey } from "./place-map";
import { coreAPI } from "./state";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`seated-money:${Date.now()}`).digest("hex");
const DAYS = 540;

it("an official is seated with a living cost the day the engine first holds them", () => {
  setBookkeeping(false);
  const place = drawPlace(
    runSeed,
    process.env.SEATED_SALT ?? "official-seated-money",
  );
  const where = `${place.name} (${place.key}), run seed ${runSeed}, world seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const seen = new Set<string>();
  const bare: string[] = [];
  let newlySeated = 0;
  for (let day = 1; day <= DAYS; day += 1) {
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
    for (const official of allOfficials(api)) {
      if (seen.has(official.id)) continue;
      seen.add(official.id);
      if (day === 1) continue;
      // Officials of another state are counted, not paid or given a household, until the player
      // meets them (SG-GOV-outside-officials-counted): the player's own state's officials are
      // seated with money from the start.
      if (
        official.stateKey !== placeStateKey(core.placeMetadata?.placeKey ?? "")
      )
        continue;
      newlySeated += 1;
      const person = core.people.get(official.id as never);
      if (person && person.alive && person.livingCostDailyMinor <= 0)
        bare.push(`${official.id} on ${core.date}`);
    }
  }
  expect(
    bare,
    `${where}: officials first held with no living cost: ${bare.join("; ")}`,
  ).toEqual([]);
  expect(
    newlySeated,
    `${where}: no official was newly seated in ${DAYS} days`,
  ).toBeGreaterThan(0);
}, 3_600_000);
