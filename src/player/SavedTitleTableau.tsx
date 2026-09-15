import { useEffect, useState, type ReactNode } from "react";
import type {
  BrowserSaveStore,
  BrowserWorldSummary,
} from "../presentation/browser-world-repository";
import type { BrowserShellStateStore } from "../presentation/browser-shell-state";
import {
  artPreviewLibraries,
  type ArtPreviewMode,
} from "../presentation/art-preview";
import {
  composeSavedTitleHero,
  titlePersonFromRecord,
  type SavedTitleHero,
} from "../presentation/title-saved-hero";
import { AmbientTableau } from "./TitleScreen";
import { TitleTableau } from "./TitleTableau";
import { TITLE_LECTERN_VISUALS } from "../presentation/title-lectern-scene";
import { PlayerVersion } from "./PlayerVersion";
import "./title-hero.css";

/** Uses the exact first summary used by Continue; never loads/plays the save. */
export function SavedTitleTableau({
  summary,
  store,
  shellStore,
  previewMode,
  children,
}: {
  readonly summary: BrowserWorldSummary | undefined;
  readonly store: BrowserSaveStore | null;
  readonly shellStore: BrowserShellStateStore;
  readonly previewMode: ArtPreviewMode;
  readonly children: ReactNode;
}) {
  const key = summary
    ? `${summary.saveId}:${summary.snapshotId}:${summary.lastPlayedAt}`
    : "no-save";
  const [ready, setReady] = useState<{
    key: string;
    hero: SavedTitleHero;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!store || !summary) return;
    void Promise.all([
      store.inspectRecord(summary.saveId),
      shellStore.read(summary.saveId),
    ])
      .then(([record, shell]) => {
        const hero = composeSavedTitleHero(
          summary,
          titlePersonFromRecord(summary, record),
          shell,
          artPreviewLibraries(previewMode),
        );
        if (!cancelled) setReady({ key, hero });
      })
      .catch(() => {
        if (!cancelled) setReady(null);
      });
    return () => {
      cancelled = true;
    };
  }, [key, summary, store, shellStore, previewMode]);
  const result =
    ready?.key === key
      ? ready.hero
      : composeSavedTitleHero(summary, null, null, null);
  return (
    <div
      className={`title-tableau title-tableau--art front-door saved-title-shell${result.person ? " title-saved-hero" : ""}`}
      data-save-id={summary?.saveId}
      data-title-policy="adult-labeled-nonhistorical-portrait"
      data-source-native-detail="unverified"
      data-source-rights="unknown"
    >
      <div className="saved-title-backdrop">
        {result.person ? (
          <TitleTableau
            presentation={result.presentation}
            hero={result.person}
            visualLibrary={TITLE_LECTERN_VISUALS}
          >
            {null}
          </TitleTableau>
        ) : (
          <AmbientTableau resolved={result.presentation}>
            {() => null}
          </AmbientTableau>
        )}
      </div>
      {/* The same controls retain DOM identity and keyboard focus while art loads. */}
      <div className="title-tableau-content">
        {children}
        {result.person ? (
          <p
            className="title-portrait-caption"
            data-testid="title-portrait-caption"
          >
            {summary?.playerName} · Title portrait — not a recorded event.
          </p>
        ) : (
          <span
            hidden
            data-testid="title-hero-refusal"
            data-reason={result.refusal ?? "none"}
          />
        )}
      </div>
      <PlayerVersion />
    </div>
  );
}
