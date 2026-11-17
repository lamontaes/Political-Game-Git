import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import rates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import {
  departuresSeen,
  livesElsewhere,
  MOVED_AWAY_EVENT,
  movesModule,
  watchDepartures,
} from "./modules/moves";
import { townPlaceOf } from "./modules/residents";
import { coreStateKeyOfJurisdictionId } from "./place-lookup";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import { registerModule } from "./state";
import type { EntityId } from "./kernel/brands";
import type { CoreEventInput } from "./types";

// Every life is simulated (owner, Nov 1, 2026: "EVERY. LIFE. IS. SIMULATED.
// ... THIS IS LOW INTENSITY STUFF."). The relatives every resident has
// outside the town (the inactive tier, kept minimal until met) move through
// the same moves engine as the town's people: the same monthly pull at their
// stage of life and their state's ACS rate, weighed by the same chooser, to a
// relative's place, a county's most common destination or a new home in their
// state. A move is the same dated record, witnessed by their relatives in
// town, and moves no money. A place drawn from all 56, every household with
// its kin, over half a year.
const drawn = drawPlace("moves-elsewhere", "core-every-life-simulated");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = generatedOpening(
  { seed, key },
  { economy: false, settings: { population: 700 } },
);
const core = createLifeCore(input, { modules: [movesModule] });
watchDepartures(core);
// Each move's event as the engine emitted it, for who witnessed it.
const emitted = new Map<string, CoreEventInput>();
registerModule(core, {
  id: "moves-elsewhere:watch",
  eventKinds: [MOVED_AWAY_EVENT],
  onEvent: (_api, event) => void emitted.set(event.id, event),
});
const town = townPlaceOf(core);
const opening = makeIsoDate(input.startedAt);
const RATES = rates as unknown as {
  ageBands: string[];
  national: { departurePerYearByAge: Record<string, number> };
  places: Record<string, { departurePerYearByAge: Record<string, number> }>;
};
const rateFor = (placeId: string, birthDate: string) => {
  const age = ageOnDate(makeIsoDate(birthDate), opening);
  const band = RATES.ageBands.find((row) => {
    const [low, high] = row.replace("+", "-").split("-");
    return age >= Number(low) && (!high || age <= Number(high));
  });
  const state =
    corePlaceByJurisdictionId(placeId as EntityId)?.stateJurisdictionKey ??
    coreStateKeyOfJurisdictionId(placeId);
  return band
    ? ((state ? RATES.places[state] : undefined) ?? RATES.national)
        .departurePerYearByAge[band]!
    : 0;
};
const elsewhere = [...core.people.values()].filter((row) =>
  livesElsewhere(core, row),
);
const elsewhereIds = new Set(elsewhere.map((row) => row.id));
const placeAtOpening = new Map(elsewhere.map((row) => [row.id, row.placeId]));
const cash = () =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    0,
  );
const openingCash = cash();
const MONTHS = 6;
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCMonth(end.getUTCMonth() + MONTHS);
advanceCore(core, end.toISOString().slice(0, 10));
const moves = departuresSeen(core).filter((row) =>
  elsewhereIds.has(row.personId),
);

describe(`lives elsewhere over half a year in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("has relatives living elsewhere, and none of them in the town itself", () => {
    expect(town).toBeDefined();
    expect(elsewhere.length).toBeGreaterThan(20);
    for (const row of elsewhere) expect(row.placeId).not.toBe(town);
  });

  it("moves relatives living elsewhere by age at the strength the research gives, wherever the count lands", () => {
    // The same check as the town's departures (src/core2/moves.test.ts): the
    // ACS rate for a relative's age in their state sets how fast their pull
    // builds, so the mean rate among those who moved is E[r²]/E[r] of the
    // rates of everyone at risk, above their mean; the count is the world's.
    const movers = moves
      .flatMap((row) => row.withIds)
      .filter((id) => elsewhereIds.has(id));
    expect(movers.length).toBeGreaterThan(0);
    const adults = elsewhere.filter(
      (row) => ageOnDate(makeIsoDate(row.birthDate), opening) >= 18,
    );
    const rateOf = new Map(
      adults.map((row) => [row.id, rateFor(row.placeId, row.birthDate)]),
    );
    const moved = movers
      .map((id) => rateOf.get(id))
      .filter((r): r is number => r !== undefined);
    const atRisk = [...rateOf.values()];
    const mean = (xs: readonly number[]) =>
      xs.reduce((sum, x) => sum + x, 0) / xs.length;
    const m1 = mean(atRisk);
    const m2 = mean(atRisk.map((r) => r * r));
    const m3 = mean(atRisk.map((r) => r * r * r));
    const predicted = m2 / m1;
    const error = Math.sqrt((m3 / m1 - predicted * predicted) / moved.length);
    const observed = mean(moved);
    const line = `${input.placeMetadata?.placeName} (seed ${seed}): ${moved.length} of ${adults.length} adults elsewhere moved; their mean age rate ${observed.toFixed(4)}, everyone's ${m1.toFixed(4)}, in proportion ${predicted.toFixed(4)} ± ${error.toFixed(4)}`;
    process.stdout.write(`moves elsewhere by age: ${line}\n`);
    expect(Math.abs(observed - predicted), line).toBeLessThanOrEqual(4 * error);
    expect(observed, line).toBeGreaterThan(m1);
  });

  it("writes each move as the dated record a leaver writes, with its reasons, never into the town", () => {
    for (const row of moves) {
      expect(core.eventIds.has(row.id)).toBe(true);
      expect(row.id).toBe(`${MOVED_AWAY_EVENT}:${row.personId}:${row.date}`);
      expect(row.fromPlaceId).toBe(placeAtOpening.get(row.personId));
      expect(row.destinationId).not.toBe(town);
      expect(row.reasons.lifeStage ?? 0).toBeGreaterThan(0);
      expect(Object.keys(row.reasons).some((k) => k.startsWith("hold:"))).toBe(
        true,
      );
      for (const id of row.withIds) {
        const person = core.people.get(id)!;
        // Still kept minimal: the same tier, no job, filled in by no one.
        expect(person.tier).toBe("husk");
        expect(person.jobId).toBeUndefined();
        expect(person.placeId).toBe(row.destinationId);
        expect(core.households.get(person.householdId)?.placeId).toBe(
          row.destinationId,
        );
      }
    }
  });

  it("moves a couple living elsewhere together: the opening's married parents are partners", () => {
    const partners = [...core.familyLinks.values()].filter(
      (link) =>
        link.kind === "partner" &&
        link.personIds.every((id) => elsewhereIds.has(id)),
    );
    expect(partners.length).toBeGreaterThan(0);
    for (const row of moves)
      for (const link of partners) {
        if (!link.personIds.includes(row.personId)) continue;
        const other = link.personIds.find((id) => id !== row.personId)!;
        const partner = core.people.get(other)!;
        if (partner.alive && placeAtOpening.get(other) === row.fromPlaceId)
          expect(row.withIds).toContain(other);
      }
  });

  it("lets their relatives in town know: the town's family members witness the move", () => {
    const witnessed = moves.filter((row) => {
      const event = emitted.get(row.id)!;
      const family = row.withIds.flatMap((id) => [
        ...core.people.get(id)!.familyIds,
      ]);
      const inTown = family.filter((id) => {
        const other = core.people.get(id);
        return other?.alive && other.tier !== "husk";
      });
      expect(event.facts?.["moves:elsewhere"]).toBe(row.fromPlaceId);
      return (
        inTown.length > 0 &&
        inTown.every((id) => event.witnessIds?.includes(id))
      );
    });
    expect(witnessed.length).toBeGreaterThan(0);
  });

  it("moves no money: every dollar is still on someone's books", () => {
    let outsideNet = 0;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outsideNet += row.netMinor;
    expect(cash()).toBe(openingCash - outsideNet);
  });
});
