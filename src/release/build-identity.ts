/**
 * The one place running code learns which build it is.
 *
 * Anything that shows a version — a title-screen corner, a patch-notes header,
 * a diagnostic panel — reads it from here. There is deliberately no second
 * hard-coded version literal anywhere in the player UI: a number written by
 * hand is a number that goes stale without anybody noticing.
 */

export interface RuntimeBuildIdentity {
  /** The accepted release version, straight from `package.json`. */
  readonly version: string;
  /** The exact source revision this bundle was built from. */
  readonly revision: string;
  readonly revisionShort: string;
  /** True when the build came from a tree with uncommitted changes. */
  readonly dirty: boolean;
}

export function buildIdentity(): RuntimeBuildIdentity {
  return {
    version: __RELEASE_VERSION__,
    revision: __BUILD_REVISION__,
    revisionShort: __BUILD_REVISION_SHORT__,
    dirty: __BUILD_DIRTY__,
  };
}

/** The quiet `vX.Y.Z` form. Nothing else; a build string is not a badge. */
export function displayVersion(): string {
  return `v${__RELEASE_VERSION__}`;
}

/**
 * The long form, for diagnostics only.
 *
 * Players see `displayVersion()`. This exists so a bug report can name the
 * exact tree without a developer having to ask which build somebody ran.
 */
export function diagnosticBuildLabel(): string {
  const identity = buildIdentity();
  return `v${identity.version}+${identity.revisionShort}${identity.dirty ? ".dirty" : ""}`;
}
