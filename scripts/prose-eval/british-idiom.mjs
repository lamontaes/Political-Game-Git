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
