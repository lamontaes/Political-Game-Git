import { describe, expect, it } from "vitest";
import { metricsChange, metricsFigure } from "./ui/metrics-change.mjs";

// A Metrics row's change from last year is the difference of the two figures the row shows
// (Words lead, Nov 13: "$209,000 / last year $207,000, up $2,200"). The figures are
// rounded to three figures for display, so a change taken from the raw values disagreed.
describe("Metrics change from last year comes from the shown figures", () => {
  const row = (unit: string, now: number, before: number | null) => ({
    unit,
    now,
    before,
  });

  it("home value: $209,400 against $207,200 shows $209,000, $207,000 and up $2,000", () => {
    const r = row("money", 20_940_000, 20_720_000);
    expect(metricsFigure(r, r.now, "%")).toBe("$209,000");
    expect(metricsFigure(r, r.before!, "%")).toBe("$207,000");
    expect(metricsChange(r)).toEqual({ direction: "up", size: "$2,000" });
  });

  it("dollars: rent $1,231.20 against $1,228.80 shows $1,230 both ways and no change", () => {
    const r = row("dollars", 1231.2, 1228.8);
    expect(metricsFigure(r, r.now, "%")).toBe("$1,230");
    expect(metricsFigure(r, r.before!, "%")).toBe("$1,230");
    expect(metricsChange(r)).toEqual({ direction: "same", size: "" });
  });

  it("down, and the size is the shown difference", () => {
    const r = row("money", 20_720_000, 20_940_000);
    expect(metricsChange(r)).toEqual({ direction: "down", size: "$2,000" });
  });

  it("millions use the shown tenths", () => {
    const r = row("money", 524_900_000, 515_100_000);
    expect(metricsFigure(r, r.now, "%")).toBe("$5.2 million");
    expect(metricsFigure(r, r.before!, "%")).toBe("$5.2 million");
    expect(metricsChange(r).direction).toBe("same");
  });

  it("counts and percents use their shown figures", () => {
    expect(metricsChange(row("count", 1000.4, 999.6))).toEqual({
      direction: "same",
      size: "",
    });
    expect(metricsChange(row("count", 1500.4, 1000.6))).toEqual({
      direction: "up",
      size: "499",
    });
    expect(metricsChange(row("percent", 5.04, 4.96))).toEqual({
      direction: "same",
      size: "",
    });
    expect(metricsChange(row("percent", 5.2, 4.8))).toEqual({
      direction: "up",
      size: "0.4",
    });
  });

  it("no last year, no change", () => {
    expect(metricsChange(row("money", 1, null))).toEqual({
      direction: null,
      size: "",
    });
  });
});
