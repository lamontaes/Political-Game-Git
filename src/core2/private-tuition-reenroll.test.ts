import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { outsideAccountOf } from "./budgets-treasury";
import tuition from "./data/opening-private-tuition.json";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { tuitionPlans } from "./private-tuition-reenroll";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// Private enrollment is ranked again each August on what families hold
// (core-private-tuition-yearly-reenrollment).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const src = {
  tag: "ESTIMATED" as const,
  asOf: "2025-01-20",
  citation: "test",
  estimatedFrom: "test",
};

it(`a family that fell below the cutoff stops paying tuition and one that rose above it starts the next August, seed ${seed}`, () => {
  setBookkeeping(false);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `tuition:${attempt}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const state = core as CoreState;
    const to = (month: string, year: number) => makeIsoDate(`${year}-${month}`);
    // The first August enrolls the best-off full families (counted ones keep the opening's).
    const year = Number(core.date.slice(0, 4));
    advanceCore(core, to(tuition.reenrollOn, year));
    advanceCore(core, to("08-02", year));
    const before = tuitionPlans(state);
    // Set the families' means just before the next August, so a year of wages
    // does not undo them.
    advanceCore(core, to("07-30", year + 1));
    // A family the engine ranks next August: children of school age then (the
    // opening's own ages) and an adult past them, living.
    const next = to("08-02", year + 1);
    const first = api.parameter("openingSchoolAgeFirst");
    const last = api.parameter("openingSchoolAgeLast");
    const family = (householdId: string) => {
      const home = state.households.get(householdId)!;
      const people = home.memberIds
        .map((id) => state.people.get(id)!)
        .filter((p) => p.alive);
      const age = (p: { birthDate: string }) =>
        ageOnDate(makeIsoDate(p.birthDate), next);
      const kids = people.filter((p) => age(p) >= first && age(p) <= last);
      const adults = people.filter((p) => age(p) > last);
      return kids.length && adults.length
        ? { adults, children: kids.length }
        : undefined;
    };
    const young = (householdId: string) => family(householdId)?.adults;
    const enrolled = [...before.keys()].find((id) => young(id));
    const town = enrolled ? state.households.get(enrolled)!.placeId : "";
    // The quota the engine fills that August; the claim that a family which
    // lost its means stops holds only where the best-off family alone fills it.
    const townChildren = [...state.households.values()]
      .filter((home) => home.placeId === town)
      .reduce((sum, home) => sum + (family(home.id)?.children ?? 0), 0);
    const quota = Math.max(
      1,
      Math.round(townChildren * api.parameter("openingPrivateSchoolShare")),
    );
    const other = [...state.households.values()].find(
      (home) =>
        home.placeId === town &&
        !before.has(home.id) &&
        (family(home.id)?.children ?? 0) >= quota,
    );
    const outside = outsideAccountOf(api);
    if (!enrolled || !other || !outside) continue;
    const accounts = api.accounts();
    // The enrolled family loses everything it holds; the other becomes the best off in town.
    for (const adult of young(enrolled)!) {
      const held = state.people.get(adult.id)!.liquidMinor;
      if (held > 0)
        accounts.transfer({
          id: `test:drain:${adult.id}`,
          from: accounts.main(adult.id),
          to: accounts.main(outside),
          amountMinor: held,
          reasonKey: "test.drain",
          partial: true,
          source: src,
        });
    }
    // Three times the best cash per child in town, for this family's children:
    // enough to put it first, without a pile that the households' own money
    // rules move away on the first of the month.
    const bestPerChild = Math.max(
      ...[...state.households.values()]
        .filter((home) => home.placeId === town)
        .map(
          (home) =>
            home.memberIds.reduce(
              (sum, id) => sum + (state.people.get(id)?.liquidMinor ?? 0),
              0,
            ) / Math.max(1, family(home.id)?.children ?? 1),
        ),
    );
    const fund = Math.ceil(
      3 * bestPerChild * family(other.id)!.children + 1_000_000,
    );
    accounts.transfer({
      id: `test:fund:${young(other.id)![0]!.id}`,
      from: accounts.main(outside),
      to: accounts.main(young(other.id)![0]!.id),
      amountMinor: fund,
      reasonKey: "test.fund",
      partial: true,
      source: src,
    });
    advanceCore(core, to(tuition.reenrollOn, year + 1));
    advanceCore(core, to("08-02", year + 1));
    expect(
      core.date >= next,
      `${place.name}: the year was played to August`,
    ).toBe(true);
    const after = tuitionPlans(state);
    const where = `${place.name} [${place.key}], seed ${seed}`;
    expect(
      after.has(other.id),
      `${where}: the best-off family ${other.id} starts paying tuition`,
    ).toBe(true);
    expect(
      after.has(enrolled),
      `${where}: the family ${enrolled} that lost its means stops`,
    ).toBe(false);
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    return;
  }
  throw new Error(
    `no drawn town had a private school and two families (seed ${seed})`,
  );
}, 900_000);
