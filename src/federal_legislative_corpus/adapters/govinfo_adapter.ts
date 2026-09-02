/**
 * Federal Legislative Source Corpus - GovInfo Document & Package Adapter
 *
 * Normalizes GovInfo API package summaries, MODS XML/JSON metadata, and bulk text references.
 * Secondary official document source providing cryptographic document provenance.
 */

import { sha256Hex } from "../provenance.js";
import type { FederalTextFormat, FederalTextVersionRecord } from "../types.js";

export interface GovInfoPackageSummary {
  packageId: string;
  title: string;
  collectionCode: string;
  collectionName?: string;
  category?: string;
  dateIssued: string;
  lastModified?: string;
  packageLink?: string;
  docClass?: string;
  congress?: string | number;
  session?: string | number;
  billVersion?: string;
  billNumber?: string | number;
  billType?: string;
  download?: {
    pdfLink?: string;
    xmlLink?: string;
    txtLink?: string;
    modsLink?: string;
    premisLink?: string;
    zipLink?: string;
  };
  references?: Array<{
    type: string;
    contents: string;
  }>;
}

/**
 * Maps GovInfo version code to a human-readable official name.
 */
export function mapGovInfoVersionName(versionCode: string): string {
  const v = versionCode.toLowerCase().trim();
  const names: Record<string, string> = {
    ih: "Introduced in House",
    is: "Introduced in Senate",
    rh: "Reported in House",
    rs: "Reported in Senate",
    eh: "Engrossed in House",
    es: "Engrossed in Senate",
    eas: "Engrossed Amendment Senate",
    eah: "Engrossed Amendment House",
    enr: "Enrolled Bill",
    pl: "Public Law",
    fph: "Failed Passage House",
    fps: "Failed Passage Senate",
    ath: "Agreed to in House",
    ats: "Agreed to in Senate",
  };
  return names[v] || `GovInfo Version (${versionCode.toUpperCase()})`;
}

/**
 * Extracts a normalized FederalTextVersionRecord from a GovInfo package summary.
 */
export function parseGovInfoTextVersion(
  summary: GovInfoPackageSummary,
): FederalTextVersionRecord {
  const versionCode = (summary.billVersion || "unknown").toLowerCase().trim();
  const versionName = mapGovInfoVersionName(versionCode);

  const formats: FederalTextFormat[] = [];
  if (summary.download) {
    if (summary.download.xmlLink) {
      formats.push({
        formatType: "xml",
        url: summary.download.xmlLink,
        sha256: sha256Hex(summary.download.xmlLink),
      });
    }
    if (summary.download.pdfLink) {
      formats.push({
        formatType: "pdf",
        url: summary.download.pdfLink,
        sha256: sha256Hex(summary.download.pdfLink),
      });
    }
    if (summary.download.txtLink) {
      formats.push({
        formatType: "txt",
        url: summary.download.txtLink,
        sha256: sha256Hex(summary.download.txtLink),
      });
    }
  }

  // Fallback if download links are not explicitly provided
  if (formats.length === 0 && summary.packageLink) {
    formats.push({
      formatType: "pdf",
      url: `${summary.packageLink}/pdf`,
      sha256: sha256Hex(`${summary.packageLink}/pdf`),
    });
  }

  return {
    versionCode,
    versionName,
    date: summary.dateIssued,
    govinfoPackageId: summary.packageId,
    formats,
    contentSha256: formats.length > 0 ? (formats[0]?.sha256 ?? null) : null,
  };
}

/**
 * Merges GovInfo document metadata into existing text versions with deduplication and format enhancement.
 */
export function mergeGovInfoTextVersions(
  existingVersions: FederalTextVersionRecord[],
  govinfoSummaries: GovInfoPackageSummary[],
): FederalTextVersionRecord[] {
  const versionMap = new Map<string, FederalTextVersionRecord>();

  // Add existing versions
  for (const v of existingVersions) {
    const key = `${v.versionCode}_${v.date}`;
    versionMap.set(key, { ...v, formats: [...v.formats] });
  }

  // Merge GovInfo versions
  for (const sum of govinfoSummaries) {
    const parsed = parseGovInfoTextVersion(sum);
    const key = `${parsed.versionCode}_${parsed.date}`;

    if (versionMap.has(key)) {
      const existing = versionMap.get(key)!;
      // Enrich with govinfoPackageId if missing
      if (!existing.govinfoPackageId) {
        existing.govinfoPackageId = parsed.govinfoPackageId;
      }
      // Merge format links without duplicates
      for (const fmt of parsed.formats) {
        if (!existing.formats.some((f) => f.formatType === fmt.formatType)) {
          existing.formats.push(fmt);
        }
      }
    } else {
      versionMap.set(key, parsed);
    }
  }

  return Array.from(versionMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
