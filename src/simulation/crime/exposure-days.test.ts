// Load the world entrypoint first, in the game's canonical cold-load order.
import "../world";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { exposureDays, type ExposureClock } from "./producer";

const since = makeIsoDate("2026-01-01");
// producer.ts uses 365.25 days per year; this rate earns one offense per four days.
const clock: ExposureClock = {
  since,
  startingExposure: 0,
  recorded: 0,
  annualRate: 365.25 / 4,
};

describe("bounded crime exposure days", () => {
  it.each([0.0001, 0.000001, Number.MIN_VALUE])(
    "returns no offense in a month at annual rate %s without constructing its distant date",
    (annualRate) => {
      // At 0.0001/year the first offense lies beyond year 9999. Smaller
      // rates also exceed Date's range or underflow when converted per day.
      // The month is still valid and has no offense due.
      expect(
        exposureDays(
          { ...clock, annualRate },
          since,
          makeIsoDate("2026-01-31"),
        ),
      ).toEqual([]);
    },
  );

  it.each([0, -1, -Infinity, NaN])(
    "returns no offense for inactive annual rate %s",
    (annualRate) => {
      expect(
        exposureDays(
          { ...clock, annualRate },
          since,
          makeIsoDate("2026-01-31"),
        ),
      ).toEqual([]);
    },
  );

  it("includes the threshold on the final day, then excludes it once recorded", () => {
    const threshold = makeIsoDate("2026-01-04");
    expect(exposureDays(clock, since, makeIsoDate("2026-01-03"))).toEqual([]);
    expect(exposureDays(clock, since, threshold)).toEqual([threshold]);
    expect(exposureDays(clock, threshold, threshold)).toEqual([threshold]);
    expect(
      exposureDays({ ...clock, recorded: 1 }, threshold, threshold),
    ).toEqual([]);
  });

  it("preserves the same offense dates when an inclusive span is replayed in parts", () => {
    const end = makeIsoDate("2026-01-12");
    const expected = [
      makeIsoDate("2026-01-04"),
      makeIsoDate("2026-01-08"),
      end,
    ];
    expect(exposureDays(clock, since, end)).toEqual(expected);
    expect([
      ...exposureDays(clock, since, makeIsoDate("2026-01-04")),
      ...exposureDays(
        { ...clock, recorded: 1 },
        makeIsoDate("2026-01-05"),
        end,
      ),
    ]).toEqual(expected);
  });

  it("keeps an already owed offense on the first requested day", () => {
    const from = makeIsoDate("2026-01-06");
    expect(exposureDays(clock, from, makeIsoDate("2026-01-08"))).toEqual([
      from,
      makeIsoDate("2026-01-08"),
    ]);
    expect(
      exposureDays({ ...clock, startingExposure: 0.5 }, since, since),
    ).toEqual([]);
    expect(
      exposureDays(
        { ...clock, startingExposure: 0.5 },
        since,
        makeIsoDate("2026-01-02"),
      ),
    ).toEqual([makeIsoDate("2026-01-02")]);
  });

  it("does not emit an offense before exposure begins", () => {
    expect(
      exposureDays(
        { ...clock, since: makeIsoDate("2026-02-01") },
        since,
        makeIsoDate("2026-01-31"),
      ),
    ).toEqual([]);
  });
});
