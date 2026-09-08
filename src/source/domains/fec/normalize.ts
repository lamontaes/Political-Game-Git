/**
 * FEC rows into identity records.
 *
 * The Commission leaves optional fields empty rather than absent, and an empty
 * field stays `null` here rather than becoming `""` or `"UNKNOWN"`. A committee
 * with no connected organisation has no connected organisation; writing a
 * placeholder there would make "not stated" indistinguishable from a filer who
 * wrote the word.
 */

import type { DelimitedRow, Evidence, ParseDefect } from "../../core/index";
import { isCandidateId, isCommitteeId } from "./identity";
import type {
  FecCandidateRecord,
  FecCommitteeRecord,
  FecLinkageRecord,
} from "./types";

export interface FecNormalizeResult<TRecord> {
  readonly records: readonly TRecord[];
  readonly defects: readonly ParseDefect[];
}

function reader(columns: readonly string[], row: DelimitedRow) {
  return (name: string): string | null => {
    const index = columns.indexOf(name);
    if (index === -1) return null;
    const value = row.fields[index];
    return value === undefined || value === "" ? null : value;
  };
}

function year(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function evidenceFor(
  artifactId: string,
  line: number,
  nativeId: string,
): Evidence {
  return {
    artifactId,
    locator: { kind: "delimited-row", artifactId, line },
    providerNativeId: nativeId,
  };
}

export function normalizeCandidates(
  rows: readonly DelimitedRow[],
  columns: readonly string[],
  artifactId: string,
): FecNormalizeResult<FecCandidateRecord> {
  const records: FecCandidateRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const read = reader(columns, row);
    const candidateId = read("CAND_ID");
    const candidateName = read("CAND_NAME");
    if (candidateId === null || candidateName === null) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: a candidate row has no identifier or no name, so it is dropped rather than given an empty one.`,
      });
      continue;
    }
    if (!isCandidateId(candidateId)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: candidate id "${candidateId}" does not match the FEC's published grammar.`,
      });
      continue;
    }
    records.push({
      recordKind: "candidate",
      recordId: `candidate:${candidateId}`,
      candidateId,
      candidateName,
      partyAffiliationCode: read("CAND_PTY_AFFILIATION"),
      electionYear: year(read("CAND_ELECTION_YR")),
      officeStateCode: read("CAND_OFFICE_ST"),
      officeCode: read("CAND_OFFICE"),
      officeDistrict: read("CAND_OFFICE_DISTRICT"),
      incumbentChallengerOpenCode: read("CAND_ICI"),
      candidateStatusCode: read("CAND_STATUS"),
      principalCampaignCommitteeId: read("CAND_PCC"),
      mailingCity: read("CAND_CITY"),
      mailingStateCode: read("CAND_ST"),
      mailingZip: read("CAND_ZIP"),
      evidence: evidenceFor(artifactId, row.line, candidateId),
    });
  }
  return { records, defects };
}

export function normalizeCommittees(
  rows: readonly DelimitedRow[],
  columns: readonly string[],
  artifactId: string,
): FecNormalizeResult<FecCommitteeRecord> {
  const records: FecCommitteeRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const read = reader(columns, row);
    const committeeId = read("CMTE_ID");
    const committeeName = read("CMTE_NM");
    if (committeeId === null || committeeName === null) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: a committee row has no identifier or no name, so it is dropped.`,
      });
      continue;
    }
    if (!isCommitteeId(committeeId)) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: committee id "${committeeId}" does not match the FEC's published grammar.`,
      });
      continue;
    }
    records.push({
      recordKind: "committee",
      recordId: `committee:${committeeId}`,
      committeeId,
      committeeName,
      treasurerName: read("TRES_NM"),
      committeeCity: read("CMTE_CITY"),
      committeeStateCode: read("CMTE_ST"),
      committeeZip: read("CMTE_ZIP"),
      committeeDesignationCode: read("CMTE_DSGN"),
      committeeTypeCode: read("CMTE_TP"),
      partyAffiliationCode: read("CMTE_PTY_AFFILIATION"),
      filingFrequencyCode: read("CMTE_FILING_FREQ"),
      organizationTypeCode: read("ORG_TP"),
      connectedOrganizationName: read("CONNECTED_ORG_NM"),
      candidateId: read("CAND_ID"),
      evidence: evidenceFor(artifactId, row.line, committeeId),
    });
  }
  return { records, defects };
}

export function normalizeLinkages(
  rows: readonly DelimitedRow[],
  columns: readonly string[],
  artifactId: string,
): FecNormalizeResult<FecLinkageRecord> {
  const records: FecLinkageRecord[] = [];
  const defects: ParseDefect[] = [];

  for (const row of rows) {
    const read = reader(columns, row);
    const linkageId = read("LINKAGE_ID");
    const candidateId = read("CAND_ID");
    const committeeId = read("CMTE_ID");
    if (linkageId === null || candidateId === null || committeeId === null) {
      defects.push({
        kind: "unparsable-record",
        line: row.line,
        message: `Line ${row.line}: a linkage row is missing one of its three identifiers, and a link to nothing is not a link.`,
      });
      continue;
    }
    records.push({
      recordKind: "linkage",
      recordId: `linkage:${linkageId}`,
      linkageId,
      candidateId,
      committeeId,
      candidateElectionYear: year(read("CAND_ELECTION_YR")),
      fecElectionYear: year(read("FEC_ELECTION_YR")),
      committeeTypeCode: read("CMTE_TP"),
      committeeDesignationCode: read("CMTE_DSGN"),
      evidence: evidenceFor(artifactId, row.line, linkageId),
    });
  }
  return { records, defects };
}
