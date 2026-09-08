/** 2025 ASPEP publisher parser. Never passes publisher flags through fixture parsing. */
import {
  corpusCanonicalDigest,
  openProductionArtifacts,
  known,
  unknown,
  SourceParseError,
  SourceValidationError,
  isClean,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  Evidence,
  OpenedArtifacts,
  ProductionInput,
  Sourced,
} from "../../core/index";
import type { EmploymentRecord } from "./types";
import { acquisitionPlan, productionRoles } from "./acquisition";
import { FUNCTION_LABELS, STATE_USPS } from "./codebook";
import { validateEmploymentCorpus } from "./validate";

export { acquisitionPlan };
export type EmploymentProductionArtifacts = OpenedArtifacts<
  keyof typeof productionRoles
>;
export function openEmploymentProduction(
  lock: ArtifactLock,
): ProductionInput<EmploymentProductionArtifacts> {
  return openProductionArtifacts("public-employment", lock, productionRoles);
}

function lines(bytes: Uint8Array, width: number): string[] {
  if (bytes.some((byte) => byte > 127))
    throw new SourceParseError("ASPEP expects ASCII fixed-width bytes.");
  const rows = Buffer.from(bytes).toString("ascii").split(/\r?\n/);
  if (rows.at(-1) === "") rows.pop();
  if (!rows.length || rows.some((row) => row.length !== width))
    throw new SourceParseError(
      `ASPEP requires exactly ${width} characters per record; missing fields or schema drift.`,
    );
  return rows;
}
export interface EmploymentPublisherIdentity {
  readonly legacyId: string;
  readonly pid6: string;
  readonly name: string;
  readonly stateFips: string;
  readonly stateUsps: string;
  readonly govTypeCode: string;
  readonly line: number;
}
export function parseEmploymentIdentities(
  bytes: Uint8Array,
): ReadonlyMap<string, EmploymentPublisherIdentity> {
  const result = new Map<string, EmploymentPublisherIdentity>();
  const pids = new Set<string>();
  lines(bytes, 213).forEach((row, index) => {
    const legacyId = row.slice(0, 14),
      pid6 = row.slice(207, 213);
    const stateUsps = STATE_USPS[Number(row.slice(0, 2))];
    if (
      !/^\d{14}$/.test(legacyId) ||
      !/^\d{6}$/.test(pid6) ||
      !stateUsps ||
      !/^[0-5]$/.test(row[2] ?? "") ||
      !/^\d{2}$/.test(row.slice(109, 111))
    )
      throw new SourceParseError(
        `ASPEP identity line ${index + 1} is malformed.`,
      );
    if (result.has(legacyId) || pids.has(pid6))
      throw new SourceParseError("Duplicate ASPEP government identity.");
    pids.add(pid6);
    result.set(legacyId, {
      legacyId,
      pid6,
      name: row.slice(14, 78).trim(),
      stateFips: row.slice(109, 111),
      stateUsps,
      govTypeCode: row.slice(2, 3),
      line: index + 1,
    });
  });
  return result;
}
export interface EmploymentPublisherRow {
  readonly legacyId: string;
  readonly pid6: string;
  readonly functionCode: string;
  readonly measures: readonly {
    readonly raw: string;
    readonly flag: string;
    readonly span: readonly [number, number];
  }[];
  readonly line: number;
}
export function parseEmploymentPublisher(
  bytes: Uint8Array,
): readonly EmploymentPublisherRow[] {
  const seen = new Set<string>();
  return lines(bytes, 80).map((row, index) => {
    const legacyId = row.slice(0, 14),
      pid6 = row.slice(74, 80),
      functionCode = row.slice(17, 20);
    if (
      !/^\d{14}$/.test(legacyId) ||
      !/^\d{6}$/.test(pid6) ||
      !FUNCTION_LABELS[functionCode]
    )
      throw new SourceParseError(
        `ASPEP line ${index + 1}: unknown identity/function code.`,
      );
    if (
      row.slice(14, 17).trim() ||
      row[30] !== " " ||
      row[44] !== " " ||
      row[56] !== " " ||
      row[70] !== " " ||
      row.slice(72, 74).trim()
    )
      throw new SourceParseError("ASPEP reserved columns changed.");
    const key = `${legacyId}:${functionCode}`;
    if (seen.has(key))
      throw new SourceParseError(`Duplicate ASPEP record ${key}.`);
    seen.add(key);
    const measures = (
      [
        [20, 30, 31],
        [32, 44, 45],
        [46, 56, 57],
        [58, 70, 71],
      ] as const
    ).map(([start, end, flagAt]) => {
      const raw = row.slice(start, end).trim(),
        flag = row[flagAt] ?? "";
      // Section 2.4 lists reported and imputed flags, no suppression sentinel.
      if (!"CKRTUVZABDGJPQX".includes(flag) || flag === "")
        throw new SourceParseError(
          `Undocumented ASPEP data flag "${flag}"; do not infer suppression or zero.`,
        );
      if (raw && (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))))
        throw new SourceParseError(`Invalid ASPEP numeric cell "${raw}".`);
      return { raw, flag, span: [start + 1, end] as const };
    });
    return { legacyId, pid6, functionCode, measures, line: index + 1 };
  });
}
export function adaptEmploymentPublisher(
  data: readonly EmploymentPublisherRow[],
  identities: ReadonlyMap<string, EmploymentPublisherIdentity>,
  artifactId: string,
  identityArtifactId: string,
  codebookArtifactId: string,
): readonly EmploymentRecord[] {
  return data
    .map((row) => {
      const identity = identities.get(row.legacyId);
      if (!identity || identity.pid6 !== row.pid6)
        throw new SourceValidationError(
          `ASPEP official identifier join failed for ${row.legacyId}/${row.pid6}; no name matching.`,
        );
      const evidence: Evidence = {
        artifactId,
        locator: { kind: "fixed-width-row", artifactId, line: row.line },
        providerNativeId: row.legacyId,
      };
      const identityEvidence: Evidence = {
        artifactId: identityArtifactId,
        locator: {
          kind: "fixed-width-row",
          artifactId: identityArtifactId,
          line: identity.line,
        },
        providerNativeId: identity.pid6,
      };
      const measure = (index: number): Sourced<number> => {
        const cell = row.measures[index];
        if (!cell) throw new SourceParseError("ASPEP missing measure column.");
        const cellEvidence: Evidence = {
          ...evidence,
          locator: {
            kind: "fixed-width-row",
            artifactId,
            line: row.line,
            span: cell.span,
          },
        };
        return cell.raw === ""
          ? unknown("Publisher cell is blank; no reported zero.", [
              cellEvidence,
            ])
          : known(
              Number(cell.raw),
              [cellEvidence],
              "FINAL",
              index === 1 || index === 3 ? "2025-03-31" : "2025-03-12",
            );
      };
      return {
        recordId: `${row.legacyId}:${row.functionCode}:2025`,
        censusGovId: row.legacyId,
        stateFips: identity.stateFips,
        stateUsps: identity.stateUsps,
        govTypeCode: identity.govTypeCode,
        govName: identity.name,
        referenceYear: 2025,
        referenceDate: "2025-03-12",
        functionCode: row.functionCode,
        functionLabel: FUNCTION_LABELS[row.functionCode]!,
        estimateBasis: "SAMPLE_ESTIMATE" as const,
        employmentUnits: "employees (headcount)",
        payrollUnits: "USD (31-day March payroll)",
        fullTimeEmployees: measure(0),
        fullTimePayroll: measure(1),
        partTimeEmployees: measure(2),
        partTimePayroll: measure(3),
        fullTimeEquivalent: unknown<number>(
          "2025 ASPEP individual-unit file section 1.1 publishes no FTE field; it cannot be inferred from headcount.",
          [
            {
              artifactId: codebookArtifactId,
              locator: {
                kind: "table-cell",
                artifactId: codebookArtifactId,
                table: "Section 1.1",
                lineCode: "file layout",
                period: "2025",
              },
            },
          ],
        ),
        evidence,
        publisher: {
          pid6: row.pid6,
          identityEvidence,
          dataFlags: row.measures.map((cell) => cell.flag),
          payrollPeriod: { start: "2025-03-01", end: "2025-03-31" },
        },
      };
    })
    .sort((a, b) =>
      a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0,
    );
}
export function compileEmploymentProduction(
  input: ProductionInput<EmploymentProductionArtifacts>,
): CompiledCorpus<EmploymentRecord, "production"> {
  const { data, identity, codebook } = input.artifacts;
  const records = adaptEmploymentPublisher(
    parseEmploymentPublisher(data.bytes),
    parseEmploymentIdentities(identity.bytes),
    data.artifact.artifactId,
    identity.artifact.artifactId,
    codebook.artifact.artifactId,
  );
  const compiled: CompiledCorpus<EmploymentRecord, "production"> = {
    corpus: {
      corpusId: "public-employment",
      compiler: { name: "public-employment", version: "2.0.0" },
      parser: { name: "aspep-2025-fixed-width", version: "1.0.0" },
      inputs: Object.values(input.artifacts).map((item) => ({
        artifactId: item.artifact.artifactId,
        sha256: item.artifact.bytes.sha256,
      })),
      asOf: "2025-03-31",
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "2025 ASPEP individual-government sample observations; Census Bureau source data, not a reviewed individual-unit time series.",
        boundedSampleReason:
          "Committed QA slice: first 25 nonzero legacy IDs sorted lexicographically in 25empid.txt and all matching 25empst.txt rows. Annual survey sample, not census universe. Reported/imputed flags retained; FTE unavailable. Census has not reviewed individual-unit time series or sanctioned analyses; sampling and nonsampling errors may affect these data. See locked publisher disclaimer.",
      },
    },
    records,
  };
  if (!isClean(validateEmploymentCorpus(compiled)))
    throw new SourceValidationError("ASPEP production validation failed.");
  return compiled;
}
