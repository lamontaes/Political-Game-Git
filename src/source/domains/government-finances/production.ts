/** Publisher fixed-width layouts, independent of the synthetic fixture matrix. */
import {
  openProductionArtifacts,
  readZipMember,
  known,
  unknown,
  notApplicable,
  SourceParseError,
  SourceValidationError,
  corpusCanonicalDigest,
  isCalendarDate,
  isClean,
} from "../../core/index";
import type {
  ArtifactLock,
  ProductionInput,
  OpenedArtifacts,
  Evidence,
  Sourced,
  CompiledCorpus,
} from "../../core/index";
import {
  productionRoles,
  acquisitionPlan as basePlan,
  crosswalkRequest,
  periodRequests,
} from "./acquisition";
import { FINANCE_ITEM_LABELS, STATE_CAPITAL_LABELS } from "./codebook";
import type { FinanceRecord, FinanceCategory } from "./types";
import { validateFinanceCorpus } from "./validate";

export const acquisitionPlan = {
  ...basePlan,
  requests: [...basePlan.requests, crosswalkRequest, ...periodRequests],
};
const roles = {
  ...productionRoles,
  crosswalk: crosswalkRequest.artifactId,
  localMethodology: "census-finance-local-methodology-2024",
  stateTechnical: "census-finance-state-technical-2024",
};
export type FinanceProductionArtifacts = OpenedArtifacts<keyof typeof roles>;
export function openFinanceProduction(
  lock: ArtifactLock,
): ProductionInput<FinanceProductionArtifacts> {
  return openProductionArtifacts("government-finances", lock, roles);
}
function fixedLines(bytes: Uint8Array, widths: readonly number[]): string[] {
  if (bytes.some((byte) => byte > 127))
    throw new SourceParseError("Finance expects ASCII fixed-width bytes.");
  const rows = Buffer.from(bytes).toString("ascii").split(/\r?\n/);
  if (rows.at(-1) === "") rows.pop();
  if (!rows.length || rows.some((row) => !widths.includes(row.length)))
    throw new SourceParseError(
      `Finance schema drift: expected record widths ${widths.join("/")}.`,
    );
  return rows;
}
export interface FinancePublisherRow {
  readonly publisherId: string;
  readonly itemCode: string;
  readonly rawAmount: string;
  readonly surveyYear: number;
  readonly flag: string;
  readonly line: number;
}
export function parseFinancePublisher(
  bytes: Uint8Array,
): readonly FinancePublisherRow[] {
  const seen = new Set<string>();
  // Prose says 32, layout table says 33; actual rows have one flag in 32.
  // Only a blank padding byte is permitted in position 33.
  return fixedLines(bytes, [32, 33]).map((row, index) => {
    const publisherId = row.slice(0, 12),
      itemCode = row.slice(12, 15),
      rawAmount = row.slice(15, 27).trim(),
      year = row.slice(27, 31),
      flag = row.slice(31, 32);
    if (
      !/^\d{12}$/.test(publisherId) ||
      !/^[A-Z0-9]{3}$/.test(itemCode) ||
      year !== "2024" ||
      !"AIMNRS".includes(flag) ||
      (row.length === 33 && row[32] !== " ")
    )
      throw new SourceParseError(
        `Finance line ${index + 1}: invalid ID, year or documented flag.`,
      );
    if (
      rawAmount &&
      (!/^-?\d+$/.test(rawAmount) || !Number.isSafeInteger(Number(rawAmount)))
    )
      throw new SourceParseError(
        "Invalid publisher finance amount; undocumented suppression token is not zero.",
      );
    const key = `${publisherId}:${itemCode}:${year}`;
    if (seen.has(key))
      throw new SourceParseError(`Duplicate finance record ${key}.`);
    seen.add(key);
    return {
      publisherId,
      itemCode,
      rawAmount,
      surveyYear: Number(year),
      flag,
      line: index + 1,
    };
  });
}
export interface FinancePublisherIdentity {
  readonly publisherId: string;
  readonly name: string;
  readonly endingMonthDay: string;
  readonly surveyYear: number;
  readonly line: number;
}
export function parseFinanceIdentities(
  bytes: Uint8Array,
): ReadonlyMap<string, FinancePublisherIdentity> {
  const result = new Map<string, FinancePublisherIdentity>();
  fixedLines(bytes, [146]).forEach((row, index) => {
    const publisherId = row.slice(0, 12),
      endingMonthDay = row.slice(140, 144),
      year = row.slice(144, 146);
    if (
      !/^\d{12}$/.test(publisherId) ||
      year !== "24" ||
      !/^\d{4}$/.test(endingMonthDay) ||
      !/^[0-5]$/.test(publisherId[2] ?? "")
    )
      throw new SourceParseError(
        "Finance identity has missing or malformed ID/MMDD/survey year.",
      );
    if (result.has(publisherId))
      throw new SourceParseError("Duplicate finance identity.");
    result.set(publisherId, {
      publisherId,
      name: row.slice(12, 76).trim(),
      endingMonthDay,
      surveyYear: 2024,
      line: index + 1,
    });
  });
  return result;
}
export function parseFinanceCrosswalk(
  bytes: Buffer,
): ReadonlyMap<string, string> {
  const text = readZipMember(bytes, "PID_GID_Crosswalk.txt").toString("latin1");
  const result = new Map<string, string>();
  for (const row of text.split(/\r?\n/).filter(Boolean)) {
    const pid = row.slice(0, 6),
      gid = row.slice(7, 21);
    if (
      !/^\d{6}$/.test(pid) ||
      !/^\s$/.test(row[6] ?? "") ||
      !/^\d{14}$/.test(gid)
    )
      throw new SourceParseError("Official PID/GID crosswalk schema drift.");
    if (result.has(pid))
      throw new SourceParseError(`Duplicate PID ${pid} in official crosswalk.`);
    result.set(pid, gid);
  }
  return result;
}
/** S means Alternative source, M Unknown, N Not applicable (publisher codebook). */
export function financePublisherAmount(
  row: FinancePublisherRow,
  date: string,
  evidence: Evidence,
): Sourced<number> {
  if (row.flag === "M")
    return unknown("Publisher flag M: Unknown.", [evidence]);
  if (row.flag === "N")
    return notApplicable([evidence], "Publisher flag N: Not applicable.");
  if (!"AIRS".includes(row.flag))
    throw new SourceParseError(`Undocumented finance flag ${row.flag}.`);
  if (row.rawAmount === "")
    return unknown("Publisher amount is blank; no zero reported.", [evidence]);
  if (
    !/^-?\d+$/.test(row.rawAmount) ||
    !Number.isSafeInteger(Number(row.rawAmount))
  )
    throw new SourceParseError("Invalid finance amount.");
  if (!isCalendarDate(date))
    return unknown("Fiscal-year-ending calendar date is not established.", [
      evidence,
    ]);
  return known(Number(row.rawAmount), [evidence], "FINAL", date);
}
/** Only explicitly documented codes enter; the dictionary closes each family. */
export function financePublisherCategory(code: string): FinanceCategory {
  if (!FINANCE_ITEM_LABELS[code])
    throw new SourceParseError(
      `2024 finance codebook does not define publisher item ${code}.`,
    );
  if (["19U", "29U", "39U", "49U", "61V", "64V"].includes(code)) return "DEBT";
  if (["Y07", "Y08", "Y21", "Y61"].includes(code)) return "CASH_AND_SECURITIES";
  if (["Y05", "Y06", "Y14", "Y53"].includes(code) || /^[EFIJLMQS]/.test(code))
    return "EXPENDITURE";
  if (/^[ABCDTUY]/.test(code)) return "REVENUE";
  throw new SourceParseError(`Unmapped finance category ${code}.`);
}
/** State technical documentation p.1 and local methodology define distinct periods. */
export function financePublisherEnding(
  identity: FinancePublisherIdentity,
): string {
  const mm = identity.endingMonthDay.slice(0, 2),
    dd = identity.endingMonthDay.slice(2);
  const isState = identity.publisherId[2] === "0";
  const year =
    isState || Number(mm) <= 6 ? identity.surveyYear : identity.surveyYear - 1;
  const date = `${year}-${mm}-${dd}`;
  if (!isCalendarDate(date))
    throw new SourceParseError(
      `Invalid publisher MMDD ${identity.endingMonthDay}.`,
    );
  return date;
}
// FIPS/USPS pairs transcribed from the finance codebook State Code Definitions.
const STATE_USPS: Readonly<Record<string, string>> = Object.fromEntries(
  "01:AL 02:AK 04:AZ 05:AR 06:CA 08:CO 09:CT 10:DE 11:DC 12:FL 13:GA 15:HI 16:ID 17:IL 18:IN 19:IA 20:KS 21:KY 22:LA 23:ME 24:MD 25:MA 26:MI 27:MN 28:MS 29:MO 30:MT 31:NE 32:NV 33:NH 34:NJ 35:NM 36:NY 37:NC 38:ND 39:OH 40:OK 41:OR 42:PA 44:RI 45:SC 46:SD 47:TN 48:TX 49:UT 50:VT 51:VA 53:WA 54:WV 55:WI 56:WY"
    .split(" ")
    .map((pair) => pair.split(":")),
);
export function adaptFinancePublisher(
  rows: readonly FinancePublisherRow[],
  identities: ReadonlyMap<string, FinancePublisherIdentity>,
  crosswalk: ReadonlyMap<string, string>,
  artifactId: string,
  identityArtifactId: string,
): readonly FinanceRecord[] {
  const result = rows
    .map((row) => {
      const identity = identities.get(row.publisherId);
      if (!identity || identity.surveyYear !== row.surveyYear)
        throw new SourceValidationError(
          `Missing/mismatched official finance identity ${row.publisherId}.`,
        );
      const censusGovId = crosswalk.get(row.publisherId.slice(6));
      if (!censusGovId)
        throw new SourceValidationError(
          `SRC-GOV2 dependency: official PID/GID crosswalk lacks ${row.publisherId.slice(6)}; never match names.`,
        );
      const category = financePublisherCategory(row.itemCode);
      const evidence: Evidence = {
        artifactId,
        locator: {
          kind: "fixed-width-row",
          artifactId,
          line: row.line,
          span: [16, 32],
        },
        providerNativeId: row.publisherId,
      };
      const identityEvidence: Evidence = {
        artifactId: identityArtifactId,
        locator: {
          kind: "fixed-width-row",
          artifactId: identityArtifactId,
          line: identity.line,
          span: [141, 146],
        },
        providerNativeId: row.publisherId,
      };
      const fiscalYearEnding = financePublisherEnding(identity),
        stateFips = row.publisherId.slice(0, 2),
        stateUsps = STATE_USPS[stateFips];
      if (!stateUsps)
        throw new SourceParseError(`Unknown finance FIPS state ${stateFips}.`);
      return {
        recordId: `${censusGovId}:${category}:${row.itemCode}:${row.surveyYear}`,
        censusGovId,
        stateFips,
        stateUsps,
        govTypeCode: row.publisherId.slice(2, 3),
        govName: identity.name,
        surveyYear: row.surveyYear,
        fiscalYearEnding,
        fiscalYearLabel: unknown<string>(
          "Publisher PID layout supplies no government fiscal-year label.",
          [identityEvidence],
        ),
        category,
        itemCode: row.itemCode,
        itemDescription:
          row.publisherId[2] === "0" && STATE_CAPITAL_LABELS[row.itemCode]
            ? STATE_CAPITAL_LABELS[row.itemCode]!
            : FINANCE_ITEM_LABELS[row.itemCode]!,
        units: "USD thousands",
        estimateBasis: "SAMPLE_ESTIMATE" as const,
        amount: financePublisherAmount(row, fiscalYearEnding, evidence),
        evidence,
        publisher: {
          publisherId: row.publisherId,
          pid6: row.publisherId.slice(6),
          rawAmount: row.rawAmount,
          dataFlag: row.flag,
          endingMonthDay: identity.endingMonthDay,
          identityEvidence,
          periodBasis:
            row.publisherId[2] === "0"
              ? ("STATE_SURVEY_YEAR" as const)
              : ("LOCAL_JULY_JUNE" as const),
        },
      };
    })
    .sort((a, b) =>
      a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0,
    );
  if (new Set(result.map((r) => r.recordId)).size !== result.length)
    throw new SourceValidationError(
      "Official crosswalk causes duplicate canonical finance records.",
    );
  return result;
}
export function compileFinanceProduction(
  input: ProductionInput<FinanceProductionArtifacts>,
): CompiledCorpus<FinanceRecord, "production"> {
  const { data, identity, crosswalk } = input.artifacts;
  const records = adaptFinancePublisher(
    parseFinancePublisher(data.bytes),
    parseFinanceIdentities(identity.bytes),
    parseFinanceCrosswalk(crosswalk.bytes),
    data.artifact.artifactId,
    identity.artifact.artifactId,
  );
  const compiled: CompiledCorpus<FinanceRecord, "production"> = {
    corpus: {
      corpusId: "government-finances",
      compiler: { name: "government-finances", version: "2.0.0" },
      parser: { name: "finance-2024-fixed-width", version: "1.0.0" },
      inputs: Object.values(input.artifacts).map((item) => ({
        artifactId: item.artifact.artifactId,
        sha256: item.artifact.bytes.sha256,
      })),
      asOf: [...records.map((r) => r.fiscalYearEnding)].sort().at(-1)!,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "2024 Census finance sample inputs, not reviewed individual-unit time series.",
        boundedSampleReason:
          "First 25 sorted publisher IDs and their published item rows. Annual survey sample, not complete universe. The Census Bureau has not reviewed individual units as time series or sanctioned downstream analyses; nonsampling errors and imputation may affect values. See locked publisher disclaimer.",
      },
    },
    records,
  };
  const report = validateFinanceCorpus(compiled);
  if (!isClean(report))
    throw new SourceValidationError(
      `Finance production gate: ${report.findings.find((f) => f.severity === "error")?.message}`,
    );
  return compiled;
}
