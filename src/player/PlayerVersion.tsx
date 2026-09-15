import { CANONICAL_VERSION } from "../presentation/release-identity";
import { buildIdentity } from "../release/build-identity";

/** The one quiet build-version stamp shared by every player-facing route. */
export function PlayerVersion() {
  const identity = buildIdentity();
  return (
    <>
      <p
        className="pg-build"
        data-testid="shell-build"
        title={identity.revision}
      >
        Build {identity.revisionShort}
        {identity.dirty ? " · uncommitted" : ""}
      </p>
      <p className="pg-version" data-testid="shell-version">
        v{CANONICAL_VERSION}
      </p>
    </>
  );
}
