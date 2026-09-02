import type {
  CompiledQualificationsCorpus,
  OfficeFamilyId,
  OfficeQualificationFacts,
  SelectionType,
  StateCode,
  StateOfficeQualificationRecord,
} from "./types.js";

export interface QualificationFilter {
  stateCode?: StateCode;
  officeFamilyId?: OfficeFamilyId;
  selectionType?: SelectionType;
  maxMinimumAge?: number;
  normalizationReviewRequired?: boolean;
}

/**
 * Get all state office qualifications for a given state code.
 */
export function getQualificationsForState(
  corpus: CompiledQualificationsCorpus,
  stateCode: StateCode,
): StateOfficeQualificationRecord | null {
  return corpus.states[stateCode] ?? null;
}

/**
 * Get qualification facts for a specific state office family.
 */
export function getQualificationForOffice(
  corpus: CompiledQualificationsCorpus,
  stateCode: StateCode,
  officeFamilyId: OfficeFamilyId,
): OfficeQualificationFacts | null {
  const stateRecord = getQualificationsForState(corpus, stateCode);
  if (!stateRecord) return null;
  return stateRecord.offices[officeFamilyId] ?? null;
}

/**
 * Query qualification records across the corpus based on matching criteria.
 */
export function queryQualifications(
  corpus: CompiledQualificationsCorpus,
  filter: QualificationFilter,
): OfficeQualificationFacts[] {
  const results: OfficeQualificationFacts[] = [];

  const stateCodes = filter.stateCode
    ? [filter.stateCode]
    : (Object.keys(corpus.states) as StateCode[]);

  for (const code of stateCodes) {
    const stateRecord = corpus.states[code];
    if (!stateRecord) continue;

    for (const office of Object.values(stateRecord.offices)) {
      if (
        filter.officeFamilyId &&
        office.officeFamilyId !== filter.officeFamilyId
      ) {
        continue;
      }
      if (
        filter.selectionType &&
        office.selectionType !== filter.selectionType
      ) {
        continue;
      }
      if (
        filter.maxMinimumAge !== undefined &&
        (office.minimumAge.value === null ||
          office.minimumAge.value > filter.maxMinimumAge)
      ) {
        continue;
      }
      if (
        filter.normalizationReviewRequired !== undefined &&
        office.normalizationReviewRequired !==
          filter.normalizationReviewRequired
      ) {
        continue;
      }

      results.push(office);
    }
  }

  return results;
}
