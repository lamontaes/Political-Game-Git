/**
 * The release decision, as one pure function.
 *
 * Every safeguard the automation claims lives here rather than in the workflow,
 * so the tests exercise the behaviour a release actually has instead of the
 * text of a YAML file. The planner never reads the filesystem and never asks
 * the clock: the caller supplies the tree it is describing.
 */

import type { ChangeDeclaration, ReleasePlan } from "./model";
import {
  acceptedVersions,
  parseNotes,
  renderReleaseSection,
  reservedVersions,
} from "./notes";
import { batchImpact, nextVersion, parseVersion } from "./version";

export interface PlanInputs {
  /** `package.json.version` on the tree being released. */
  readonly currentVersion: string;
  /** The full text of `PATCH_NOTES.md` on that tree. */
  readonly notesText: string;
  /** Every pending declaration on that tree. */
  readonly declarations: readonly ChangeDeclaration[];
  /** Declaration ids the ledger already records as consumed. */
  readonly alreadyConsumed: ReadonlySet<string>;
  /** ISO calendar date to stamp the release with. */
  readonly isoDate: string;
}

function sortById(
  declarations: readonly ChangeDeclaration[],
): ChangeDeclaration[] {
  return [...declarations].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
}

export function planRelease(inputs: PlanInputs): ReleasePlan {
  const current = inputs.currentVersion;
  parseVersion(current);
  const declarations = sortById(inputs.declarations);

  if (declarations.length === 0) {
    return {
      outcome: "no-op",
      currentVersion: current,
      nextVersion: current,
      consumed: [],
      reason: "No pending change declarations.",
    };
  }

  // A replayed event finds its declarations already gone, so reaching here with
  // a consumed id means an id was reused rather than an event repeated. That is
  // a mistake worth stopping on: silently releasing it a second time would
  // publish the same note twice under two version numbers.
  const replayed = declarations.filter((entry) =>
    inputs.alreadyConsumed.has(entry.id),
  );
  if (replayed.length > 0) {
    return {
      outcome: "blocked",
      currentVersion: current,
      nextVersion: current,
      consumed: [],
      reason:
        `Change ${replayed.length === 1 ? "id" : "ids"} ` +
        `${replayed.map((entry) => `'${entry.id}'`).join(", ")} ` +
        `already appear in the traceability ledger. A change id is allocated once; ` +
        `rename the pending declaration rather than releasing it twice.`,
    };
  }

  if (batchImpact(declarations) === "none") {
    return {
      outcome: "no-op",
      currentVersion: current,
      nextVersion: current,
      consumed: [],
      reason:
        `${declarations.length} pending ${declarations.length === 1 ? "declaration declares" : "declarations declare"} ` +
        `no player-visible change. The version does not move, no note is invented, ` +
        `and they are recorded when the next player-facing release consumes them.`,
    };
  }

  const allocated = nextVersion(current, declarations);
  if (allocated === null) {
    // Unreachable while batchImpact is the only source of `none`; kept so a
    // future impact class cannot silently fall through into a release.
    return {
      outcome: "no-op",
      currentVersion: current,
      nextVersion: current,
      consumed: [],
      reason: "No version increment applies to this batch.",
    };
  }

  const notes = parseNotes(inputs.notesText);
  if (reservedVersions(notes).has(allocated)) {
    return {
      outcome: "blocked",
      currentVersion: current,
      nextVersion: current,
      consumed: [],
      reason:
        `Version ${allocated} is reserved by a candidate section in PATCH_NOTES.md. ` +
        `Accepting or renumbering that candidate is an owner decision; the automation ` +
        `will not promote a candidate release because one constituent change merged. ` +
        `The pending declarations stay pending until it is resolved.`,
    };
  }
  if (acceptedVersions(notes).has(allocated)) {
    return {
      outcome: "blocked",
      currentVersion: current,
      nextVersion: current,
      consumed: [],
      reason:
        `PATCH_NOTES.md already records an accepted ${allocated} section. ` +
        `Refusing to write a second one over accepted history.`,
    };
  }

  return {
    outcome: "release",
    currentVersion: current,
    nextVersion: allocated,
    consumed: declarations,
    renderedSection: renderReleaseSection(
      allocated,
      inputs.isoDate,
      declarations,
    ),
  };
}
