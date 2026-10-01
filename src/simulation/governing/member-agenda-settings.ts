/** Pure filing settings; no World or caller imports. */
export const LOCAL_MEMBER_AGENDA_VERSION = "local-member-agenda/v1";
/**
 * CTO-approved common score calibration (October 1, 3:54/4:29/8:22): median
 * sourced session bills/member KS 3.7, NM 5.2, KY 8.8, FL 11 is 7. The saved
 * distribution covers 7,780 seated members across all 51 recorded bodies.
 * The closest inclusive positive cutoff is 1.575: 59,969 member-question
 * opportunities (7.708/member), versus 37,505 (4.821/member) at 1.61875.
 * This calibrates score coverage, not a quota or observed filing count. Existing
 * pending-question, one-best/member/intake, current-law and compiler caps stay.
 * Full derivation/citations: data/research/lawmaking-throughput/
 * team1-filing-threshold-calibration.json. No per-state threshold or dice.
 */
const FILING_THRESHOLD = 1.575;

/** Existing filing behavior carried as settings while callers consolidate. */
export const MEMBER_AGENDA_LEVEL_SETTINGS = {
  state: {
    governmentLevel: "state",
    intakeVersion: "legislative-intake/v1",
    filingThreshold: FILING_THRESHOLD,
    issuePrefix: null,
    compileBeforeSelection: true,
    mappedCooldownOnly: false,
    recordMotive: false,
    cosponsors: false,
    actTitles: false,
    individualAgenda: true,
    municipalAgenda: false,
    mappedOnly: false,
    measureNoun: "bill",
  },
  federal: {
    governmentLevel: "federal",
    intakeVersion: "congress-intake/v1",
    filingThreshold: FILING_THRESHOLD,
    issuePrefix: "us-federal:",
    compileBeforeSelection: false,
    mappedCooldownOnly: true,
    recordMotive: true,
    cosponsors: true,
    actTitles: true,
    individualAgenda: true,
    municipalAgenda: false,
    mappedOnly: false,
    measureNoun: "bill",
  },
  localFiscal: {
    governmentLevel: "municipality",
    intakeVersion: LOCAL_MEMBER_AGENDA_VERSION,
    filingThreshold: FILING_THRESHOLD,
    issuePrefix: null,
    compileBeforeSelection: true,
    mappedCooldownOnly: false,
    recordMotive: false,
    cosponsors: false,
    actTitles: false,
    individualAgenda: true,
    municipalAgenda: true,
    mappedOnly: true,
    measureNoun: "ordinance",
  },
  localPosition: {
    governmentLevel: "municipality",
    intakeVersion: LOCAL_MEMBER_AGENDA_VERSION,
    filingThreshold: FILING_THRESHOLD,
    issuePrefix: null,
    compileBeforeSelection: false,
    mappedCooldownOnly: false,
    recordMotive: true,
    cosponsors: false,
    actTitles: false,
    individualAgenda: true,
    municipalAgenda: true,
    mappedOnly: false,
    measureNoun: "ordinance",
  },
} as const;

/** Preserved council filing policy; the shared filer owns selection and writing. */
export const COUNCIL_MEMBER_AGENDA_SETTINGS = {
  ...MEMBER_AGENDA_LEVEL_SETTINGS.localPosition,
  intakeVersion: "council-lawmaking/v1",
  refileAfterDays: 365,
} as const;
