/**
 * The version rules, as arithmetic over declarations.
 *
 * `package.json.version` stays the single authoritative accepted release
 * version. Nothing here decides 1.0: this project is pre-1.0 and the packet is
 * explicit that 1.0 and public release are owner decisions, so the allocator
 * refuses to cross that line rather than reaching it by addition.
 */

import type { ChangeDeclaration, ChangeImpact } from "./model";

export interface SemanticVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export function parseVersion(text: string): SemanticVersion {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text.trim());
  if (!match) {
    throw new Error(
      `Version '${text}' is not a bare MAJOR.MINOR.PATCH string.`,
    );
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function formatVersion(version: SemanticVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/** The strongest impact in a batch. `none` means nothing player-facing merged. */
export function batchImpact(
  declarations: readonly ChangeDeclaration[],
): ChangeImpact {
  let impact: ChangeImpact = "none";
  for (const declaration of declarations) {
    if (declaration.impact === "minor") return "minor";
    if (declaration.impact === "patch") impact = "patch";
  }
  return impact;
}

/**
 * The next accepted version for a batch.
 *
 * A batch containing any player-visible feature or system work is a minor
 * release; a batch of bugfix and polish only is a patch release. Returning
 * `null` for a `none` batch is the point: source-only work does not move the
 * number, so a repository full of parser and documentation merges never
 * inflates its own version.
 */
export function nextVersion(
  current: string,
  declarations: readonly ChangeDeclaration[],
): string | null {
  const version = parseVersion(current);
  const impact = batchImpact(declarations);
  if (impact === "none") return null;
  if (impact === "minor") {
    if (version.major === 0 && version.minor === 999) {
      throw new Error("Refusing to allocate beyond 0.999.x automatically.");
    }
    return formatVersion({
      major: version.major,
      minor: version.minor + 1,
      patch: 0,
    });
  }
  return formatVersion({
    major: version.major,
    minor: version.minor,
    patch: version.patch + 1,
  });
}
