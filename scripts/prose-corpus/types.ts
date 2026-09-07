/**
 * What one piece of player-facing prose is, for review.
 *
 * This is a development-time *description* of prose that already exists in the
 * production banks. Nothing here authors prose, selects it, decides simulation
 * truth, or is imported by anything under `src/`. The banks stay where they
 * are and stay authoritative; this file is the shape the question "what prose
 * does this game currently have, and can a player actually reach it?" has an
 * answer in.
 *
 * The rule that keeps it honest is the same one the content index already
 * follows: a dimension the source bank does not declare is reported as
 * undeclared with a reason, never filled in from a guess. A corpus that
 * quietly invents a reachability claim is worse than one that says UNKNOWN,
 * because the invented one reviews as fact.
 */

/** The part of the game a prose record belongs to. */
export type ProseDomain =
  | "life"
  | "setup"
  | "narration"
  | "conversation"
  | "campaign"
  | "election"
  | "legislative"
  | "governing"
  | "ordinary"
  | "shell";

/**
 * Where a player stands in relation to this text.
 *
 * `WITHHELD_BY_GROUNDING` is read from the production bank's own `withheld`
 * requirement, not inferred: PR #119 made withholding a first-class
 * `EpisodeRequirement`, so the corpus reports what the stage declares.
 *
 * `DEV_FIXTURE_ONLY` exists because a test being able to open something is not
 * the same as a player reaching it. A synthetic catalog, a development route
 * and an authoring fixture are all reachable by a test and by nobody playing.
 */
export type ProseReachability =
  | "PLAYER_REACHABLE"
  | "WITHHELD_BY_GROUNDING"
  | "DEV_FIXTURE_ONLY"
  | "LEGACY_OR_WITHDRAWN"
  | "CURRENTLY_UNREACHABLE"
  | "UNKNOWN";

/** The kind of surface the text occupies, which decides its register. */
export type ProseSurface =
  | "scene-line"
  | "option-label"
  | "option-description"
  | "option-memory"
  | "option-witnessed"
  | "prompt"
  | "answer"
  | "connective"
  | "thread-title"
  | "thread-reason"
  | "thread-recap"
  | "callback"
  | "status"
  | "artifact"
  | "quiet";

/** Whether the stored text is what a player sees, or a template with slots. */
export type ProseRealization = "static" | "templated";

/** One canonical fact the text's claims are licensed by. */
export interface ProseGroundingRef {
  /** `age`, `role:colleague`, `fact:has-work` — the bank's own vocabulary. */
  readonly key: string;
  /** What the bank says this requires, verbatim where it says it. */
  readonly description: string;
  /** Where the requirement is declared. */
  readonly kind:
    | "requirement"
    | "role"
    | "age-gate"
    | "withheld"
    | "eligibility"
    | "slot"
    | "undeclared";
}

export interface ProseRecord {
  /** `prose:<domain>:<bank>:<stable-key>#<field>`. Stable, never positional. */
  readonly id: string;
  readonly domain: ProseDomain;
  /** The bank or family this belongs to, in the bank's own vocabulary. */
  readonly bank: string;
  /** The item's stable key inside the bank. Never an array index alone. */
  readonly stableKey: string;
  /** The field within the item, e.g. `line:0`, `option:speak-up:label`. */
  readonly field: string;
  readonly surface: ProseSurface;
  readonly sourcePath: string;
  /** The exported symbol a reviewer can open to read this. */
  readonly sourceSymbol: string;
  readonly text: string;
  readonly realization: ProseRealization;
  /** Slot names the template expects, e.g. `self`, `role:colleague`. */
  readonly slots: readonly string[];
  readonly reachability: ProseReachability;
  /** Why the reachability is what it is. Never empty. */
  readonly reachabilityReason: string;
  readonly grounding: readonly ProseGroundingRef[];
  /** Review/provenance metadata the bank itself carries, where it does. */
  readonly provenance: Readonly<Record<string, string>> | null;
  readonly tags: readonly string[];
}

/** A realized line seen in a transcript, linked back to its template. */
export interface ProseRealizationRecord {
  /** The template this came from, or null when no template could be matched. */
  readonly templateId: string | null;
  readonly text: string;
  /** Stable digest of the realized text, for comparison across runs. */
  readonly textHash: string;
  readonly seedKey: string;
  readonly beatOrdinal: number;
}
