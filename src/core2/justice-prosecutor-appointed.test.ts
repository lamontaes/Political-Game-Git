/**
 * Where a state has no elected county prosecutor or elected attorney general,
 * the justice engine's prosecutor is the governor's appointed attorney general
 * from the state cabinet (pool item gov-stopgap-justice-law-missing-data).
 * Played in the bench world, a year, in places drawn from all 56 whose state
 * the offices data lists with no elected attorney general.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import stateOffices from "../../data/research/offices/state-offices.json" with { type: "json" };
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { prosecutorFor } from "./justice-law";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appointmentsIn } from "./modules/executive";
import { lawChain } from "./modules/laws";
import { placeStateKey } from "./place-map";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** States whose statewide offices data has no elected attorney general. */
const noElectedGeneral = new Set(
  Object.entries(
    (stateOffices as unknown as { places: Record<string, unknown> }).places,
  )
    .filter(([, row]) => !JSON.stringify(row).includes("attorney-general"))
    .map(([key]) => key),
);

it(`the appointed attorney general prosecutes where none is elected (seed ${seed})`, () => {
  setBookkeeping(false);
  let checked = 0;
  const tried: string[] = [];
  for (let draw = 0; draw < 600 && checked < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "justice-prosecutor-appointed");
    if (!noElectedGeneral.has(placeStateKey(place.key) ?? "")) continue;
    const where = `${place.name} (${place.key}), seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const prosecutor = prosecutorFor(api);
    // A county's elected prosecutor may cover the town: that place is passed over.
    if (prosecutor.level === "county") {
      tried.push(`${where}: an elected county prosecutor`);
      continue;
    }
    const general = appointmentsIn(api, lawChain(api).stateKey).find(
      (row) => row.post === "attorney-general",
    );
    expect(general, `${where}: the cabinet's attorney general`).toBeDefined();
    expect(prosecutor.officeId, where).toBe(general!.id);
    expect(prosecutor.personId, where).toBe(general!.holderId);
    expect(core.people.has(prosecutor.personId!), where).toBe(true);
    console.log(
      `${where}: prosecuted by ${prosecutor.personId} (appointment ${general!.id})`,
    );
    checked += 1;
  }
  expect(
    checked,
    `seed ${seed}: no drawn place in a state with no elected attorney general (${tried.join("; ")})`,
  ).toBeGreaterThan(0);
}, 900_000);
