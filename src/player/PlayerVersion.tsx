import { CANONICAL_VERSION } from "../presentation/release-identity";

/** The one quiet build-version stamp shared by every player-facing route. */
export function PlayerVersion() {
  return (
    <p className="pg-version" data-testid="shell-version">
      v{CANONICAL_VERSION}
    </p>
  );
}
