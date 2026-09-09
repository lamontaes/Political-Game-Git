import { compactInstitution } from "../../../education/compact";
import type { CompactInstitution } from "../../../education/compact";
import {
  openProductionArtifacts,
  readZipMember,
  parseDelimited,
  corpusCanonicalDigest,
  readXlsxSheet,
} from "../../core/index";
import type {
  SourceDomainModule,
  ArtifactLock,
  CompiledCorpus,
  OpenedArtifact,
} from "../../core/index";
import type {
  EducationInstitution,
  EducationCapability,
} from "../../../education/types";
import { educationAcquisition } from "./acquisition";
export type { EducationInstitution } from "../../../education/types";
const CCD = "ccd-2024-25-preliminary";
const SCHOOL = "ccd_sch_029_2425_w_0a_051425.csv";
const LEA = "ccd_lea_029_2425_w_0a_051425.csv";
function rows(a: OpenedArtifact, member: string) {
  const parsed = parseDelimited(readZipMember(a.bytes, member), {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: true,
  });
  if (parsed.defects.length || !parsed.header)
    throw new Error(`Invalid ${member}: ${JSON.stringify(parsed.defects[0])}`);
  const headers = parsed.header;
  return parsed.rows.map((row) => ({
    line: row.line,
    data: Object.fromEntries(headers.map((h, i) => [h, row.fields[i] ?? ""])),
  }));
}
function evidence(a: OpenedArtifact, member: string, row: number) {
  return {
    artifactId: a.artifact.artifactId,
    sha256: a.artifact.bytes.sha256,
    member,
    row,
  };
}
function code(value: string | undefined, width: number) {
  return value && /^\d+$/.test(value) ? value.padStart(width, "0") : null;
}
function date(value: string | undefined) {
  const m = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}
export function compileEducation(
  lock: ArtifactLock,
): CompiledCorpus<CompactInstitution, "production"> {
  const roles = Object.fromEntries(
    educationAcquisition.requests.map((r) => [r.artifactId, r.artifactId]),
  );
  const opened = openProductionArtifacts("education", lock, roles).artifacts;
  const ccd = opened[CCD]!;
  // The dictionaries are required locked inputs, not optional explanatory links.
  const schDictionary = readXlsxSheet(
    readZipMember(
      ccd.bytes,
      "SY 2024-25 School Directory Companion 2025-046d.xlsx",
    ),
    "File Layout",
  ).rows;
  const leaDictionary = readXlsxSheet(
    readZipMember(
      ccd.bytes,
      "SY 2024-25 LEA Directory Companion 2025-046d.xlsx",
    ),
    "File Layout",
  ).rows;
  for (const dictionary of [schDictionary, leaDictionary])
    for (const field of ["LEAID", "FIPST", "UPDATED_STATUS", "EFFECTIVE_DATE"])
      if (!dictionary.some((r) => r[1] === field))
        throw new Error(`CCD dictionary missing ${field}`);
  const result: EducationInstitution[] = [];
  for (const [member, kind, dictionary] of [
    [LEA, "district", leaDictionary],
    [SCHOOL, "school", schDictionary],
  ] as const) {
    for (const row of rows(ccd, member)) {
      const d = row.data,
        officialId = d[kind === "school" ? "NCESSCH" : "LEAID"]!;
      if (!new RegExp(`^\\d{${kind === "school" ? 12 : 7}}$`).test(officialId))
        throw new Error(`Invalid CCD ID ${officialId}`);
      const caps: EducationCapability[] = dictionary
        .filter((r) => /^G_.+_OFFERED$/.test(r[1] ?? ""))
        .map((r) => {
          const raw = d[r[1]!] ?? "";
          return {
            code: r[1]!,
            label: r[6]!,
            kind: "grade",
            raw,
            state:
              raw === "Yes"
                ? "offered"
                : raw === "No"
                  ? "not-offered"
                  : "unknown",
          };
        });
      result.push({
        id: `nces-${kind === "school" ? "sch" : "lea"}:${officialId}`,
        officialId,
        kind,
        name: d[kind === "school" ? "SCH_NAME" : "LEA_NAME"]!,
        city: d.LCITY!,
        state: d.ST!,
        stateFips: code(d.FIPST, 2),
        countyGeoid: null,
        parentDistrictId: kind === "school" ? `nces-lea:${d.LEAID}` : null,
        sourceYear: "2024-25",
        release: "preliminary v0a",
        statusCode: d.UPDATED_STATUS!,
        statusLabel: d.UPDATED_STATUS_TEXT!,
        statusEffectiveDate: date(d.EFFECTIVE_DATE),
        foundingDate: null,
        capabilities: caps,
        openAdmissionPolicy: "unknown",
        evidence: [evidence(ccd, member, row.line)],
      });
    }
  }
  for (const year of [2024, 2025] as const) {
    const hdKey = `HD${year}`,
      icKey = `IC${year}`;
    const hdMember = `hd${year}.csv`,
      icMember = year === 2024 ? "ic2024_rv.csv" : "ic2025.csv";
    const icDictionary = readZipMember(
      opened[`${icKey}_Dict`]!.bytes,
      `ic${year}.xlsx`,
    );
    const labels = new Map(
      readXlsxSheet(icDictionary, "Varlist").rows.map((r) => [
        r[1],
        r[6]?.replace(/_x000D_/g, "").trim(),
      ]),
    );
    const hdDictionary = readXlsxSheet(
      readZipMember(opened[`${hdKey}_Dict`]!.bytes, `hd${year}.xlsx`),
      "Varlist",
    ).rows;
    if (!hdDictionary.some((r) => r[1] === "COUNTYCD"))
      throw new Error("HD dictionary missing COUNTYCD");
    const capabilities = rows(opened[icKey]!, icMember);
    const byUnit = new Map(capabilities.map((r) => [r.data.UNITID, r]));
    if (byUnit.size !== capabilities.length)
      throw new Error("Duplicate IC UNITID");
    const hd = rows(opened[hdKey]!, hdMember);
    for (const row of hd) {
      const d = row.data;
      const ic = byUnit.get(d.UNITID);
      const caps: EducationCapability[] = [];
      if (ic)
        for (const [field, label] of labels)
          if (field && /^(LEVEL\d|NONCRDT[1-8]$)/.test(field)) {
            const raw = ic.data[field] ?? "";
            caps.push({
              code: field,
              label: label!,
              kind: field.startsWith("LEVEL") ? "award" : "noncredit",
              raw,
              state:
                raw === "1"
                  ? "offered"
                  : raw === "0"
                    ? "not-offered"
                    : raw === "-2"
                      ? "not-applicable"
                      : "unknown",
            });
          }
      result.push({
        id: `ipeds-unit:${d.UNITID}`,
        officialId: d.UNITID!,
        kind: "postsecondary",
        name: d.INSTNM!,
        city: d.CITY!,
        state: d.STABBR!,
        stateFips: code(d.FIPS, 2),
        countyGeoid: code(d.COUNTYCD, 5),
        parentDistrictId: null,
        sourceYear: year === 2024 ? "2024-25" : "2025-26",
        release:
          year === 2024
            ? "HD2024 directory; IC2024 revised member (September 2026)"
            : "HD2025/IC2025 provisional",
        statusCode: d.ACT!,
        statusLabel:
          (
            {
              A: "Active",
              N: "New",
              R: "Restored",
              M: "Closed in current year",
              C: "Combined",
              D: "Out of business",
              G: "Child campus",
            } as Record<string, string>
          )[d.ACT!] ?? "Unknown status",
        statusEffectiveDate: null,
        foundingDate: null,
        capabilities: caps,
        openAdmissionPolicy:
          ic?.data.OPENADMP === "1"
            ? "reported-yes"
            : ic?.data.OPENADMP === "2"
              ? "reported-no"
              : "unknown",
        evidence: [
          evidence(opened[hdKey]!, hdMember, row.line),
          ...(ic ? [evidence(opened[icKey]!, icMember, ic.line)] : []),
        ],
      });
    }
    const joined = new Set(hd.map((r) => r.data.UNITID));
    for (const id of byUnit.keys())
      if (!joined.has(id))
        throw new Error(`Unjoined IC${year} institution ${id}`);
  }
  const ids = new Set(result.map((r) => r.id));
  if (
    new Set(result.map((r) => `${r.id}:${r.sourceYear}`)).size !== result.length
  )
    throw new Error("Duplicate institution ID");
  for (const r of result)
    if (r.parentDistrictId && !ids.has(r.parentDistrictId))
      throw new Error(`Missing LEA ${r.parentDistrictId}`);
  result.sort(
    (a, b) =>
      a.id.localeCompare(b.id, "en") ||
      a.sourceYear.localeCompare(b.sourceYear),
  );
  const compact = result.map(compactInstitution);
  return {
    corpus: {
      corpusId: "education",
      compiler: { name: "education", version: "1.0.0" },
      parser: { name: "nces-directory-offerings", version: "1.0.0" },
      inputs: lock.artifacts.map((a) => ({
        artifactId: a.artifactId,
        sha256: a.bytes.sha256,
      })),
      asOf: "2024-07-01",
      recordCount: result.length,
      canonicalSha256: corpusCanonicalDigest(compact),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "All rows of the acquired CCD 2024-25 preliminary school/LEA directories and HD2024/HD2025, joined to every IC2024 revised and IC2025 provisional offerings row. No school-count ceiling.",
        boundedSampleReason:
          "Publisher product scope: public K-12 and IPEDS reporting institutions only; Alaska preliminary submission limitations and all source-year limits remain. Not all real schools or historical years; no admissions, attendance, exact tuition or major-level offerings.",
      },
    },
    records: compact,
  };
}
export const sourceDomain: SourceDomainModule<CompactInstitution> = {
  domain: "education",
  compilerVersion: "1.0.0",
  acquisitionPlan: educationAcquisition,
  lockPath: "data/source/education/artifact-lock.json",
  compileProduction: compileEducation,
  validateCorpus(corpus) {
    return {
      domain: "education",
      checked: corpus.records.length,
      findings: corpus.records
        .filter((r) => !r[2] || !r[0])
        .map((r) => ({
          severity: "error" as const,
          code: "identity",
          message: "Missing institution identity",
          recordId: r[0],
        })),
    };
  },
};
