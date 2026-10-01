/** Pure filing settings; no World or caller imports. */
export const LOCAL_MEMBER_AGENDA_VERSION = "local-member-agenda/v1";
/** Existing authored filing threshold, unchanged by consolidation. */
const FILING_THRESHOLD = 3;

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
    individualAgenda: false,
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
    individualAgenda: false,
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
