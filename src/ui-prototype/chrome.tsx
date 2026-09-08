import { useEffect, useRef } from "react";

import { PROTOTYPE_NOW, formatMinute } from "./data";
import { CANONICAL_VERSION } from "./version";

/**
 * Prototype chrome: what the screen has to admit about itself.
 *
 * DEVELOPMENT-ONLY. U03-07 asks for two different things that were previously
 * one thin strip doing neither well: an explanation the owner cannot miss on
 * first entry, and a marker afterwards that is discreet enough to leave the
 * composition alone. So the explanation is a card that must be dismissed, and
 * what remains is a small mark with the technical detail folded behind it.
 *
 * The boundaries named in the card are the honest ones. New Game does not make
 * a character and Talk does not open a conversation, and R1 says plainly that
 * those are prototype boundaries rather than defects to paper over.
 */

interface PreviewDisclosureProps {
  readonly onDismiss: () => void;
}

export function PreviewDisclosure({ onDismiss }: PreviewDisclosureProps) {
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    dismissRef.current?.focus();
  }, []);

  return (
    <div className="p-preview-scrim" data-testid="preview-disclosure">
      <section
        className="p-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="p-preview-title"
      >
        <p className="p-kicker">Development prototype</p>
        <h2 id="p-preview-title">This is a look, not a build of the game.</h2>
        <p>
          It exists so the menus, the room, the records and the way you move
          between them can be judged in context. Everything you see is
          placeholder content over real released artwork.
        </p>
        <ul className="p-preview-list">
          <li>
            <strong>New Game and Continue both walk straight in.</strong> There
            is no character creation here — the character is a fixed example.
          </li>
          <li>
            <strong>Talk is switched off, on purpose.</strong> Conversation is a
            real system this prototype does not contain, and a fake one would
            tell you nothing.
          </li>
          <li>
            <strong>The clock does not run.</strong> Reading a screen, changing
            rooms or opening a record never moves the time.
          </li>
          <li>
            <strong>Pins last as long as this tab does.</strong> They survive
            everything you do in here and nothing is saved to disk.
          </li>
        </ul>
        <button
          ref={dismissRef}
          type="button"
          className="p-button"
          data-variant="accent"
          data-testid="preview-dismiss"
          onClick={onDismiss}
        >
          Start looking around
        </button>
      </section>
    </div>
  );
}

interface PrototypeMarkProps {
  readonly inspectorOpen: boolean;
  readonly onToggleInspector: () => void;
  readonly onReturnToTitle: (() => void) | null;
}

/** The discreet persistent indicator that replaced the wide banner. */
export function PrototypeMark({
  inspectorOpen,
  onToggleInspector,
  onReturnToTitle,
}: PrototypeMarkProps) {
  return (
    <div className="p-mark" data-testid="prototype-mark">
      <span className="p-mark-label">Prototype</span>
      {onReturnToTitle ? (
        <button
          type="button"
          className="p-mark-button"
          data-testid="mark-title"
          onClick={onReturnToTitle}
        >
          Title
        </button>
      ) : null}
      <button
        type="button"
        className="p-mark-button"
        aria-expanded={inspectorOpen}
        aria-controls={inspectorOpen ? "p-inspector" : undefined}
        data-testid="inspector-toggle"
        onClick={onToggleInspector}
      >
        Inspector
      </button>
    </div>
  );
}

interface InspectorProps {
  readonly titleAssetId: string | null;
  readonly sceneAssetId: string | null;
  readonly sceneLabel: string;
  readonly onClose: () => void;
}

/**
 * The developer inspector.
 *
 * The technical identity the title screen used to print under the menu lives
 * here: asset ids, whether a plate is released, the fixed clock, and the
 * version of the tree being served. Nothing here is decoration and nothing here
 * is hidden — it is deliberately one control away from every screen.
 */
export function DeveloperInspector({
  titleAssetId,
  sceneAssetId,
  sceneLabel,
  onClose,
}: InspectorProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <aside
      id="p-inspector"
      className="p-inspector"
      aria-label="Developer inspector"
      data-testid="developer-inspector"
    >
      <header>
        <p className="p-kicker">Developer inspector</p>
        <button
          ref={closeRef}
          type="button"
          className="p-close"
          aria-label="Close the developer inspector"
          data-testid="inspector-close"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <dl className="p-inspector-list">
        <div>
          <dt>Build</dt>
          <dd data-testid="inspector-version">
            UI-PROTOTYPE-01 · v{CANONICAL_VERSION}
          </dd>
        </div>
        <div>
          <dt>Title plate</dt>
          <dd data-testid="inspector-title-asset">
            {titleAssetId ?? "none released"}
          </dd>
        </div>
        <div>
          <dt>Current room</dt>
          <dd>{sceneLabel}</dd>
        </div>
        <div>
          <dt>Room plate</dt>
          <dd data-testid="inspector-scene-asset">
            {sceneAssetId ?? "none released"}
          </dd>
        </div>
        <div>
          <dt>Prototype clock</dt>
          <dd>
            {formatMinute(PROTOTYPE_NOW.minuteOfDay)} · fixed, never advances
          </dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>Session-local. No save is written and no World is read.</dd>
        </div>
      </dl>
      <p className="p-faint">
        Placeholder people, meetings and measures. None of it is canonical
        content and none of it reaches a production bank.
      </p>
    </aside>
  );
}

interface VersionStampProps {
  readonly onOpenPatchNotes: () => void;
}

/**
 * The quiet bottom-right version display.
 *
 * The number is read from `package.json` in this checkout rather than typed
 * here, so it cannot drift from the tree it is describing, and it doubles as
 * the way into the patch notes.
 */
export function VersionStamp({ onOpenPatchNotes }: VersionStampProps) {
  return (
    <button
      type="button"
      className="p-version"
      data-testid="version-stamp"
      onClick={onOpenPatchNotes}
    >
      v{CANONICAL_VERSION}
      <span className="p-version-more">Patch notes</span>
    </button>
  );
}
