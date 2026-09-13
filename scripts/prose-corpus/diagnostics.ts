import type { ProseRecord } from "./types";

/**
 * The recurring prose defects, measured — and separated by what a finding
 * actually licenses.
 *
 * A HARD ERROR is a fact about the corpus that is objectively wrong: a
 * semantic-ID collision, a slot the record's own grounding cannot bind, a
 * withheld stage claiming reachability. These are failures and should stop a
 * run.
 *
 * A REVIEW WARNING is a place worth an owner's eye. Nothing here is a ban.
 * A grounded character may legitimately say "something"; a good sentence may
 * legitimately contain "rather than". Style lint that fails a build produces
 * prose written to satisfy a regex, which is a worse defect than the one it
 * was pointed at — so warnings report and count, and a person decides.
 */

export type DiagnosticSeverity = "HARD_ERROR" | "REVIEW_WARNING";

export type DiagnosticFamily =
  | "unbindable-slot"
  | "withheld-claimed-reachable"
  | "empty-text"
  | "vague-referent"
  | "anonymous-actor"
  | "third-person-player"
  | "and-it-scaffold"
  | "rather-than-scaffold"
  | "which-x-which-y"
  | "redundant-exposition"
  | "interpretive-ending"
  | "generic-recap"
  | "label-restated-in-description"
  | "slot-agreement"
  | "near-duplicate"
  | "repeated-scaffold";

export interface Diagnostic {
  readonly id: string;
  readonly severity: DiagnosticSeverity;
  readonly family: DiagnosticFamily;
  readonly message: string;
  /** The exact fragment that triggered it, for a reviewer to judge. */
  readonly evidence: string;
}

const VAGUE = [
  "something",
  "somebody",
  "someone",
  "the thing",
  "whatever",
  "some kind of",
  "a certain",
  "stuff",
];

/**
 * Third-person reference to the player, which owner rule 1 forbids outright in
 * player-facing scenes. Reported as a warning rather than an error because the
 * same words are correct in an in-world artifact, which keeps its own register,
 * and the corpus cannot always tell which surface it is looking at.
 */
const THIRD_PERSON =
  /\b(the senator|the representative|the judge|the councilmember|the mayor|the governor|the candidate)\b/i;

const INTERPRETIVE_ENDING =
  /(and that (is|was) (what|how)|which (is|was) (the|what)|what it mean[st]|says more about|in the end,|changes the shape of|the version .{0,20} put in the room)/i;

const GENERIC_RECAP =
  /^(you (still|had|have) (not )?(got|get|decided)|it (is|was) still (open|there)|nothing (has|had) (been|come))/i;

function normalized(text: string): string {
  return text
    .toLowerCase()
    .replace(/\{[^}]*\}/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Every way a bound role can be named.
 *
 * A role the grounding declares is not only written `{role:x}`. Packet 72 gave
 * the banks a closed vocabulary for referring to the same bound person —
 * `{who:x}` introduces them, `{they:x}` and `{their:x}` refer back, `{has:x}`
 * and `{is:x}` agree the verb with them — and every one of those resolves
 * through the same binding. The lint knew only the first spelling, so it was
 * reporting a dozen correctly grounded lines as untraceable.
 */
const ROLE_SLOT_FORMS = [
  "role",
  "who",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "s",
  "es",
  "is",
  "has",
  "was",
  "does",
] as const;

/** Slots a record's own declared grounding could plausibly bind. */
function bindableSlots(record: ProseRecord): ReadonlySet<string> {
  const bindable = new Set(["self", "place", "age", "date", "name"]);
  for (const ref of record.grounding) {
    if (ref.key.startsWith("role:")) {
      const role = ref.key.slice("role:".length);
      bindable.add(ref.key);
      bindable.add(role);
      for (const form of ROLE_SLOT_FORMS) bindable.add(`${form}:${role}`);
    }
    // `{detail:x}` draws one of the family's own authored alternatives. It is
    // traceable exactly when the family declares that detail, which is what
    // puts the key in the record's grounding.
    if (ref.key.startsWith("detail:")) bindable.add(ref.key);
  }
  return bindable;
}

function checkOne(record: ProseRecord): Diagnostic[] {
  const found: Diagnostic[] = [];
  const text = record.text;
  const add = (
    severity: DiagnosticSeverity,
    family: DiagnosticFamily,
    message: string,
    evidence: string,
  ): void => {
    found.push({ id: record.id, severity, family, message, evidence });
  };

  /* ---- Hard errors: objectively wrong, not a matter of taste ---- */

  if (text.trim().length === 0) {
    add("HARD_ERROR", "empty-text", "The record holds no text.", "");
  }

  const bindable = bindableSlots(record);
  for (const slot of record.slots) {
    // `role:x` slots must name a role the record's grounding actually declares,
    // or the sentence names a person the scene never bound.
    if (
      slot.startsWith("role:") &&
      !bindable.has(slot) &&
      !record.tags.includes("computed")
    ) {
      add(
        "HARD_ERROR",
        "unbindable-slot",
        `The template fills {${slot}} but the record's grounding declares no such role.`,
        slot,
      );
      continue;
    }
    // A computed surface's "slots" are the code expressions the syntax tree
    // found inside a template literal, not authored slot names. Holding them
    // to the authored slot vocabulary would report every interpolation in the
    // conversation and briefing surfaces as a defect, which is noise, not a
    // finding.
    if (
      !slot.startsWith("role:") &&
      !bindable.has(slot) &&
      !record.tags.includes("computed")
    ) {
      add(
        "REVIEW_WARNING",
        "slot-agreement",
        `The template fills {${slot}}, which is not one of the slots the corpus can trace to declared grounding.`,
        slot,
      );
    }
  }

  if (
    record.reachability === "WITHHELD_BY_GROUNDING" &&
    record.reachabilityReason.trim().length === 0
  ) {
    add(
      "HARD_ERROR",
      "withheld-claimed-reachable",
      "A withheld record must carry the bank's own reason for withholding it.",
      record.reachability,
    );
  }

  /* ---- Review warnings: a person decides ---- */

  for (const term of VAGUE) {
    const pattern = new RegExp(`\\b${term}\\b`, "i");
    const match = pattern.exec(text);
    if (match) {
      add(
        "REVIEW_WARNING",
        "vague-referent",
        `Uses "${term}". Legitimate in dialogue; a defect when it stands in for a fact the packet has.`,
        match[0],
      );
    }
  }

  const anonymous =
    /\b(a colleague|a coworker|a neighbou?r|a friend|a relative|somebody at work|someone from)\b/i.exec(
      text,
    );
  if (
    anonymous &&
    record.grounding.some((ref) => ref.key.startsWith("role:"))
  ) {
    add(
      "REVIEW_WARNING",
      "anonymous-actor",
      "Names a person by category while the record binds a canonical person for that role.",
      anonymous[0],
    );
  }

  const thirdPerson = THIRD_PERSON.exec(text);
  if (thirdPerson && record.surface !== "artifact") {
    add(
      "REVIEW_WARNING",
      "third-person-player",
      "Third-person role reference on a character-facing surface, where second person is the register.",
      thirdPerson[0],
    );
  }

  const andIt = text.match(/\band it\b/gi);
  if (andIt && andIt.length > 0) {
    add(
      "REVIEW_WARNING",
      "and-it-scaffold",
      `The "and it ..." scaffold appears ${andIt.length} time(s).`,
      "and it",
    );
  }

  if (/\brather than\b/i.test(text)) {
    add(
      "REVIEW_WARNING",
      "rather-than-scaffold",
      'The "rather than" scaffold. Often correct; counted so its corpus-wide density can be seen.',
      "rather than",
    );
  }

  const whichWhich = /\bwhich [^.,;]{2,40}\band which\b/i.exec(text);
  if (whichWhich) {
    add(
      "REVIEW_WARNING",
      "which-x-which-y",
      'The "which X and which Y" construction.',
      whichWhich[0],
    );
  }

  const interpretive = INTERPRETIVE_ENDING.exec(text);
  if (interpretive) {
    add(
      "REVIEW_WARNING",
      "interpretive-ending",
      "Reads as interpretation of the scene rather than the scene. Owner rule 7 and 8.",
      interpretive[0],
    );
  }

  if (record.surface === "thread-recap") {
    const generic = GENERIC_RECAP.exec(text.trim());
    if (generic) {
      add(
        "REVIEW_WARNING",
        "generic-recap",
        "Thread recap that restates that something is open without saying what moved.",
        generic[0],
      );
    }
  }

  return found;
}

/** A description that only re-says its own label. Owner rule 2. */
function labelOverlap(records: readonly ProseRecord[]): Diagnostic[] {
  const byOption = new Map<
    string,
    { label?: ProseRecord; description?: ProseRecord }
  >();
  for (const record of records) {
    const match = /^option:(.+):(label|description)$/.exec(record.field);
    if (!match) continue;
    const key = `${record.stableKey}#option:${match[1]}`;
    const entry = byOption.get(key) ?? {};
    if (match[2] === "label") entry.label = record;
    else entry.description = record;
    byOption.set(key, entry);
  }
  const found: Diagnostic[] = [];
  for (const entry of byOption.values()) {
    if (!entry.label || !entry.description) continue;
    const labelWords = new Set(normalized(entry.label.text).split(" "));
    const descWords = normalized(entry.description.text).split(" ");
    if (descWords.length === 0) continue;
    const shared = descWords.filter((word) => labelWords.has(word)).length;
    const ratio = shared / descWords.length;
    if (ratio >= 0.7) {
      found.push({
        id: entry.description.id,
        severity: "REVIEW_WARNING",
        family: "label-restated-in-description",
        message: `The description repeats ${Math.round(ratio * 100)}% of its own label's words.`,
        evidence: entry.label.text,
      });
    }
  }
  return found;
}

export interface DiagnosticReport {
  readonly findings: readonly Diagnostic[];
  readonly hardErrors: readonly Diagnostic[];
  readonly warnings: readonly Diagnostic[];
  readonly countsByFamily: Readonly<Record<string, number>>;
}

export function runDiagnostics(
  records: readonly ProseRecord[],
): DiagnosticReport {
  const findings = [
    ...records.flatMap(checkOne),
    ...labelOverlap(records),
  ].sort((left, right) =>
    left.id !== right.id
      ? left.id < right.id
        ? -1
        : 1
      : left.family < right.family
        ? -1
        : left.family > right.family
          ? 1
          : 0,
  );
  const countsByFamily: Record<string, number> = {};
  for (const finding of findings) {
    countsByFamily[finding.family] = (countsByFamily[finding.family] ?? 0) + 1;
  }
  return {
    findings,
    hardErrors: findings.filter((entry) => entry.severity === "HARD_ERROR"),
    warnings: findings.filter((entry) => entry.severity === "REVIEW_WARNING"),
    countsByFamily: Object.fromEntries(
      Object.entries(countsByFamily).sort(([left], [right]) =>
        left < right ? -1 : 1,
      ),
    ),
  };
}
