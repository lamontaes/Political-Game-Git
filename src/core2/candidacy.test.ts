import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  CANDIDACY_PARAMETERS,
  candidacyModule,
  candidacyReasons,
  candidatesFor,
  platformFromViews,
  decideToRun,
  RUN,
} from "./modules/candidacy";
import { viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { applyCoreEvent, coreAPI } from "./state";

// M2-04: every candidate filed through their own choice, with its reasons:
// how closely they follow politics, the cause they carry, temperament, work
// hours and age. A recorded cause can change who runs.
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
  sourceIds: [`fixture-contest:${id}`],
});
const decisions = adults.map((row) => decideToRun(api, row.id, contest("a"))!);
const margin = (row: (typeof decisions)[number]) =>
  row.scores.find((s) => s.actionId === RUN.id)!.score -
  row.scores.find((s) => s.actionId !== RUN.id)!.score;

describe(`who runs for office in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("keeps a candidate's position strength instead of turning every position into an absolute", () => {
    const platforms = adults.map((person) => platformFromViews(api, person.id));
    const positions = platforms.flatMap((platform) =>
      platform.map((part) => Number(part.slice(part.lastIndexOf("=") + 1))),
    );
    expect(positions.length).toBeGreaterThan(0);
    expect(
      positions.every(
        (position) => Number.isFinite(position) && Math.abs(position) <= 1,
      ),
    ).toBe(true);
    expect(
      positions.some(
        (position) => Math.abs(position) > 0 && Math.abs(position) < 1,
      ),
    ).toBe(true);
  });

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
          "afterOffice",
          "age",
          "cause",
          "engagement",
          "field",
          "incumbency",
          "incumbentTie",
          "openSeat",
          "reach",
          "recordGap",
          "standing",
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
      kind: "cause",
      sourceEventId: "fixture-road-closed",
      topic: "fixture:roads",
      desiredChange: "repair",
      strength: 1,
    });
    const again = decideToRun(api, near.personId, contest("b"))!;
    expect(again.reasons.cause).toBeGreaterThan(near.reasons.cause!);
    expect(again.run).toBe(true);
  });

  it("gives a grudge or family drive no push to file, and a cause drive one", () => {
    const person = adults.find((row) => row.drives.size === 0)!;
    applyCoreEvent(core, {
      id: "fixture-kinds-event",
      date: core.date,
      kind: "fixture.kinds",
      personIds: [person.id],
      placeId: person.placeId,
      topic: "fixture:kinds",
      desiredChange: "repair",
      source: { tag: "SOURCED", citation: "Fixture event.", asOf: core.date },
    });
    const base = candidacyReasons(api, person, contest("kinds")).cause!;
    for (const kind of ["grudge", "protect-family", "status-ambition"])
      api.updateDrive(person.id, {
        id: `fixture-${kind}`,
        kind,
        sourceEventId: "fixture-kinds-event",
        topic: "fixture:kinds",
        desiredChange: "repair",
        strength: 1,
      });
    expect(candidacyReasons(api, person, contest("kinds")).cause).toBe(base);
    api.updateDrive(person.id, {
      id: "fixture-cause-kind",
      kind: "cause",
      sourceEventId: "fixture-kinds-event",
      topic: "fixture:kinds",
      desiredChange: "repair",
      strength: 1,
    });
    expect(
      candidacyReasons(api, person, contest("kinds")).cause,
    ).toBeGreaterThan(base);
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

  // No one pays to file (owner, Oct 13): what filing would cost is no
  // reason at all; a countywide race weighs only its wider reach.
  it("weighs no filing cost, and a countywide race's reach", () => {
    const county = {
      ...contest("county"),
      officeName: "County commissioner",
      countywide: true,
    };
    for (const row of adults) {
      const reasons = candidacyReasons(api, row, county);
      expect(reasons).not.toHaveProperty("money");
      // A countywide race costs the same reach for everyone.
      expect(reasons.reach).toBe(
        -CANDIDACY_PARAMETERS.candidacyCountywideWeight!.value,
      );
      expect(candidacyReasons(api, row, contest("town")).reach).toBe(0);
    }
  });
});
