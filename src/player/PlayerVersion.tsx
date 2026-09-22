import { buildIdentity, displayVersion } from "../release/build-identity";

/**
 * The one quiet version stamp shared by every player-facing route.
 *
 * The player sees the release number only. The exact revision stays in the
 * tooltip so a bug report can still name the tree that was running.
 */
export function PlayerVersion() {
  const identity = buildIdentity();
  const revision = identity.dirty
    ? `${identity.revision} (uncommitted changes)`
    : identity.revision;
  return (
    <p className="pg-version" data-testid="shell-version" title={revision}>
      {displayVersion()}
    </p>
  );
}
