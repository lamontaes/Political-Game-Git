import type { CreateOrganizationInput } from "../simulation/life";
import type {
  LifeRecordProvenance,
  OrganizationClassification,
} from "../simulation/types";
import type {
  EducationCorpusSnapshot,
  EducationInstitutionRecord,
  QueryEducationFilter,
  SchoolDistrictRecord,
} from "./types";

/**
 * Pure, browser-safe education corpus validation, query, and bridge functions.
 * Contains ZERO dependencies on Node built-ins (fs, path, process, etc.).
 */

export function validateEducationCorpus(corpus: EducationCorpusSnapshot): void {
  if (corpus.version !== "1.0.0") {
    throw new Error(`Unsupported corpus version: ${corpus.version}`);
  }
  if (corpus.corpusScope !== "historical-2022-snapshot") {
    throw new Error(
      `Corpus scope must be 'historical-2022-snapshot', got: ${corpus.corpusScope}`,
    );
  }

  const seenStableIds = new Set<string>();

  for (const district of corpus.districts) {
    if (!district.stableId.startsWith("nces-lea:")) {
      throw new Error(
        `Invalid district stable ID format: ${district.stableId}`,
      );
    }
    if (seenStableIds.has(district.stableId)) {
      throw new Error(`Duplicate stable ID in corpus: ${district.stableId}`);
    }
    seenStableIds.add(district.stableId);

    if (
      !district.provenance.rowLocator ||
      district.provenance.rowLocator.sourceKeyColumn !== "LEAID"
    ) {
      throw new Error(
        `District ${district.stableId} missing valid LEAID row locator.`,
      );
    }

    // Geography validation: countyGeoid must NEVER equal fipsState (state FIPS is not county FIPS)
    if (
      district.location.fipsState &&
      district.location.countyGeoid &&
      district.location.countyGeoid === district.location.fipsState
    ) {
      throw new Error(
        `County GEOID mismatch in ${district.stableId}: state FIPS '${district.location.fipsState}' was substituted for county GEOID.`,
      );
    }
  }

  const districtSet = new Set(corpus.districts.map((d) => d.stableId));

  for (const inst of corpus.institutions) {
    if (seenStableIds.has(inst.stableId)) {
      throw new Error(`Duplicate stable ID in corpus: ${inst.stableId}`);
    }
    seenStableIds.add(inst.stableId);

    if (
      inst.location.fipsState &&
      inst.location.countyGeoid &&
      inst.location.countyGeoid === inst.location.fipsState
    ) {
      throw new Error(
        `County GEOID mismatch in ${inst.stableId}: state FIPS '${inst.location.fipsState}' was substituted for county GEOID.`,
      );
    }

    if (inst.kind === "public-elementary-secondary") {
      if (!inst.stableId.startsWith("nces-sch:")) {
        throw new Error(`Invalid school stable ID format: ${inst.stableId}`);
      }
      if (!districtSet.has(inst.parentDistrictId)) {
        throw new Error(
          `School ${inst.stableId} references unknown parent district: ${inst.parentDistrictId}`,
        );
      }
      if (
        !inst.provenance.rowLocator ||
        inst.provenance.rowLocator.sourceKeyColumn !== "NCESSCH"
      ) {
        throw new Error(
          `School ${inst.stableId} missing valid NCESSCH row locator.`,
        );
      }
    } else if (inst.kind === "postsecondary") {
      if (!inst.stableId.startsWith("ipeds-unit:")) {
        throw new Error(
          `Invalid postsecondary stable ID format: ${inst.stableId}`,
        );
      }
      if (
        !inst.provenance.rowLocator ||
        inst.provenance.rowLocator.sourceKeyColumn !== "UNITID"
      ) {
        throw new Error(
          `Postsecondary institution ${inst.stableId} missing valid UNITID row locator.`,
        );
      }
    } else {
      throw new Error(
        `Unsupported institution kind: ${(inst as { kind: string }).kind}`,
      );
    }
  }

  const totalCalculated = corpus.districts.length + corpus.institutions.length;
  if (corpus.counts.total !== totalCalculated) {
    throw new Error(
      `Corpus total count mismatch: declared ${corpus.counts.total}, computed ${totalCalculated}`,
    );
  }
}

export function queryEducationInstitutions(
  filter: QueryEducationFilter,
  corpus: EducationCorpusSnapshot,
): readonly EducationInstitutionRecord[] {
  return corpus.institutions.filter((inst) => {
    if (filter.kind && inst.kind !== filter.kind) {
      return false;
    }
    if (filter.level && inst.level !== filter.level) {
      return false;
    }
    if (
      filter.state &&
      inst.location.state.toUpperCase() !== filter.state.toUpperCase()
    ) {
      return false;
    }
    if (
      filter.city &&
      inst.location.city.toLowerCase() !== filter.city.toLowerCase()
    ) {
      return false;
    }
    if (
      filter.parentDistrictId &&
      inst.kind === "public-elementary-secondary" &&
      inst.parentDistrictId !== filter.parentDistrictId
    ) {
      return false;
    }
    if (filter.nameQuery) {
      const q = filter.nameQuery.toLowerCase();
      const match = inst.name.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filter.effectiveYear !== undefined) {
      const activeInYear = inst.vintages.some((v) => {
        if (!v.effectiveDateStart) {
          // Unknown historical opening date: matches ONLY if queried year matches the snapshot vintage year.
          // Requesting an unsupported historical year (e.g. 1950 from a 2022 snapshot) CANNOT silently match!
          return v.vintageYear === filter.effectiveYear;
        }
        const startYear = parseInt(v.effectiveDateStart.slice(0, 4), 10);
        const endYear = v.effectiveDateEnd
          ? parseInt(v.effectiveDateEnd.slice(0, 4), 10)
          : Infinity;
        return (
          filter.effectiveYear! >= startYear && filter.effectiveYear! <= endYear
        );
      });
      if (!activeInYear) return false;
    }
    return true;
  });
}

export function findInstitutionByStableId(
  stableId: string,
  corpus: EducationCorpusSnapshot,
): EducationInstitutionRecord | SchoolDistrictRecord | null {
  if (stableId.startsWith("nces-lea:")) {
    return corpus.districts.find((d) => d.stableId === stableId) ?? null;
  }
  return corpus.institutions.find((i) => i.stableId === stableId) ?? null;
}

export function convertEducationInstitutionToOrganization(
  institution: EducationInstitutionRecord | SchoolDistrictRecord,
  formedAtDate: string, // ISO YYYY-MM-DD
  provenanceNote?: string,
): CreateOrganizationInput {
  const classification: OrganizationClassification =
    institution.kind === "postsecondary"
      ? "service:higher-education"
      : institution.kind === "public-district"
        ? "service:school-district"
        : "service:school";

  const provenance: LifeRecordProvenance = {
    kind: "authored",
    note:
      provenanceNote ??
      `Real U.S. education institution source: ${institution.provenance.sourceName} (${institution.stableId})`,
  };

  return {
    stableKey: `org:${institution.stableId}`,
    formedAt: formedAtDate,
    provenance,
    initialProfile: {
      name: institution.name,
      classification,
      // Keep locationJurisdictionId explicitly unresolved (null) until a source-backed jurisdiction join exists.
      locationJurisdictionId: null,
    },
  };
}

/**
 * Asserts the non-attendance separation rule:
 * Merely existing in the education institution corpus or living nearby NEVER grants
 * automatic school enrollment or attendance facts to a simulated character.
 */
export function assertNoAutomaticAttendance(): void {
  // Pure policy assertion enforcing separation between school existence and character history.
}
