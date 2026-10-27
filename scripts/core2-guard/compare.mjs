import policies from "./policies.json" with { type: "json" };
// An even count (a large town whose time budget allowed two pairs) takes the
// mean of the middle two; an odd count its middle value, as before.
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
export function compare(base, head) {
  const rows = [...base, ...head];
  // Base and head runs are measured in pairs, as many as the time budget
  // allows up to measuredRuns (paired.mjs), so the two groups match in size.
  if (
    base.length !== head.length ||
    base.length < 1 ||
    base.length > policies.measuredRuns
  )
    throw new Error(
      "Expected the same one to three independent measured runs for each revision",
    );
  for (const row of rows) {
    if (
      row.schema !== "core2-month-v1" ||
      !row.seed ||
      !row.placeKey ||
      !row.inputHash ||
      !Number.isInteger(row.days) ||
      row.days < policies.warmupDays ||
      row.days > policies.measuredDays ||
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
  // A change to data the opening reads changes the input between base and
  // head; it is timed on the same seed, place, days, settings and host, and
  // reported. Inside one revision the input must not change.
  for (const group of [base, head])
    if (group.some((row) => row.inputHash !== group[0].inputHash))
      throw new Error("Incomparable measurement: inputHash inside a revision");
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
    measuredPairs: base.length,
    measuredDays: base[0].days,
    maximumRatio: policies.maximumRatio,
    peakRssMiB: {
      base: Math.max(...base.map((row) => row.peakRssMiB)),
      head: Math.max(...head.map((row) => row.peakRssMiB)),
    },
    opening: { base: base[0].opening, head: head[0].opening },
    inputHash: {
      base: base[0].inputHash,
      head: head[0].inputHash,
      changed: base[0].inputHash !== head[0].inputHash,
    },
    yearEstimateScope:
      "Relative estimate from identical windows of the measured span; not a full-year two-minute proof",
  };
}
