/**
 * The vocabulary the release tooling reasons in.
 *
 * Everything here is data. The parsers produce it, the planner consumes it, and
 * the writer is the only thing that touches the filesystem — so the interesting
 * decisions (what version comes next, which notes get written, whether the
 * release is allowed at all) are pure functions a test can drive without a git
 * repository, a network, or a clock.
 */

/** How much a merged change moves the accepted release number. */
export type ChangeImpact = "none" | "patch" | "minor";

/** The four headings player-facing notes are grouped under. */
export type NoteSection = "Added" | "Improved" | "Fixed" | "Changed";

export const NOTE_SECTIONS: readonly NoteSection[] = [
  "Added",
  "Improved",
  "Fixed",
  "Changed",
];

/**
 * One agent's declaration about one merged change.
 *
 * Fragments are inputs, not a changelog. They exist so two branches can each
 * declare their own change without editing the same paragraph of
 * `PATCH_NOTES.md` and colliding; the release consumes them and deletes them.
 */
export interface ChangeDeclaration {
  /** Stable identifier, also the fragment's filename stem. */
  readonly id: string;
  readonly impact: ChangeImpact;
  /** Absent when `impact` is `none` — a change with no player note has no section. */
  readonly section?: NoteSection;
  /** Absent when `impact` is `none`. */
  readonly title?: string;
  /**
   * Player-facing prose for `patch`/`minor`; for `none`, the internal one-line
   * reason this change has nothing to tell a player. Requiring the reason keeps
   * "no player note" a decision somebody made rather than an empty field.
   */
  readonly body: string;
  /** Repository-relative path, for error messages. Absent for synthetic fixtures. */
  readonly path?: string;
}

/** A `## ` section of `PATCH_NOTES.md`, as parsed. */
export type NotesSectionKind =
  "intro" | "unreleased" | "candidate" | "accepted";

export interface NotesSection {
  readonly kind: NotesSectionKind;
  /** Present for `candidate` and `accepted`. */
  readonly version?: string;
  /** The section's exact source text, heading included, newline-terminated. */
  readonly text: string;
}

export interface ParsedNotes {
  readonly sections: readonly NotesSection[];
}

/** What a release event decided to do. */
export type ReleaseOutcome = "no-op" | "release" | "blocked";

export interface ReleasePlan {
  readonly outcome: ReleaseOutcome;
  /** The accepted version this plan would leave behind. Equals `currentVersion` for a no-op. */
  readonly nextVersion: string;
  readonly currentVersion: string;
  /** Fragments this plan consumes, in deterministic id order. */
  readonly consumed: readonly ChangeDeclaration[];
  /** Rendered `PATCH_NOTES.md` section, absent when nothing player-facing is released. */
  readonly renderedSection?: string;
  /** Why the plan is a no-op or blocked. Always populated for those outcomes. */
  readonly reason?: string;
}

/** Build identity: which accepted release, and which exact source revision. */
export interface BuildIdentity {
  readonly version: string;
  readonly revision: string;
  readonly revisionShort: string;
  readonly dirty: boolean;
}
