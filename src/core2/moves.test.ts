import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import {
  corePlaceByJurisdictionId,
  corePlaceStateIdentities,
} from "./place-lookup";
import natality from "../../data/research/renewal/natality-2024.json" with { type: "json" };
import { createRenewalCore } from "./births-setup";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import rates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import { advanceCore } from "./life";
import {
  departuresSeen,
  watchDepartures,
  holdsOf,
  MOVED_AWAY_EVENT,
  movesModule,
} from "./modules/moves";
import { coreAPI } from "./state";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";

// M1-09, moves: over half a year in a drawn place, adults leave town by their own
// choice at about the rate people their age in their state leave a county
// (ACS 2024), each with recorded reasons and a destination from a record;
// the people who stay are the ones their ties hold.
// Without the runner, a place drawn from all 56 the way the runner draws.
const drawn = drawPlace("moves-default", "M1-09");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = generatedOpening(
  { seed, key },
  { economy: false, settings: { population: 700 } },
);
const core = createRenewalCore(input, { modules: [movesModule] });
const api = coreAPI(core);
watchDepartures(core);
const cash = () =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    0,
  );
const openingCash = cash();
const opening = makeIsoDate(input.startedAt);
const RATES = rates as unknown as {
  ageBands: string[];
  national: { departurePerYearByAge: Record<string, number> };
  places: Record<string, { departurePerYearByAge: Record<string, number> }>;
};
const bandOf = (birthDate: string) =>
  RATES.ageBands.find((band) => {
    const [low, high] = band.replace("+", "-").split("-");
    const age = ageOnDate(makeIsoDate(birthDate), opening);
    return age >= Number(low) && (!high || age <= Number(high));
  });
const adults = [...core.people.values()].filter(
  (row) => row.alive && row.tier !== "husk" && bandOf(row.birthDate),
);
const state =
  corePlaceByJurisdictionId(adults[0]!.placeId as never)
    ?.stateJurisdictionKey ?? "";
const acs = (RATES.places[state] ?? RATES.national).departurePerYearByAge;
// Half a year keeps the check inside the golden-path budget.
const MONTHS = 6;
const expected =
  (adults.reduce((sum, row) => sum + acs[bandOf(row.birthDate)!]!, 0) *
    MONTHS) /
  12;
const parentsAtHome = new Set(
  [...core.familyLinks.values()]
    .filter(
      (link) =>
        link.kind === "parent-child" &&
        core.people.get(link.personIds[0])?.householdId ===
          core.people.get(link.personIds[1])?.householdId,
    )
    .map((link) => link.personIds[1]),
);
// Births: women in town by the natality table's age bands at the opening,
// and their state's 2024 rates per 1,000 women (CDC NVSS, Table 6).
const NATALITY = natality as unknown as {
  areas: Record<string, { ageRates: Record<string, number | null> }>;
};
const stateName =
  corePlaceStateIdentities().find((row) => row.jurisdictionKey === state)
    ?.name ?? "";
const birthRates = (
  NATALITY.areas[stateName] ?? NATALITY.areas["United States"]!
).ageRates;
const nationalRates = NATALITY.areas["United States"]!.ageRates;
const motherBand = (birthDate: string) =>
  Object.keys(birthRates).find((band) => {
    const [low, high] = band.split("-").map(Number) as [number, number];
    const age = ageOnDate(makeIsoDate(birthDate), opening);
    return age >= low && age <= high;
  });
const expectedBirths =
  ([...core.people.values()]
    .filter(
      (row) =>
        row.alive && row.tier !== "husk" && row.looks?.gender === "female",
    )
    .reduce((sum, row) => {
      const band = motherBand(row.birthDate);
      if (!band) return sum;
      const rate = birthRates[band] ?? nationalRates[band] ?? 0;
      return sum + rate / 1000;
    }, 0) *
    MONTHS) /
  12;
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCMonth(end.getUTCMonth() + MONTHS);
advanceCore(core, end.toISOString().slice(0, 10));
const departures = departuresSeen(core);
const departedAdults = departures
  .flatMap((row) => row.withIds)
  .filter((id) => adults.some((row) => row.id === id));

const births = api
  .moduleState(RENEWAL_MODULE_ID)
  .table("births")
  .rows() as unknown as { motherId: string; date: string }[];

describe(`moves over half a year in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("sends adults away at about the rate people their age in their state leave a county", () => {
    // Half a year in one town is a small sample: allow three standard
    // deviations of a count with this mean, and a fifth fewer because owner
    // households with a mortgage stay together until a home sale exists
    // (registered stopgap).
    const spread = 3 * Math.sqrt(expected);
    expect(departedAdults.length).toBeGreaterThan(0);
    expect(departedAdults.length).toBeGreaterThanOrEqual(
      0.8 * expected - spread,
    );
    expect(departedAdults.length).toBeLessThanOrEqual(1.2 * expected + spread);
  });

  it("keeps each departure's reasons and a destination from a record, and takes the movers out of town life", () => {
    expect(departures.length).toBeGreaterThan(0);
    for (const row of departures) {
      expect(row.reasons.lifeStage ?? 0).toBeGreaterThanOrEqual(0);
      expect(Object.keys(row.reasons).some((k) => k.startsWith("hold:"))).toBe(
        true,
      );
      expect(row.destinationId).not.toBe(row.fromPlaceId);
      expect(core.eventIds.has(row.id)).toBe(true);
      for (const id of row.withIds) {
        const person = core.people.get(id)!;
        expect(person.tier).toBe("husk");
        expect(person.jobId).toBeUndefined();
      }
    }
  });

  it("builds each pull from the person's records, never a draw: the opening reads their pushes and holds", () => {
    const pulls = api.moduleState("moves").table("pulls").rows() as unknown as {
      causes: Record<string, number>;
      reads: Record<string, readonly string[]>;
      openingNet?: number;
    }[];
    const opened = pulls.filter((row) => row.causes.opening !== undefined);
    expect(opened.length).toBeGreaterThan(0);
    for (const row of opened) {
      expect(row.reads.opening?.length).toBeGreaterThan(0);
      expect(row.openingNet).toBeTypeOf("number");
    }
    // Higher net push stands further along at the opening.
    const sorted = [...opened].sort((a, b) => a.openingNet! - b.openingNet!);
    for (let i = 1; i < sorted.length; i += 1)
      expect(sorted[i]!.causes.opening!).toBeGreaterThanOrEqual(
        sorted[i - 1]!.causes.opening!,
      );
    for (const row of departures)
      for (const key of Object.keys(row.reasons).filter((k) =>
        k.startsWith("push:"),
      ))
        expect(row.reads[key.slice("push:".length)]?.length).toBeGreaterThan(0);
  });

  it("moves leavers to their destination: their place, household and the town's residents change with them", () => {
    // Break 13 of the October 12 three-year trace: every leaver still had
    // the town as their place and their household kept them.
    expect(departures.length).toBeGreaterThan(0);
    const town = departures[0]!.fromPlaceId;
    for (const row of departures) {
      for (const id of row.withIds) {
        const person = core.people.get(id)!;
        const home = core.households.get(person.householdId)!;
        expect(person.placeId).toBe(row.destinationId);
        expect(home.placeId).toBe(row.destinationId);
        expect(home.memberIds).toContain(id);
        expect(core.peopleByPlace.get(row.fromPlaceId)?.has(id)).toBe(false);
        expect(core.peopleByPlace.get(row.destinationId)?.has(id)).toBe(true);
        // No household left in town still lists them.
        for (const other of core.households.values())
          if (other.placeId === town) expect(other.memberIds).not.toContain(id);
      }
      // The ones who stayed keep their own household in town.
      for (const id of core.households.get(row.householdId)?.memberIds ?? [])
        if (!row.withIds.includes(id) && core.people.get(id)!.tier !== "husk")
          expect(core.people.get(id)!.placeId).toBe(row.fromPlaceId);
    }
    // The town's resident list (what voting, the bench and the screens read)
    // no longer counts anyone who left.
    const left = new Set(departures.flatMap((row) => row.withIds));
    const residents = [...core.people.values()].filter(
      (row) => row.alive && row.placeId === town,
    );
    expect(residents.some((row) => left.has(row.id))).toBe(false);
  });

  it("pays a mover's recorded income into the household where they live now", () => {
    // A pension or Social Security award follows its person: its term names
    // the household they live in, and the saved award still names the one
    // it was written for.
    for (const row of core.finance.contracts.values()) {
      const term = row.recipientIncome;
      if (!term || row.endedAt) continue;
      const person = core.people.get(term.personId)!;
      expect(person.householdId).toBe(term.householdId);
      expect(core.households.get(term.householdId)!.memberIds).toContain(
        person.id,
      );
      if (term.movedOn) {
        expect(term.recordedHouseholdId).toBeDefined();
        expect(term.recordedHouseholdId).not.toBe(term.householdId);
      }
    }
  });

  it("lets a grown child living with a parent leave alone, and takes a householder's partner and children along", () => {
    for (const row of departures) {
      if (parentsAtHome.has(row.personId))
        expect(row.withIds).toEqual([row.personId]);
      for (const id of row.withIds.slice(1)) {
        const going = core.people.get(id)!;
        const age = ageOnDate(
          makeIsoDate(going.birthDate),
          makeIsoDate(row.date),
        );
        const partner = [...core.familyLinks.values()].some(
          (link) =>
            link.kind === "partner" &&
            link.personIds.includes(id) &&
            link.personIds.includes(row.personId),
        );
        expect(partner || age < 18).toBe(true);
      }
    }
  });

  it("holds people with ties: within an age, stronger ties build the pull to leave more slowly", () => {
    const tie = (id: string) =>
      Object.values(holdsOf(api, core.people.get(id)!)).reduce(
        (a, b) => a + b,
        0,
      );
    const built = (id: string) =>
      (
        api.moduleState("moves").table("pulls").get(id) as
          { causes: Record<string, number> } | undefined
      )?.causes.lifeStage ?? 0;
    let compared = 0;
    for (const band of RATES.ageBands) {
      const staying = adults
        .filter(
          (row) =>
            bandOf(row.birthDate) === band &&
            core.people.get(row.id)!.tier !== "husk",
        )
        .map((row) => ({ tie: tie(row.id), built: built(row.id) }))
        .sort((a, b) => a.tie - b.tie);
      const half = Math.floor(staying.length / 2);
      const loose = staying.slice(0, half);
      const tight = staying.slice(staying.length - half);
      if (!half || loose.at(-1)!.tie === tight[0]!.tie) continue;
      const mean = (rows: typeof staying) =>
        rows.reduce((sum, row) => sum + row.built, 0) / rows.length;
      expect(mean(tight)).toBeLessThan(mean(loose));
      compared += 1;
    }
    expect(compared).toBeGreaterThan(3);
  });

  it("moves no money: every dollar is still on someone's books", () => {
    let outsideNet = 0;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outsideNet += row.netMinor;
    expect(cash()).toBe(openingCash - outsideNet);
  });

  it("adds an eviction's push to the evicted, and a relative's move to their kin", () => {
    const stayer = [...core.people.values()].find(
      (row) =>
        row.alive &&
        row.tier !== "husk" &&
        ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >= 18,
    )!;
    const before =
      (
        api.moduleState("moves").table("pulls").get(stayer.id) as
          { causes: Record<string, number> } | undefined
      )?.causes["housing.eviction"] ?? 0;
    api.emit({
      id: `fixture-eviction:${stayer.id}`,
      date: core.date,
      kind: "housing.eviction",
      personIds: [stayer.id],
      placeId: stayer.placeId,
      publicRecord: true,
      source: { tag: "SOURCED", citation: "Fixture filing.", asOf: core.date },
    });
    const after = (
      api.moduleState("moves").table("pulls").get(stayer.id) as {
        causes: Record<string, number>;
      }
    ).causes["housing.eviction"]!;
    expect(after).toBeGreaterThan(before);
    // Kin follow only where a leaver had a parent, child or sibling who
    // stayed: the records now send first the people with no one holding them.
    const parentsOf = (id: string) =>
      [...core.familyLinks.values()]
        .filter((link) => link.kind !== "partner" && link.personIds[1] === id)
        .map((link) => link.personIds[0]);
    const childrenOf = (id: string) =>
      [...core.familyLinks.values()]
        .filter((link) => link.kind !== "partner" && link.personIds[0] === id)
        .map((link) => link.personIds[1]);
    const leftKin = departures.some((row) =>
      row.withIds.some((id) =>
        [
          ...parentsOf(id),
          ...childrenOf(id),
          ...parentsOf(id).flatMap(childrenOf),
        ].some((other) => {
          const person = core.people.get(other);
          return (
            !row.withIds.includes(other) &&
            person?.alive &&
            person.tier !== "husk" &&
            ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >=
              18
          );
        }),
      ),
    );
    const followed = leftKin
      ? (
          api.moduleState("moves").table("pulls").rows() as unknown as {
            causes: Record<string, number>;
          }[]
        ).some((row) => (row.causes[MOVED_AWAY_EVENT] ?? 0) > 0)
      : true;
    expect(followed).toBe(true);
  });

  it("brings births at about the state's 2024 rates for the women in town", () => {
    // The same sampling allowance as departures, for a count with this mean.
    const spread = 3 * Math.sqrt(expectedBirths);
    expect(births.length).toBeGreaterThanOrEqual(0.7 * expectedBirths - spread);
    expect(births.length).toBeLessThanOrEqual(1.3 * expectedBirths + spread);
    for (const row of births)
      expect(core.people.get(row.motherId)?.looks?.gender).toBe("female");
  });
});
