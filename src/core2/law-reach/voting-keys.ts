/**
 * The election and office laws group A's voting reach reads, by key. The
 * module imports nothing, so the turnout and elections engines can read the
 * keys while the voting reach is itself still loading.
 */
const P = "us-policy-positions:";
export const PHOTO_ID = `${P}government-operations.require-photo-id-to-vote`;
export const AUTO_REGISTRATION = `${P}government-operations.automatic-voter-registration`;
export const SAME_DAY = `${P}government-operations.same-day-voter-registration`;
export const ALL_MAIL = `${P}government-operations.all-mail-voting`;
export const RESTORE_VOTE = `${P}justice-public-safety.restore-voting-after-sentence`;
export const REDISTRICTING = `${P}government-operations.independent-redistricting`;
export const TERM_LIMITS = `${P}government-operations.legislative-term-limits`;
export const LOBBYING_BAN = `${P}government-operations.ban-lobbying-after-office`;
