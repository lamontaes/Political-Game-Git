import { PROFILE_FACT_KINDS } from "./opening-profile";
import { parameter } from "./parameters";
import { faithAffinity } from "./private-tuition-choice";
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
    const young = (householdId: string) => {
      const home = state.households.get(householdId)!;
      const people = home.memberIds.map((id) => state.people.get(id)!);
      const age = (p: { birthDate: string }) =>
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date));
      const kids = people.filter((p) => age(p) <= 12);
      const adults = people.filter((p) => age(p) >= 25);
      return kids.length && adults.length ? adults : undefined;
    };
    const enrolled = [...before.keys()].find((id) => young(id));
    const town = enrolled ? state.households.get(enrolled)!.placeId : "";
    const other = [...state.households.values()].find(
      (home) => home.placeId === town && !before.has(home.id) && young(home.id),
    );
    const outside = outsideAccountOf(api);
    if (!enrolled || !other || !outside) continue;
    const accounts = api.accounts();
    // The other family holds the faith the school draws most (a recorded fact on its adults),
    // so with the most money in town it takes the top score.
    for (const adult of young(other.id)!) {
      const person = state.people.get(adult.id)!;
      (person as { pastFacts?: unknown }).pastFacts = [
        ...(person.pastFacts ?? []).filter(
          (fact) => fact.kind !== PROFILE_FACT_KINDS.faith,
        ),
        {
          id: `test:faith:${adult.id}`,
          date: core.date,
          kind: PROFILE_FACT_KINDS.faith,
          summary: "Faith",
          source: src,
          facts: { group: "catholic" },
        },
      ];
    }
    expect(faithAffinity(young(other.id)!)).toBe(
      parameter("privateTuitionAffinityCatholic"),
    );
    // The enrolled family loses everything it holds; the other becomes the best off in town (and its faith favors the school).
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
    accounts.transfer({
      id: `test:fund:${young(other.id)![0]!.id}`,
      from: accounts.main(outside),
      to: accounts.main(young(other.id)![0]!.id),
      amountMinor: 10_000_000_000,
      reasonKey: "test.fund",
      partial: true,
      source: src,
    });
    advanceCore(core, to(tuition.reenrollOn, year + 1));
    advanceCore(core, to("08-02", year + 1));
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
