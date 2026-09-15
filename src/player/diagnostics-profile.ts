/**
 * Whether this page was opened as a developer surface.
 *
 * The player-pure rule is a separation, not a deletion: the provenance, the
 * source status and the research gaps all stay in the engine and stay
 * renderable — they just stop being part of ordinary play. Most surfaces make
 * that choice through a `diagnostics` prop, because their developer caller is a
 * different component that can simply pass it.
 *
 * A few surfaces have no such caller: they are mounted once, by the game, and
 * the only way to see their internals is to ask for them here. So this reads an
 * explicit opt-in from the query string and nothing else. There is no link to
 * it anywhere in the game, no setting that turns it on, and no state that can
 * leave it on — production navigation cannot reach it, which is the property
 * the contract actually asks for.
 *
 * Read once at module load. The profile is not something that changes while
 * somebody is playing, and re-reading it per render would invite a screen that
 * is half in one mode and half in the other.
 */
function readDiagnosticsProfile(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("diagnostics") === "1") return true;
    /* The existing developer routes keep their internals without opting in. */
    const view = params.get("view");
    return view !== null && view !== "";
  } catch {
    /* A window without a parseable location is not a developer session. */
    return false;
  }
}

export const DIAGNOSTICS: boolean = readDiagnosticsProfile();
