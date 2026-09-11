import {
  openProductionArtifacts,
  readXlsxSheet,
  listXlsxSheets,
  readZipMember,
  corpusCanonicalDigest,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  ValidationReport,
} from "../../core/index";
export interface OccupationRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly soc: string;
  readonly hierarchy: readonly { group: string; code: string; title: string }[];
  readonly tasks: readonly {
    id: string;
    text: string;
    type: string;
    date: string;
    domainSource: string;
    row: number;
  }[];
  readonly wage: {
    geography: "US";
    period: "2025-05";
    releaseStatus: "published-estimate";
    hourlyMedian: string | null;
    annualMedian: string | null;
    row: number;
  } | null;
  readonly source: {
    onetVersion: "31.0";
    taxonomy: "O*NET-SOC 2019 / SOC 2018";
    license: "CC BY 4.0";
    attribution: string;
  };
}
export function compileCareerOccupations(
  lock: ArtifactLock,
): CompiledCorpus<OccupationRecord, "production"> {
  const a = openProductionArtifacts("career-occupations", lock, {
    occupations: "onet31-occupations",
    tasks: "onet31-tasks",
    crosswalk: "onet2019-soc2018-crosswalk",
    soc: "bls-soc2018-structure",
    wages: "bls-oews2025-national",
  }).artifacts;
  const sheet = (b: Buffer) => readXlsxSheet(b, listXlsxSheets(b)[0]!).rows;
  const occupationRows = sheet(a.occupations.bytes),
    taskRows = sheet(a.tasks.bytes),
    crossRows = sheet(a.crosswalk.bytes);
  for (const [rows, expected] of [
    [occupationRows, ["O*NET-SOC Code", "Title", "Description"]],
    [
      taskRows,
      [
        "O*NET-SOC Code",
        "Title",
        "Task ID",
        "Task",
        "Task Type",
        "Incumbents Responding",
        "Date",
        "Domain Source",
      ],
    ],
  ] as const) {
    if (expected.some((name, i) => rows[0]?.[i] !== name))
      throw new Error("Occupation/task header drift.");
  }
  const socRows = sheet(a.soc.bytes);
  const hierarchy = new Map<
    string,
    { group: string; code: string; title: string }[]
  >();
  const chain: { group: string; code: string; title: string }[] = [];
  for (const row of socRows.slice(5)) {
    const level = row.slice(0, 4).findIndex((v) => /^\d{2}-\d{4}$/.test(v));
    if (level < 0) continue;
    chain.splice(level);
    chain.push({
      group: ["major", "minor", "broad", "detailed"][level]!,
      code: row[level]!,
      title: row[4]!,
    });
    if (level === 3) hierarchy.set(row[level]!, [...chain]);
  }
  const cross = new Map(
    crossRows
      .filter((r) => /^\d{2}-\d{4}\.\d{2}$/.test(r[0] ?? ""))
      .map((r) => [r[0]!, r[2]!]),
  );
  if (cross.size !== 1016 || hierarchy.size !== 867)
    throw new Error("Official taxonomy coverage mismatch.");
  const wages = sheet(
    readZipMember(a.wages.bytes, "oesm25nat/national_M2025_dl.xlsx"),
  );
  const header = wages[0]!;
  const wi = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Missing wage column ${name}`);
    return i;
  };
  const wageMap = new Map(
    wages
      .slice(1)
      .filter(
        (r) =>
          r[wi("O_GROUP")] === "detailed" &&
          r[wi("AREA")] === "99" &&
          r[wi("OWN_CODE")] === "1235" &&
          r[wi("I_GROUP")] === "cross-industry" &&
          r[wi("NAICS")] === "000000",
      )
      .map((r) => [
        r[wi("OCC_CODE")]!,
        {
          geography: "US" as const,
          period: "2025-05" as const,
          releaseStatus: "published-estimate" as const,
          hourlyMedian: r[wi("H_MEDIAN")]?.trim() || null,
          annualMedian: r[wi("A_MEDIAN")]?.trim() || null,
          row: wages.indexOf(r) + 1,
        },
      ]),
  );
  const records = occupationRows.slice(1).map((r) => {
    const id = r[0]!,
      soc = cross.get(id);
    if (!soc || !hierarchy.has(soc))
      throw new Error(`Missing official crosswalk/hierarchy for ${id}`);
    return {
      id,
      title: r[1]!,
      description: r[2]!,
      soc,
      hierarchy: hierarchy.get(soc)!,
      tasks: taskRows.flatMap((t, i) =>
        t[0] === id
          ? [
              {
                id: t[2]!,
                text: t[3]!,
                type: t[4] ?? "",
                date: t[6] ?? "",
                domainSource: t[7] ?? "",
                row: i + 1,
              },
            ]
          : [],
      ),
      wage: wageMap.get(soc) ?? null,
      source: {
        onetVersion: "31.0" as const,
        taxonomy: "O*NET-SOC 2019 / SOC 2018" as const,
        license: "CC BY 4.0" as const,
        attribution:
          "O*NET 31.0 Database, USDOL/ETA. Adapted under CC BY 4.0. No endorsement.",
      },
    };
  });
  const report = validateCareerCorpus({ records });
  if (report.findings.length) throw new Error(report.findings[0]!.message);
  return {
    records,
    corpus: {
      corpusId: "career-occupations",
      compiler: { name: "career-occupations", version: "1.0.0" },
      parser: { name: "source-core-xlsx", version: "1.0.0" },
      inputs: Object.values(a).map((o) => ({
        artifactId: o.artifact.artifactId,
        sha256: o.artifact.bytes.sha256,
      })),
      asOf: "2026-09-09",
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Full 1016 O*NET-SOC 2019 identities and all task rows in O*NET 31.0; applicable May 2025 national cross-industry OEWS observations.",
        boundedSampleReason:
          "National wage observations only. Occupation task coverage varies; sources establish neither employers nor credentials, vacancies, individual salary or past applicability.",
      },
    },
  };
}
export function validateCareerCorpus(
  c: Pick<CompiledCorpus<OccupationRecord>, "records">,
): ValidationReport {
  const findings: ValidationReport["findings"][number][] = [];
  if (
    c.records.length !== 1016 ||
    new Set(c.records.map((r) => r.id)).size !== 1016
  )
    findings.push({
      severity: "error",
      code: "taxonomy-count",
      message: "Expected 1016 unique official O*NET identities.",
    });
  for (const r of c.records) {
    if (!r.title || !r.soc || r.hierarchy.length !== 4)
      findings.push({
        severity: "error",
        code: "identity",
        message: `Incomplete identity ${r.id}`,
      });
  }
  return { domain: "career-occupations", checked: c.records.length, findings };
}
