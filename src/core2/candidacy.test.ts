import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  candidacyModule,
  candidatesFor,
  decideToRun,
  RUN,
} from "./modules/candidacy";
import { viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { applyCoreEvent, coreAPI } from "./state";

// M2-04: every candidate filed through their own choice, with its reasons:
// how closely they follow politics, the cause they carry, temperament, money
// against the fee, work hours and age. A recorded cause can change who runs.
const seed = process.env.GOLDEN_PATH_SEED ?? "candidacy-a";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 1200,
  }),
);
const core = createLifeCore(input, { modules: [viewsModule, candidacyModule] });
const api = coreAPI(core);
const adults = [...core.people.values()].filter(
  (row) =>
    row.tier !== "husk" &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >= 18,
);
const contest = (id: string) => ({
  contestId: id,
  officeName: "City council",
  filingDeadline: "2021-03-01",
  feeMinor: 5000,
  sourceIds: [`fixture-contest:${id}`],
});
const decisions = adults.map((row) => decideToRun(api, row.id, contest("a"))!);
const margin = (row: (typeof decisions)[number]) =>
  row.scores.find((s) => s.actionId === RUN.id)!.score -
  row.scores.find((s) => s.actionId !== RUN.id)!.score;

describe(`who runs for office in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("has a few residents choose to run, each with the reasons behind it", () => {
    const running = candidatesFor(api, "a");
    expect(running.length).toBeGreaterThan(0);
    expect(running.length).toBeLessThan(adults.length * 0.02);
    for (const row of running) {
      expect(row.run).toBe(true);
      expect(margin(row)).toBeGreaterThan(0);
      expect(Object.keys(row.reasons).sort()).toEqual(
        [
          "age",
          "cause",
          "engagement",
          "incumbency",
          "money",
          "temperament",
          "time",
        ].sort(),
      );
      expect(row.sourceIds).toContain("fixture-contest:a");
    }
    // The same person decides the same way when asked again.
    expect(decideToRun(api, running[0]!.personId, contest("a"))).toEqual(
      running[0],
    );
  });

  it("turns someone into a candidate when they come to carry a cause", () => {
    const near = decisions
      .filter((row) => !row.run)
      .sort((a, b) => margin(b) - margin(a))[0]!;
    const person = core.people.get(near.personId)!;
    applyCoreEvent(core, {
      id: "fixture-road-closed",
      date: core.date,
      kind: "fixture.road-closed",
      personIds: [near.personId],
      placeId: person.placeId,
      topic: "fixture:roads",
      desiredChange: "repair",
      source: { tag: "SOURCED", citation: "Fixture event.", asOf: core.date },
    });
    api.updateDrive(near.personId, {
      id: "fixture-drive",
      kind: "civic",
      sourceEventId: "fixture-road-closed",
      topic: "fixture:roads",
      desiredChange: "repair",
      strength: 1,
    });
    const again = decideToRun(api, near.personId, contest("b"))!;
    expect(again.reasons.cause).toBeGreaterThan(near.reasons.cause);
    expect(again.run).toBe(true);
  });

  it("has most incumbents run again, as about 81% really do", () => {
    const sample = adults.slice(0, 200);
    const again = sample.filter(
      (row) =>
        decideToRun(api, row.id, {
          ...contest(`incumbent:${row.id}`),
          incumbentId: row.id,
        })!.run,
    ).length;
    expect(again / sample.length).toBeGreaterThan(0.65);
    expect(again / sample.length).toBeLessThan(0.95);
  });
});
