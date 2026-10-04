import { expect, it } from "vitest";
import { assessedCompletedHourlyGrossMinor } from "./completed-hourly-gross";

it("derives the approved four-hour obligation while retaining a stronger contract", () => {
  expect(assessedCompletedHourlyGrossMinor(2000, 240, 7200)).toBe(8000);
  expect(assessedCompletedHourlyGrossMinor(2000, 240, 9000)).toBe(9000);
  expect(assessedCompletedHourlyGrossMinor(0, 240, 7200)).toBe(7200);
});

it("uses actual partial-hour minutes and rounds only the final minor-unit amount", () => {
  expect(assessedCompletedHourlyGrossMinor(1500, 90, 0)).toBe(2250);
  expect(assessedCompletedHourlyGrossMinor(100, 1, 0)).toBe(2);
});

it("refuses invented or unsafe minutes, rates and contractual amounts", () => {
  for (const minutes of [0, -1, 1.5, Number.POSITIVE_INFINITY])
    expect(() =>
      assessedCompletedHourlyGrossMinor(2000, minutes, 7200),
    ).toThrow();
  for (const rate of [-1, Number.NaN, Number.POSITIVE_INFINITY])
    expect(() => assessedCompletedHourlyGrossMinor(rate, 240, 7200)).toThrow();
  for (const gross of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    expect(() => assessedCompletedHourlyGrossMinor(2000, 240, gross)).toThrow();
  expect(() =>
    assessedCompletedHourlyGrossMinor(Number.MAX_VALUE, 240, 7200),
  ).toThrow();
});
