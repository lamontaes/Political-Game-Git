// Pure logic for the civic-prose blind-evaluation harness.
//
// The harness prepares anonymized owner-review bundles from raw configuration
// outputs. It never scores, ranks, or judges prose itself: owner preference is
// decisive, and no model judge is ever called from this tooling.

export const CONFIG_IDS = ["A", "B", "C", "D"] as const;
export type ConfigId = (typeof CONFIG_IDS)[number];

export const RESULT_CLASSES = [
  "SAFE_RENDER",
  "SAFE_RENDER_WITH_OMISSION",
  "MISSING_CONTEXT",
] as const;
export type ResultClass = (typeof RESULT_CLASSES)[number];

export interface RawOutput {
  packetId: string;
  config: ConfigId;
  content: string;
}

export interface ParsedResult {
  resultClass: ResultClass | null;
  problems: string[];
}

// Validate the standard wrapper output shape without judging the prose.
export function parseResultClass(content: string): ParsedResult {
  const problems: string[] = [];
  const resultLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("result:"));
  if (resultLines.length !== 1) {
    problems.push(
      `expected exactly one "result:" line, found ${resultLines.length}`,
    );
    return { resultClass: null, problems };
  }
  const declared = resultLines[0].slice("result:".length).trim();
  const resultClass = RESULT_CLASSES.find((cls) => cls === declared) ?? null;
  if (resultClass === null) {
    problems.push(`unknown result class "${declared}"`);
    return { resultClass: null, problems };
  }
  const hasProse = /^\s*prose:/m.test(content);
  const hasOmitted = /^\s*omitted:/m.test(content);
  const hasMissing = /^\s*missing:/m.test(content);
  const hasReason = /^\s*reason:/m.test(content);
  if (resultClass === "SAFE_RENDER" && !hasProse) {
    problems.push("SAFE_RENDER requires a prose: field");
  }
  if (resultClass === "SAFE_RENDER_WITH_OMISSION") {
    if (!hasProse) problems.push("SAFE_RENDER_WITH_OMISSION requires prose:");
    if (!hasOmitted)
      problems.push("SAFE_RENDER_WITH_OMISSION requires omitted:");
  }
  if (resultClass === "MISSING_CONTEXT") {
    if (!hasMissing) problems.push("MISSING_CONTEXT requires missing:");
    if (!hasReason) problems.push("MISSING_CONTEXT requires reason:");
    if (hasProse) problems.push("MISSING_CONTEXT must not include prose:");
  }
  return { resultClass, problems };
}

// Patterns that would identify which configuration produced an output. Whole
// lines containing any of these are stripped before owner review; if a
// pattern still remains inside surviving prose, the bundle build fails rather
// than leak it.
const LEAK_PATTERNS: RegExp[] = [
  /\bclaude[-\s]?fable\b/i,
  /\bfable\s*5\b/i,
  /\bclaude-[a-z0-9-]+\b/i,
  /\beffort:\s*(low|medium|high)\b/i,
  /\bconfiguration\s+[ABCD]\b/,
  /\bconfig(?:uration)?:\s*[ABCD]\b/,
  /claude\.ai\/code\/session_/i,
  /\bcivic-prose\b/i,
  /\bskill\b/i,
  /\bmodel\b/i,
];

export interface SanitizedOutput {
  text: string;
  removedLines: string[];
}

export function sanitizeOutput(content: string): SanitizedOutput {
  const removedLines: string[] = [];
  const kept = content.split("\n").filter((line) => {
    const leaks = LEAK_PATTERNS.some((pattern) => pattern.test(line));
    if (leaks) removedLines.push(line);
    return !leaks;
  });
  return { text: kept.join("\n").trim(), removedLines };
}

export function findResidualLeaks(text: string): string[] {
  return LEAK_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) =>
    String(pattern),
  );
}

// Deterministic seeded shuffle so a bundle is reproducible from its recorded
// seed. Order is independent per packet: a single global A/B/C order would
// defeat blindness after the first unblinding.
function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seedText: string): T[] {
  const random = mulberry32(hashString(seedText));
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

export interface PacketBundle {
  packetId: string;
  reviewMarkdown: string;
  versionSources: Record<string, ConfigId>;
  parseProblems: Record<ConfigId, string[]>;
}

export function buildPacketBundle(
  packetId: string,
  outputs: readonly RawOutput[],
  seed: string,
): PacketBundle {
  const ordered = seededShuffle(outputs, `${seed}::${packetId}`);
  const versionSources: Record<string, ConfigId> = {};
  const parseProblems = {} as Record<ConfigId, string[]>;
  const sections: string[] = [
    `# PACKET ${packetId} — blind review`,
    "",
    "Judge each version APPROVE / CONDITIONAL / REJECT with a reason, then",
    "name the best version (or a tie). The producing sources stay sealed",
    "in the mapping file until verdicts are locked.",
    "",
  ];
  ordered.forEach((output, index) => {
    const versionLabel = `VERSION ${index + 1}`;
    versionSources[versionLabel] = output.config;
    parseProblems[output.config] = parseResultClass(output.content).problems;
    const sanitized = sanitizeOutput(output.content);
    const strippedProse = sanitized.removedLines.some((line) =>
      /^\s*prose:/.test(line),
    );
    if (strippedProse) {
      throw new Error(
        `packet ${packetId} config ${output.config}: configuration-identifying ` +
          `text sits inside the prose itself; sanitization would have to drop ` +
          `the prose to hide it. Fix the raw output instead of shipping a ` +
          `leaky or gutted bundle`,
      );
    }
    sections.push(`## ${versionLabel}`, "", sanitized.text, "");
  });
  return {
    packetId,
    reviewMarkdown: sections.join("\n"),
    versionSources,
    parseProblems,
  };
}

// Holdout hygiene: held-out packets live only in Drive and must never appear
// in skill files, examples, or few-shots. The machine-checkable part is the
// packet id shape (H-###) and the holdout Drive document id.
const HOLDOUT_ID_PATTERN = /\bH-\d{3}\b/;
const HOLDOUT_DOC_ID = "12iZL05wozOx";

export interface HygieneViolation {
  path: string;
  reason: string;
}

export function scanHoldoutHygiene(
  files: readonly { path: string; content: string }[],
): HygieneViolation[] {
  const violations: HygieneViolation[] = [];
  for (const file of files) {
    if (HOLDOUT_ID_PATTERN.test(file.content)) {
      violations.push({
        path: file.path,
        reason: "contains a holdout packet id (H-###)",
      });
    }
    if (file.content.includes(HOLDOUT_DOC_ID)) {
      violations.push({
        path: file.path,
        reason: "references the holdout Drive document id",
      });
    }
  }
  return violations;
}
