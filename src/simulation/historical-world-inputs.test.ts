import { describe, expect, it } from "vitest";
import wageMatrix from "../../data/research/money/minimum-wage-dated-matrix-2026.json" with { type: "json" };
import { drawRandomPlace } from "../../tests/support/random-place";
import { buildPreStartBackgroundWorld } from "../presentation/production-world";
import { advanceObservedWorld } from "../presentation/observer-world";
import { makeIsoDate } from "./dates";
import {
  historicalMinimumWage,
  historicalStartingLawRow,
  historicalWorldInputs,
} from "./historical-world-inputs";
import { congressSeats, seatTermWindow } from "./living-world/congress-seats";
import { nationalElectionRules } from "./national-election-rules";
import {
  budgetCandidates,
  openGovernmentBudget,
} from "./public-budgets/opening";
import { serializeWorld, deserializeWorld } from "./serialization";

const seed = "session5-20261005-historical-world";
const place = drawRandomPlace(seed);
const input = {
  seed,
  place,
  age: 35,
  givenName: null,
  familyName: null,
  startingLife: "ordinary-life" as const,
  depth: "summarize-earlier-life" as const,
  household: "lives-alone" as const,
  preStartYear: {
    version: "pre-start-world-year-v1" as const,
    priorYearStartDate: makeIsoDate("2021-01-01"),
    targetStartDate: place.context.initialMoment.date,
  },
};

describe("historical inputs through the existing observer clock", () => {
  it("supplies all 56 wage floors for every historical year and keeps their basis", () => {
    for (const key of Object.keys(wageMatrix.places))
      for (const year of [2021, 2022, 2023, 2024, 2025]) {
        const date = makeIsoDate(`${year}-01-01`);
        const wage = historicalMinimumWage(key, date);
        expect(wage.value, `${key} ${year}`).toBeGreaterThan(0);
        expect(wage.operativeAt <= date).toBe(true);
        expect(wage.source.length).toBeGreaterThan(0);
        const law = historicalStartingLawRow(wageMatrix.questionKey, key, date);
        expect(law?.row.lawTerms?.[0]?.value).toBe(wage.value);
      }
  });
  it("uses the previous House allocation until the 2023 term, without changing total seats", () => {
    const old = congressSeats(makeIsoDate("2021-01-01"));
    const current = congressSeats(makeIsoDate("2023-01-03"));
    expect(old).toHaveLength(535);
    expect(current).toHaveLength(535);
    expect(
      old
        .filter(
          (seat) => seat.stateUsps === "MT" && seat.chamberKey === "us-house",
        )
        .map((seat) => seat.district),
    ).toEqual(["00"]);
    expect(
      current
        .filter(
          (seat) => seat.stateUsps === "MT" && seat.chamberKey === "us-house",
        )
        .map((seat) => seat.district),
    ).toEqual(["01", "02"]);
    expect(seatTermWindow(old[0]!, makeIsoDate("2021-01-01")).startsAt).toBe(
      "2019-01-03",
    );
    expect(seatTermWindow(old[0]!, makeIsoDate("2021-01-03")).startsAt).toBe(
      "2021-01-03",
    );
    expect(
      nationalElectionRules(2020).units.find((unit) => unit.key === "CA")
        ?.electors,
    ).toBe(55);
    expect(
      nationalElectionRules(2024).units.find((unit) => unit.key === "CA")
        ?.electors,
    ).toBe(54);
    expect(
      nationalElectionRules(2020).units.reduce(
        (n, unit) => n + unit.electors,
        0,
      ),
    ).toBe(538);
  });
  it("opens the same random government's earlier budget from its own amounts with drift", () => {
    const world = buildPreStartBackgroundWorld(input);
    const candidate = budgetCandidates(world).candidates.find(
      (entry) =>
        entry.stateKey === place.stateJurisdictionKey &&
        entry.level === "state",
    )!;
    expect(candidate).toBeDefined();
    const earlier = openGovernmentBudget(
      world,
      candidate,
      makeIsoDate("2021-01-01"),
    );
    const current = openGovernmentBudget(
      world,
      candidate,
      makeIsoDate("2026-01-05"),
    );
    expect(typeof earlier).toBe("object");
    expect(typeof current).toBe("object");
    if (typeof earlier === "string" || typeof current === "string")
      throw new Error("Government did not open");
    expect(earlier.balance).toBe(
      Math.round(
        current.balance *
          historicalWorldInputs(makeIsoDate("2021-01-01")).nominalFactor,
      ),
    );
    expect(
      earlier.years[0]!.appropriations.reduce((a, b) => a + b, 0),
    ).toBeLessThan(current.years[0]!.appropriations.reduce((a, b) => a + b, 0));
    expect(earlier.openingNotes.join(" ")).toContain("ESTIMATED FROM AVERAGE");
  });
  it("keeps earlier decisions and records through clock advance and save/continue", () => {
    const world = buildPreStartBackgroundWorld(input);
    const advanced = advanceObservedWorld(world, 365);
    expect(advanced.currentDate).toBe("2022-01-01");
    expect(
      advanced.history.events.slice(0, world.history.events.length),
    ).toEqual(world.history.events);
    expect(
      advanced.history.decisionTraces.slice(
        0,
        world.history.decisionTraces.length,
      ),
    ).toEqual(world.history.decisionTraces);
    const saved = serializeWorld(advanced);
    expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
  });
});
