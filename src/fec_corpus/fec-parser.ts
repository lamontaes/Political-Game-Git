import type {
  FecCandidateRecord,
  FecCandidateStatusCode,
  FecCommitteeDesignationCode,
  FecCommitteeRecord,
  FecCommitteeTypeCode,
  FecFilingFrequencyCode,
  FecIncumbentChallengerCode,
  FecInterestGroupCategoryCode,
  FecLinkageRecord,
  FecOfficeCode,
} from "./types.js";

function cleanField(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOfficeCode(raw: string | null): FecOfficeCode {
  if (raw === "H" || raw === "S" || raw === "P") {
    return raw;
  }
  return "UNKNOWN";
}

function parseIciCode(raw: string | null): FecIncumbentChallengerCode {
  if (raw === "I" || raw === "C" || raw === "O") {
    return raw;
  }
  return "UNKNOWN";
}

function parseCandidateStatus(raw: string | null): FecCandidateStatusCode {
  if (raw === "C" || raw === "F" || raw === "N" || raw === "P") {
    return raw;
  }
  return "UNKNOWN";
}

function parseCommitteeDesignation(
  raw: string | null,
): FecCommitteeDesignationCode {
  if (
    raw === "A" ||
    raw === "B" ||
    raw === "D" ||
    raw === "J" ||
    raw === "P" ||
    raw === "U"
  ) {
    return raw;
  }
  return "UNKNOWN";
}

function parseCommitteeType(raw: string | null): FecCommitteeTypeCode {
  const validTypes = new Set([
    "C",
    "E",
    "H",
    "I",
    "N",
    "O",
    "P",
    "Q",
    "S",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ]);
  if (raw && validTypes.has(raw)) {
    return raw as FecCommitteeTypeCode;
  }
  return "UNKNOWN";
}

function parseFilingFrequency(raw: string | null): FecFilingFrequencyCode {
  if (
    raw === "A" ||
    raw === "D" ||
    raw === "M" ||
    raw === "Q" ||
    raw === "T" ||
    raw === "W"
  ) {
    return raw;
  }
  return "UNKNOWN";
}

function parseInterestGroupCategory(
  raw: string | null,
): FecInterestGroupCategoryCode {
  if (
    raw === "C" ||
    raw === "L" ||
    raw === "M" ||
    raw === "T" ||
    raw === "V" ||
    raw === "W"
  ) {
    return raw;
  }
  return "UNKNOWN";
}

/**
 * Parses a single line from Candidate Master (`cn.txt`).
 */
export function parseCandidateLine(line: string): FecCandidateRecord | null {
  const parts = line.split("|");
  if (parts.length < 2) return null;

  const candidateId = cleanField(parts[0]);
  const candidateName = cleanField(parts[1]);
  if (!candidateId || !candidateName) return null;

  const partyAffiliation = cleanField(parts[2]);
  const electionYearRaw = cleanField(parts[3]);
  const electionYear = electionYearRaw ? parseInt(electionYearRaw, 10) : 0;
  const officeState = cleanField(parts[4]) ?? "US";
  const office = parseOfficeCode(cleanField(parts[5]));
  const district = cleanField(parts[6]) ?? "00";
  const incumbentChallengerStatus = parseIciCode(cleanField(parts[7]));
  const candidateStatus = parseCandidateStatus(cleanField(parts[8]));
  const principalCampaignCommitteeId = cleanField(parts[9]);
  const street1 = cleanField(parts[10]);
  const street2 = cleanField(parts[11]);
  const city = cleanField(parts[12]);
  const state = cleanField(parts[13]);
  const zipCode = cleanField(parts[14]);

  return {
    candidateId,
    candidateName,
    partyAffiliation,
    electionYear: isNaN(electionYear) ? 0 : electionYear,
    officeState,
    office,
    district,
    incumbentChallengerStatus,
    candidateStatus,
    principalCampaignCommitteeId,
    street1,
    street2,
    city,
    state,
    zipCode,
  };
}

/**
 * Parses a single line from Committee Master (`cm.txt`).
 */
export function parseCommitteeLine(line: string): FecCommitteeRecord | null {
  const parts = line.split("|");
  if (parts.length < 2) return null;

  const committeeId = cleanField(parts[0]);
  const committeeName = cleanField(parts[1]);
  if (!committeeId || !committeeName) return null;

  const treasurerName = cleanField(parts[2]);
  const street1 = cleanField(parts[3]);
  const street2 = cleanField(parts[4]);
  const city = cleanField(parts[5]);
  const state = cleanField(parts[6]);
  const zipCode = cleanField(parts[7]);
  const designation = parseCommitteeDesignation(cleanField(parts[8]));
  const committeeType = parseCommitteeType(cleanField(parts[9]));
  const partyAffiliation = cleanField(parts[10]);
  const filingFrequency = parseFilingFrequency(cleanField(parts[11]));
  const interestGroupCategory = parseInterestGroupCategory(
    cleanField(parts[12]),
  );
  const connectedOrganizationName = cleanField(parts[13]);
  const candidateId = cleanField(parts[14]);

  return {
    committeeId,
    committeeName,
    treasurerName,
    street1,
    street2,
    city,
    state,
    zipCode,
    designation,
    committeeType,
    partyAffiliation,
    filingFrequency,
    interestGroupCategory,
    connectedOrganizationName,
    candidateId,
  };
}

/**
 * Parses a single line from Candidate-Committee Linkage (`ccl.txt`).
 */
export function parseLinkageLine(line: string): FecLinkageRecord | null {
  const parts = line.split("|");
  if (parts.length < 4) return null;

  const candidateId = cleanField(parts[0]);
  const candElectionYearRaw = cleanField(parts[1]);
  const fecElectionYearRaw = cleanField(parts[2]);
  const committeeId = cleanField(parts[3]);

  if (!candidateId || !committeeId) return null;

  const candElectionYear = candElectionYearRaw
    ? parseInt(candElectionYearRaw, 10)
    : 0;
  const fecElectionYear = fecElectionYearRaw
    ? parseInt(fecElectionYearRaw, 10)
    : 0;
  const committeeType = parseCommitteeType(cleanField(parts[4]));
  const committeeDesignation = parseCommitteeDesignation(cleanField(parts[5]));
  const linkageId = cleanField(parts[6]) ?? `${candidateId}-${committeeId}`;

  return {
    candidateId,
    candidateElectionYear: isNaN(candElectionYear) ? 0 : candElectionYear,
    fecElectionYear: isNaN(fecElectionYear) ? 0 : fecElectionYear,
    committeeId,
    committeeType,
    committeeDesignation,
    linkageId,
  };
}
