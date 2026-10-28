/**
 * British vocabulary that authored copy and owner reports must not use.
 * Plain JavaScript so `scripts/report-check/hook.mjs` loads it on the pinned
 * Node (22.13), which cannot import a `.ts` file.
 */
export const queueIdiom = /\bqueue(d|ing|s)?\b/i;

/** @type {readonly { pattern: RegExp; instead: string }[]} */
export const BRITISH_IDIOM = [
  { pattern: /\bprogrammes?\b/i, instead: "program(s)" },
  { pattern: /£/, instead: "$" },
  { pattern: /\bcouncillors?\b/i, instead: "council member(s)" },
  { pattern: /\blorr(y|ies)\b/i, instead: "truck / trucks" },
  { pattern: /\bwhilst\b/i, instead: "while" },
  { pattern: /\bamongst\b/i, instead: "among" },
  { pattern: /\bfortnights?\b/i, instead: "two weeks" },
  { pattern: /\bcatchment\b/i, instead: "attendance zone" },
  { pattern: /\bthe bins\b/i, instead: "the trash cans" },
  { pattern: /\bcar parks?\b/i, instead: "parking lot(s)" },
  { pattern: /\bpetrol\b/i, instead: "gas" },
  { pattern: /\bpavements?\b/i, instead: "sidewalk(s)" },
  { pattern: /\bmaths\b/i, instead: "math" },
  { pattern: /\bchemist's\b/i, instead: "pharmacy" },
  { pattern: /\bsolicitors?\b/i, instead: "lawyer(s)" },
  {
    pattern: /\bcentral ministry\b/i,
    instead: "a named federal or state agency",
  },
  { pattern: /\bpostcodes?\b/i, instead: "ZIP code(s)" },
  { pattern: /\bnappies\b/i, instead: "diapers" },
  { pattern: queueIdiom, instead: "line / lined up" },
];

/**
 * More British vocabulary, checked only in player text (string literals in
 * shipped source and string values in data), where the words below have a
 * British sense a player would notice. Kept apart from BRITISH_IDIOM because
 * owner reports use some of them in their American sense (a ward of a city,
 * a cabinet minister abroad). Spelling is the
 * spelling engine's job (american-spelling.ts), not a list here.
 *
 * @type {readonly { pattern: RegExp; instead: string }[]}
 */
export const PLAYER_VOCABULARY = [
  { pattern: /\bkerbs?\b/i, instead: "curb" },
  { pattern: /\btyres?\b/i, instead: "tire" },
  // Lowercase only: Rota is an island in the Northern Mariana Islands.
  { pattern: /\brotas?\b/, instead: "schedule" },
  {
    // "queue" is also the ordinary American word for a work or data queue, so
    // only the people-waiting sense is flagged.
    pattern:
      /\b(?:join|joins|joined|joining|jump|jumps|jumped|jumping|stand|stands|standing|stood|wait|waits|waiting|waited|line(?:d)? up)\b[^.]{0,30}\bqueue\b|\bqueue(?:s|d)? (?:at the (?:checkout|bank|counter|till|door|bus|station|post office|shop|store|cafe|pharmacy|clinic)|for the (?:bus|train|checkout|till|toilets?|ride)|to (?:get in|see|buy|pay)|outside|around the (?:block|corner)|behind)\b|\bat the (?:back|front|end) of the queue\b|\b(?:long|short|slow|bus|bread|checkout|ticket|taxi) queues?\b|\bqueue-jump|\bqueuing\b|\bqueueing\b/i,
    instead: "line",
  },
  {
    // "flat" is an ordinary American adjective (flat rate, flat floor), so only
    // the apartment sense is flagged.
    pattern:
      /\b(?:my|your|his|her|their|our|shared|rented|new|old|small|tiny|cramped|upstairs|downstairs|top-floor|ground-floor|one-bedroom|two-bedroom|three-bedroom|studio|council|first-floor|second-floor) flats?\b|\bflats? (?:above|downstairs|upstairs|share|block)\b|\bflatmates?\b|\bflat-share\b|\bblock of flats\b/i,
    instead: "apartment",
  },
  {
    // Public holidays are American usage; only the vacation sense is flagged.
    pattern:
      /\b(?:on|summer|family|school|bank|half-term)\s+holidays?\b|\b(?:go|goes|going|went|gone|take|takes|taking|took|taken)\s+(?:a\s+|your\s+|their\s+|his\s+|her\s+|our\s+|my\s+)?holidays?\b|\bholiday(?:s)? (?:abroad|in (?:spain|france|italy))\b|\bholidaymakers?\b/i,
    instead: "vacation",
  },
  { pattern: /\bmum(?:s|my)?\b/i, instead: "mom" },
  { pattern: /\bhigh streets?\b/i, instead: "main street" },
  {
    pattern: /\blocal authorit(?:y|ies)\b/i,
    instead: "local government (or city / county)",
  },
  { pattern: /\belected members?\b/i, instead: "elected official" },
  {
    pattern:
      /\bstand(?:s|ing)? for (?:office|council|election|mayor|re-?election|the (?:council|mayoralty|seat))\b/i,
    instead: "run for",
  },
  {
    pattern: /\bminist(?:ers?|ry|ries)\b/i,
    instead: "secretary / department / official (clergy ministers are allowed)",
  },
  {
    pattern: /\bwards?\b/i,
    instead: "district (or the place's recorded seat type)",
  },
  { pattern: /\bcouncil tax\b/i, instead: "property tax" },
  { pattern: /\bmobile phones?\b/i, instead: "cell phone" },
  { pattern: /\btimetables?\b/i, instead: "schedule" },
];
