import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  CANDIDACY_PARAMETERS,
  candidacyModule,
  candidacyReasons,
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
  it("records every adult's decision with its reasons; few run for one seat", () => {
    // Calibrated for the whole town (named and counted adults) to draw one
    // or two challengers per seat: in a town of about a thousand adults,
    // a single seat draws at most a handful.
    const running = candidatesFor(api, "a");
    expect(running.length).toBeLessThan(adults.length * 0.02);
    for (const row of decisions) {
      expect(row.run).toBe(margin(row) > 0);
      expect(Object.keys(row.reasons).sort()).toEqual(
        [
          "age",
          "cause",
          "engagement",
          "field",
          "incumbency",
          "incumbentTie",
          "money",
          "reach",
          "standing",
          "temperament",
          "time",
        ].sort(),
      );
      expect(row.sourceIds).toContain("fixture-contest:a");
    }
    // The same person decides the same way when asked again.
    expect(decideToRun(api, decisions[0]!.personId, contest("a"))).toEqual(
      decisions[0],
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
    expect(again.reasons.cause).toBeGreaterThan(near.reasons.cause!);
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

  // A county's filing fee is often a share of the office's salary (hundreds
  // of dollars); weighed against cash on hand alone, it kept every adult out
  // of every county race. The fee is weighed against what a person has and
  // what their pay brings in while filing is open, and where the law takes
  // signatures in place of the fee, against the signatures their own circle
  // can't supply.
  it("weighs a county's fee against pay and the petition route, and a countywide race's reach", () => {
    const county = {
      ...contest("county"),
      officeName: "County commissioner",
      feeMinor: 85_000,
      countywide: true,
    };
    const workers = adults.filter((row) => {
      const job = row.jobId ? core.jobs.get(row.jobId) : undefined;
      return job && !job.endsAt && job.wageDailyMinor > 0;
    });
    expect(workers.length).toBeGreaterThan(0);
    const window = CANDIDACY_PARAMETERS.candidacyFilingWindowDays!.value;
    for (const row of workers) {
      const pay = core.jobs.get(row.jobId!)!.wageDailyMinor;
      const reasons = candidacyReasons(api, row, county);
      // Their pay (or what they live on) over the filing window counts
      // toward the fee.
      const means =
        row.liquidMinor + Math.max(pay, row.livingCostDailyMinor) * window;
      expect(reasons.money!).toBeCloseTo(
        CANDIDACY_PARAMETERS.candidacyMoneyWeight!.value *
          Math.max(-1, Math.min(1, (means - 85_000) / (means + 85_000 + 1))),
      );
      // A countywide race costs the same reach for everyone.
      expect(reasons.reach).toBe(
        -CANDIDACY_PARAMETERS.candidacyCountywideWeight!.value,
      );
      expect(candidacyReasons(api, row, contest("town")).reach).toBe(0);
    }
    // Someone whose circle can sign their petition files without the fee.
    const known = adults.find((row) => row.knownIds.size > 0)!;
    const petition = candidacyReasons(api, known, {
      ...county,
      signaturesInLieu: known.knownIds.size,
    });
    const free = candidacyReasons(api, known, { ...county, feeMinor: 0 });
    expect(petition.money!).toBeCloseTo(free.money!);
    const half = candidacyReasons(api, known, {
      ...county,
      signaturesInLieu: known.knownIds.size * 2,
    });
    expect(half.money!).toBeLessThan(petition.money!);
    expect(half.money!).toBeGreaterThan(
      candidacyReasons(api, known, county).money!,
    );
  });
});
