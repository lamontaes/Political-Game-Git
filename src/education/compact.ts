import type { EducationInstitution, EducationCapability } from "./types";
/** Positional transport schema v1; shared dictionary removes repeated labels and hashes. */
export type CompactInstitution = readonly [
  string,
  string,
  string,
  string,
  string,
  string | null,
  string | null,
  string | null,
  string,
  string,
  string | null,
  string,
  readonly (readonly [string, string])[],
  readonly (readonly [string, string, number])[],
  "2024-25" | "2025-26",
];
export interface EducationDictionary {
  readonly capabilities: Readonly<
    Record<string, { label: string; kind: EducationCapability["kind"] }>
  >;
  readonly hashes: Readonly<Record<string, string>>;
}
export function compactInstitution(
  r: EducationInstitution,
): CompactInstitution {
  return [
    r.id,
    r.kind,
    r.name,
    r.city,
    r.state,
    r.stateFips,
    r.countyGeoid,
    r.parentDistrictId,
    r.statusCode,
    r.statusLabel,
    r.statusEffectiveDate,
    r.openAdmissionPolicy,
    r.capabilities.map((c) => [c.code, c.raw] as const),
    r.evidence.map((e) => [e.artifactId, e.member, e.row] as const),
    r.sourceYear,
  ];
}
export function expandInstitution(
  r: CompactInstitution,
  d: EducationDictionary,
): EducationInstitution {
  return {
    id: r[0],
    officialId: r[0].split(":")[1]!,
    kind: r[1] as EducationInstitution["kind"],
    name: r[2],
    city: r[3],
    state: r[4],
    stateFips: r[5],
    countyGeoid: r[6],
    parentDistrictId: r[7],
    statusCode: r[8],
    statusLabel: r[9],
    statusEffectiveDate: r[10],
    openAdmissionPolicy: r[11] as EducationInstitution["openAdmissionPolicy"],
    sourceYear: r[14],
    release:
      r[14] === "2025-26"
        ? "HD2025/IC2025 provisional"
        : r[1] === "postsecondary"
          ? "HD2024; IC2024 revised September 2026"
          : "CCD preliminary v0a",
    foundingDate: null,
    capabilities: r[12].map(([code, raw]) => {
      const definition = d.capabilities[`${r[14].slice(0, 4)}:${code}`];
      if (!definition) throw new Error(`Missing capability dictionary ${code}`);
      return {
        code,
        raw,
        ...definition,
        state:
          raw === "1" || raw === "Yes"
            ? "offered"
            : raw === "0" || raw === "No"
              ? "not-offered"
              : raw === "-2"
                ? "not-applicable"
                : "unknown",
      };
    }),
    evidence: r[13].map(([artifactId, member, row]) => {
      const sha256 = d.hashes[artifactId];
      if (!sha256) throw new Error(`Missing source digest ${artifactId}`);
      return { artifactId, member, row, sha256 };
    }),
  };
}
