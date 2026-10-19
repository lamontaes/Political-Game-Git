import policies from "./policies.json" with { type: "json" };
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export function compare(base, head) {
  const rows = [...base, ...head];
  if (
    base.length !== policies.measuredRuns ||
    head.length !== policies.measuredRuns
  )
    throw new Error(
      "Expected three independent measured runs for each revision",
    );
  for (const row of rows) {
    if (
      row.schema !== "core2-month-v1" ||
      !row.seed ||
      !row.placeKey ||
      !row.inputHash ||
      row.days !== policies.measuredDays ||
      typeof row.opening?.budget?.passed !== "boolean" ||
      !Number.isFinite(row.millisecondsPerDay) ||
      row.millisecondsPerDay <= 0 ||
      !Number.isFinite(row.peakRssMiB) ||
      row.peakRssMiB <= 0
    )
      throw new Error("Invalid timing or opening-budget receipt");
    for (const key of [
      "seed",
      "placeKey",
      "inputHash",
      "startedAt",
      "days",
      "settings",
      "host",
    ]) {
      if (JSON.stringify(row[key]) !== JSON.stringify(rows[0][key]))
        throw new Error(`Incomparable measurement: ${key}`);
    }
  }
  for (const group of [base, head])
    if (
      group.some(
        (row) =>
          row.revision !== group[0].revision ||
          row.sourcePatchSha256 !== group[0].sourcePatchSha256,
      )
    )
      throw new Error("Revision changed inside measured group");
  const baseMs = median(base.map((row) => row.millisecondsPerDay)),
    headMs = median(head.map((row) => row.millisecondsPerDay)),
    ratio = headMs / baseMs;
  return {
    schema: "core2-paired-v1",
    passed:
      ratio <= policies.maximumRatio &&
      rows.every((row) => row.opening.budget.passed),
    speedPassed: ratio <= policies.maximumRatio,
    openingBudgetPassed: rows.every((row) => row.opening.budget.passed),
    baseRevision: base[0].revision,
    headRevision: head[0].revision,
    seed: base[0].seed,
    placeKey: base[0].placeKey,
    place: base[0].place,
    baseMillisecondsPerDay: baseMs,
    headMillisecondsPerDay: headMs,
    ratio,
    maximumRatio: policies.maximumRatio,
    peakRssMiB: {
      base: Math.max(...base.map((row) => row.peakRssMiB)),
      head: Math.max(...head.map((row) => row.peakRssMiB)),
    },
    opening: { base: base[0].opening, head: head[0].opening },
    yearEstimateScope:
      "Relative estimate from identical 31-day windows; not a full-year two-minute proof",
  };
}
