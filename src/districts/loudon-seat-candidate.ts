import type { CountySeatIdentity, CountySeatSource } from "./county-seat-types";

/**
 * Review candidate only: not included in countySeatCatalog().
 * Resolution 110121-D, adopted/effective November 1, 2021, PDF page 13:
 * https://loudoncounty-tn.gov/documentsAndForms/documents/CommissionMeetingDocuments/20211101_CommissionMeeting_Minutes.pdf
 * SHA-256 85dad2ed49cd9b7edc868e577f6208d4c5e770e5dcf5fd9fd6963bf00b3b3bee.
 * CTAS-11 establishes district electorates; CTAS-12 establishes district domicile:
 * https://www.ctas.tennessee.edu/eli/membership-clb
 * https://www.ctas.tennessee.edu/eli/qualifications-clb
 * August 6, 2026 sample ballot corroborates the ten seat names only:
 * https://loudoncountyvotes.com/files/August_2026_SampleBallot_General.pdf
 * SHA-256 63284ff62d2e83ca8dbc3a93d32bee033dbdeced4c8e53749d7da067b1158b6d.
 * No boundary geometry, person registration or term interval is admitted here.
 */
const source: CountySeatSource = {
  version:
    "Loudon-110121-D:85dad2ed49cd9b7edc868e577f6208d4c5e770e5dcf5fd9fd6963bf00b3b3bee",
  url: "https://loudoncounty-tn.gov/documentsAndForms/documents/CommissionMeetingDocuments/20211101_CommissionMeeting_Minutes.pdf",
  documentId: "Loudon-Resolution-110121-D:page-13",
  readOn: "2026-10-01",
  effectiveFrom: "2021-11-01",
  // No end date is supplied by the inspected resolution; future validity is unproved.
  effectiveUntil: null,
  status: "adopted",
};

const seats = [
  [1, "A"],
  [1, "B"],
  [2, "A"],
  [2, "B"],
  [3, null],
  [4, null],
  [5, "A"],
  [5, "B"],
  [6, null],
  [7, null],
] as const;

/** Internal record keys preserve the source's district and seat distinctions. */
export const LOUDON_SEAT_REVIEW_CANDIDATES: readonly CountySeatIdentity[] =
  seats.map(([district, designation]) => {
    const seatKey = `district-${district}${designation === null ? "" : `-seat-${designation}`}`;
    const districtRecordId = `county:47105:110121-D:district-${district}`;
    return {
      recordId: `county:47105:110121-D:${seatKey}`,
      governmentUnitId: "gus2025:175686",
      countyGeoid: "47105",
      stateUsps: "TN",
      officeKey: "local-government-175686-governing-body",
      seatKey,
      source,
      electorate: { kind: "district", districtRecordId },
      domicile: { kind: "district", districtRecordId },
      // No whole-place join passed. Absence must retain the writer's refusal.
    };
  });
