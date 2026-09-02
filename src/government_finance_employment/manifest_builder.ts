/**
 * National Coverage Manifest Builder for Government Finance and Employment Corpus
 *
 * Generates coverage metadata, SHA-256 checksums, and dataset provenance.
 */

import type {
  NationalCoverageManifest,
  GovernmentEntityMetadata,
  FinanceRecord,
  EmploymentRecord,
  GovernmentClass,
  SourceCitation,
} from "./types.js";

export interface ManifestBuildInput {
  readonly governments: readonly GovernmentEntityMetadata[];
  readonly financeRecords: readonly FinanceRecord[];
  readonly employmentRecords: readonly EmploymentRecord[];
  readonly rawFileBuffers?: Readonly<Record<string, Uint8Array | string>>;
  readonly vintages?: readonly string[];
}

export const OFFICIAL_SOURCE_CITATIONS: readonly SourceCitation[] = [
  {
    id: "census-slf-2017-2024",
    title: "State and Local Government Finances (2017–2024 Developer Series)",
    publisher: "U.S. Census Bureau",
    program: "State and Local Government Finances",
    timeRange: "2017–2024",
    methodologyUrl:
      "https://www.census.gov/programs-surveys/gov-finances/technical-documentation.html",
    developerUrl: "https://api.census.gov/data/timeseries/govs",
    notes:
      "Includes 2017 and 2022 complete Census of Governments enumeration alongside 2018–2021 and 2023–2024 Annual Survey sample estimates.",
  },
  {
    id: "census-apep-1992-2025",
    title:
      "Annual Survey of Public Employment & Payroll (1992–2025 Developer Series)",
    publisher: "U.S. Census Bureau",
    program: "Annual Survey of Public Employment & Payroll",
    timeRange: "1992–2025",
    methodologyUrl:
      "https://www.census.gov/programs-surveys/apes/technical-documentation.html",
    developerUrl: "https://api.census.gov/data/timeseries/apes",
    notes:
      "Full-time and part-time government employment, monthly payroll, and full-time equivalent staffing by government function. Reference month March (1997+) and October (pre-1997).",
  },
  {
    id: "census-cog-1992-2022",
    title: "Census of Governments (5-Year Complete Enumeration Series)",
    publisher: "U.S. Census Bureau",
    program: "Census of Governments",
    timeRange: "1992–2022 (years ending in 2 and 7)",
    methodologyUrl: "https://www.census.gov/programs-surveys/cog/about.html",
    developerUrl: "https://api.census.gov/data/timeseries/cog",
    notes:
      "Complete universe enumeration of state, county, municipal, township, special district, and school district entities.",
  },
];

/**
 * Pure TypeScript standard SHA-256 implementation (FIPS 180-4)
 */
function sha256Bytes(bytes: Uint8Array): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const len = bytes.length;
  const bitLen = len * 8;
  const padLen = len % 64 < 56 ? 64 - (len % 64) : 128 - (len % 64);
  const totalLen = len + padLen;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);

  for (let chunk = 0; chunk < totalLen; chunk += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(chunk + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const w15 = W[t - 2] ?? 0;
      const w2 = W[t - 15] ?? 0;
      const s0 =
        ((w2 >>> 7) | (w2 << 25)) ^ ((w2 >>> 18) | (w2 << 14)) ^ (w2 >>> 3);
      const s1 =
        ((w15 >>> 17) | (w15 << 15)) ^
        ((w15 >>> 19) | (w15 << 13)) ^
        (w15 >>> 10);
      W[t] = ((W[t - 16] ?? 0) + s0 + (W[t - 7] ?? 0) + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 =
        ((e >>> 6) | (e << 26)) ^
        ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + (K[t] ?? 0) + (W[t] ?? 0)) >>> 0;
      const S0 =
        ((a >>> 2) | (a << 30)) ^
        ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((val) => val.toString(16).padStart(8, "0"))
    .join("");
}

export function computeSha256(content: string | Uint8Array): string {
  if (typeof content === "string") {
    const encoder = new TextEncoder();
    return sha256Bytes(encoder.encode(content));
  }
  return sha256Bytes(content);
}

export function buildNationalCoverageManifest(
  input: ManifestBuildInput,
): NationalCoverageManifest {
  const govClassCounts: Record<GovernmentClass, number> = {
    federal: 0,
    state: 0,
    county: 0,
    municipal: 0,
    township: 0,
    special_district: 0,
    school_district: 0,
  };

  const stateCounts: Record<string, number> = {};
  const seenGovIds = new Set<string>();

  for (const gov of input.governments) {
    if (seenGovIds.has(gov.govId)) continue;
    seenGovIds.add(gov.govId);
    govClassCounts[gov.govClass] = (govClassCounts[gov.govClass] ?? 0) + 1;
    stateCounts[gov.statePostal] = (stateCounts[gov.statePostal] ?? 0) + 1;
  }

  const financeYearsSet = new Set<number>();
  for (const f of input.financeRecords) {
    financeYearsSet.add(f.fiscalYear);
  }
  const financeYearsAvailable = Array.from(financeYearsSet).sort(
    (a, b) => a - b,
  );

  const employmentYearsSet = new Set<number>();
  for (const e of input.employmentRecords) {
    employmentYearsSet.add(e.surveyYear);
  }
  const employmentYearsAvailable = Array.from(employmentYearsSet).sort(
    (a, b) => a - b,
  );

  const checksums: Record<string, string> = {};
  if (input.rawFileBuffers) {
    for (const [filename, content] of Object.entries(input.rawFileBuffers)) {
      checksums[filename] = computeSha256(content);
    }
  }

  const vintagesSet = new Set<string>();
  if (input.vintages) {
    for (const v of input.vintages) vintagesSet.add(v);
  }
  for (const f of input.financeRecords) {
    vintagesSet.add(f.quality.vintage);
  }
  for (const e of input.employmentRecords) {
    vintagesSet.add(e.quality.vintage);
  }

  return {
    manifestVersion: "1.0.0",
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    sources: OFFICIAL_SOURCE_CITATIONS,
    coverage: {
      totalGovernments: seenGovIds.size,
      governmentsByClass: govClassCounts,
      governmentsByState: stateCounts,
      financeYearsAvailable,
      employmentYearsAvailable,
      totalFinanceRecords: input.financeRecords.length,
      totalEmploymentRecords: input.employmentRecords.length,
    },
    checksums,
    vintages: Array.from(vintagesSet).sort(),
  };
}
