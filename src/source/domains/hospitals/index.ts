import {
  corpusCanonicalDigest,
  openCachedProductionArtifacts,
  openProductionArtifacts,
  parseDelimited,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  OpenedArtifact,
  SourceDomainModule,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import {
  HOSPITALS_AS_OF,
  HOSPITAL_GENERAL_ARTIFACT,
  HOSPITAL_POS_ARTIFACT,
  hospitalsAcquisition,
} from "./acquisition";
import type { HospitalEvidence, HospitalRecord } from "./types";

export * from "./acquisition";
export * from "./types";

export const HOSPITALS_COMPILER_VERSION = "1.0.0";

/** Provider of Services category 01 is "Hospital". */
const POS_HOSPITAL_CATEGORY = "01";

function table(artifact: OpenedArtifact, encoding: "utf-8" | "latin1") {
  const parsed = parseDelimited(artifact.bytes, {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: true,
    encoding,
  });
  if (!parsed.header || parsed.defects.length)
    throw new Error(
      `Invalid ${artifact.artifact.artifactId}: ${JSON.stringify(parsed.defects[0])}`,
    );
  const columns = new Map(parsed.header.map((name, index) => [name, index]));
  const need = (name: string) => {
    const index = columns.get(name);
    if (index === undefined)
      throw new Error(`${artifact.artifact.artifactId} missing ${name}`);
    return index;
  };
  return { rows: parsed.rows, need };
}

const whole = (value: string): number | null =>
  /^\d+$/.test(value) ? Number(value) : null;

export function compileHospitals(
  general: OpenedArtifact,
  pos: OpenedArtifact,
  lock: ArtifactLock,
): CompiledCorpus<HospitalRecord, "production"> {
  const g = table(general, "utf-8");
  const p = table(pos, "latin1");
  const posColumns = {
    ccn: p.need("PRVDR_NUM"),
    category: p.need("PRVDR_CTGRY_CD"),
    beds: p.need("BED_CNT"),
    state: p.need("FIPS_STATE_CD"),
    county: p.need("FIPS_CNTY_CD"),
  };
  const posByCcn = new Map<
    string,
    { line: number; beds: number | null; countyGeoid: string | null }
  >();
  for (const row of p.rows) {
    if (row.fields[posColumns.category] !== POS_HOSPITAL_CATEGORY) continue;
    const state = row.fields[posColumns.state] ?? "";
    const county = row.fields[posColumns.county] ?? "";
    posByCcn.set(row.fields[posColumns.ccn]!, {
      line: row.line,
      beds: whole(row.fields[posColumns.beds] ?? ""),
      countyGeoid:
        /^\d{2}$/.test(state) && /^\d{3}$/.test(county)
          ? `${state}${county}`
          : null,
    });
  }
  const col = {
    ccn: g.need("Facility ID"),
    name: g.need("Facility Name"),
    address: g.need("Address"),
    city: g.need("City/Town"),
    state: g.need("State"),
    zip: g.need("ZIP Code"),
    county: g.need("County/Parish"),
    type: g.need("Hospital Type"),
    ownership: g.need("Hospital Ownership"),
    emergency: g.need("Emergency Services"),
  };
  const records: HospitalRecord[] = g.rows
    .map((row): HospitalRecord => {
      const f = row.fields;
      const ccn = f[col.ccn]!;
      const joined = posByCcn.get(ccn);
      const emergency = f[col.emergency];
      const evidence = (
        artifact: OpenedArtifact,
        line: number,
      ): HospitalEvidence => ({
        artifactId: artifact.artifact.artifactId,
        line,
      });
      return {
        ccn,
        name: f[col.name]!,
        address: f[col.address]!,
        city: f[col.city]!,
        state: f[col.state]!,
        zip: f[col.zip]!,
        countyName: f[col.county]!,
        hospitalType: f[col.type]!,
        ownership: f[col.ownership]!,
        emergencyServices:
          emergency === "Yes" ? true : emergency === "No" ? false : null,
        countyGeoid: joined?.countyGeoid ?? null,
        certifiedBeds: joined?.beds ?? null,
        evidence: {
          general: evidence(general, row.line),
          providerOfServices: joined ? evidence(pos, joined.line) : null,
        },
      };
    })
    .sort((a, b) => a.ccn.localeCompare(b.ccn));
  const sha = (artifactId: string) =>
    lock.artifacts.find((a) => a.artifactId === artifactId)!.bytes.sha256;
  return {
    corpus: {
      corpusId: "hospitals",
      compiler: { name: "hospitals", version: HOSPITALS_COMPILER_VERSION },
      parser: {
        name: "cms-hospital-general-information-pos-join",
        version: "1.0.0",
      },
      inputs: [HOSPITAL_GENERAL_ARTIFACT, HOSPITAL_POS_ARTIFACT].map(
        (artifactId) => ({ artifactId, sha256: sha(artifactId) }),
      ),
      asOf: HOSPITALS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Every hospital in the CMS Hospital General Information file, joined by CMS certification number to the Provider of Services file for certified beds and county FIPS.",
        boundedSampleReason:
          "Medicare-certified hospitals only. Hospitals that do not participate in Medicare, and the hospitals a Hospital General Information release leaves out, are not here.",
      },
    },
    records,
  };
}

export function validateHospitals(
  compiled: CompiledCorpus<HospitalRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const seen = new Set<string>();
  for (const record of compiled.records) {
    const error = (code: string, message: string) =>
      findings.push({ severity: "error", code, message, recordId: record.ccn });
    if (!/^[0-9A-Z]{6}$/.test(record.ccn))
      error(
        "bad-ccn",
        `${record.ccn} is not a six-character CMS certification number.`,
      );
    if (seen.has(record.ccn))
      error("duplicate-ccn", `${record.ccn} appears twice.`);
    seen.add(record.ccn);
    if (!/^[A-Z]{2}$/.test(record.state))
      error("bad-state", `${record.ccn} has state "${record.state}".`);
    if (record.name.trim() === "")
      error("no-name", `${record.ccn} has no name.`);
    if (record.certifiedBeds !== null && record.certifiedBeds < 0)
      error("bad-beds", `${record.ccn} has ${record.certifiedBeds} beds.`);
    if (record.countyGeoid !== null && !/^\d{5}$/.test(record.countyGeoid))
      error("bad-county", `${record.ccn} has county ${record.countyGeoid}.`);
  }
  if (compiled.records.length !== compiled.corpus.recordCount)
    findings.push({
      severity: "error",
      code: "record-count",
      message: "The corpus record count does not match its records.",
    });
  return { domain: "hospitals", checked: compiled.records.length, findings };
}

export const sourceDomain: SourceDomainModule<HospitalRecord> = {
  domain: "hospitals",
  compilerVersion: HOSPITALS_COMPILER_VERSION,
  acquisitionPlan: hospitalsAcquisition,
  lockPath: "data/source/hospitals/artifact-lock.json",
  compileProduction(lock) {
    const general = openProductionArtifacts("hospitals", lock, {
      general: HOSPITAL_GENERAL_ARTIFACT,
    });
    const pos = openCachedProductionArtifacts("hospitals", lock, {
      pos: {
        artifactId: HOSPITAL_POS_ARTIFACT,
        cachePath: `.source-cache/hospitals/${HOSPITAL_POS_ARTIFACT}.csv`,
      },
    });
    return compileHospitals(general.artifacts.general, pos.artifacts.pos, lock);
  },
  validateCorpus: validateHospitals,
};
