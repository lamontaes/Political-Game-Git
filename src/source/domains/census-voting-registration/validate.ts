import { corpusCanonicalDigest } from "../../core/index";
import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { CpsVotingRecord } from "./types";
import { CPS_METRICS } from "./parse";

export function validateCpsVoting(
  compiled: CompiledCorpus<CpsVotingRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const fail = (code: string, message: string, recordId?: string) =>
    findings.push({
      severity: "error",
      code,
      message,
      ...(recordId ? { recordId } : {}),
    });
  const rows = compiled.records;
  if (corpusCanonicalDigest(rows) !== compiled.corpus.canonicalSha256)
    fail("cps/digest", "Corpus digest does not match records");
  if (new Set(rows.map((r) => r.recordId)).size !== rows.length)
    fail("cps/duplicate", "Duplicate row identity");
  const totals = rows.filter((r) => r.table === "4a");
  for (const row of rows) {
    if (
      row.period !== "2024-11" ||
      row.releaseDate !== "2025-04-30" ||
      row.universe !== "civilian-noninstitutionalized-age-18-and-over" ||
      row.collection !== "self-or-proxy-reported"
    )
      fail("cps/universe", "Unexpected reference/universe", row.recordId);
    for (const key of CPS_METRICS) {
      const cell = row.metrics[key];
      if (!cell) {
        fail("cps/missing-cell", `Missing ${key}`, row.recordId);
        continue;
      }
      const count = [
        "adultPopulation",
        "citizenAdultPopulation",
        "reportedRegistered",
        "reportedVoted",
      ].includes(key);
      const expectedUnit = count
        ? "people"
        : key.endsWith("Moe")
          ? "percentage-points"
          : "percent";
      if (
        cell.unit !== expectedUnit ||
        cell.publishedResolution !== (count ? 1000 : 0.1)
      )
        fail(
          "cps/unit",
          "Metric unit or published precision changed",
          row.recordId,
        );
      if (
        cell.evidence.artifactId !== `cps-2024-vote0${row.table}` ||
        cell.evidence.locator.kind !== "table-cell"
      )
        fail(
          "cps/evidence",
          "Metric does not cite its published table cell",
          row.recordId,
        );
      if (cell.value.state === "HISTORICAL") {
        if (
          cell.value.period.start !== "2024-11-01" ||
          cell.value.period.end !== "2024-11-30"
        )
          fail("cps/reference-period", "Survey period changed", row.recordId);
        const n = cell.value.value;
        if (
          !Number.isFinite(n) ||
          n < 0 ||
          (cell.unit === "percent" && n > 100)
        )
          fail("cps/value", `Invalid ${key}`, row.recordId);
        if (
          cell.unit === "people" &&
          (cell.denominator !== "none" ||
            cell.publishedResolution !== 1000 ||
            n % 1000 !== 0)
        )
          fail("cps/count-unit", "Count scale changed", row.recordId);
        if (
          key.endsWith("Moe") &&
          (cell.unit !== "percentage-points" || cell.confidenceLevel !== 90)
        )
          fail("cps/moe", "MOE meaning changed", row.recordId);
        if (key.includes("Citizen") && cell.denominator !== "citizen-adults")
          fail(
            "cps/denominator",
            "Citizen rate denominator changed",
            row.recordId,
          );
        if (key.includes("Total") && cell.denominator !== "total-adults")
          fail(
            "cps/denominator",
            "Total adult rate denominator changed",
            row.recordId,
          );
      } else if ("value" in cell.value)
        fail(
          "cps/unresolved-number",
          "Unresolved source value carries a number",
          row.recordId,
        );
    }
    if (row.group === "Total" && row.table !== "4a") {
      const total = totals.find((r) => r.geographyName === row.geographyName);
      if (
        !total ||
        CPS_METRICS.some(
          (k) => row.metrics[k].literal !== total.metrics[k].literal,
        )
      )
        fail(
          "cps/totals",
          "Published total differs across tables",
          row.recordId,
        );
    }
  }
  if (compiled.corpus.inputClass === "production") {
    if (rows.length !== 936 || totals.length !== 52)
      fail(
        "cps/coverage",
        "Expected three bounded published tables (936 rows / 52 total geographies)",
      );
    for (const [table, size] of [
      ["4a", 1],
      ["4b", 11],
      ["4c", 6],
    ] as const) {
      for (const total of totals)
        if (
          rows.filter(
            (r) => r.table === table && r.geographyName === total.geographyName,
          ).length !== size
        )
          fail("cps/groups", `Incomplete ${table} for ${total.geographyName}`);
    }
    if (
      !totals.some((r) => r.geographyName === "DISTRICT OF COLUMBIA") ||
      !totals.some((r) => r.geographyName === "UNITED STATES")
    )
      fail("cps/geography", "Missing District or national reference");
  }
  return {
    domain: "census-voting-registration",
    checked: rows.length,
    findings,
  };
}
