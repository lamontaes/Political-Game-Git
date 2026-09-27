import { proseDate } from "../presentation/prose-dates";
import { useState } from "react";
import type { BrowserSaveStore } from "../presentation/browser-world-repository";
import {
  type BrowserWorldSummary,
  type QuarantinedSave,
} from "../presentation/browser-world-repository";
import { type SaveListingState, reloadPage } from "./TitleScreen";
import type { EntityId } from "../simulation";
import {
  SaveImportControl,
  SaveTransferControls,
} from "./SaveTransferControls";

export function SavesScreen({
  store,
  saves,
  damaged,
  savesUnavailable,
  saveListing,
  onRetrySaves,
  notice,
  problem,
  artProvenance,
  onBack,
  onOpen,
  onDelete,
  onTransferSettled,
}: {
  readonly store: BrowserSaveStore | null;
  readonly saves: readonly BrowserWorldSummary[];
  readonly damaged: readonly QuarantinedSave[];
  readonly savesUnavailable: boolean;
  readonly saveListing: SaveListingState;
  readonly onRetrySaves: () => void;
  readonly notice: string | null;
  readonly problem: string | null;
  readonly artProvenance: "production" | "candidate-review";
  readonly onBack: () => void;
  readonly onOpen: (saveId: EntityId) => void;
  readonly onDelete: (saveId: EntityId) => void;
  readonly onTransferSettled: (
    notice: string | null,
    problem: string | null,
  ) => void;
}) {
  const [confirming, setConfirming] = useState<EntityId | null>(null);
  return (
    <main className="game-saves" data-testid="saves-screen">
      <h1>Saved games</h1>
      {savesUnavailable ? (
        <p className="game-note">
          This browser will not let the game store anything.
        </p>
      ) : null}
      {notice ? <p className="game-note">{notice}</p> : null}
      {problem ? (
        <p className="game-problem" role="alert">
          {problem}
        </p>
      ) : null}
      {saveListing === "loading" ? (
        <p className="game-note" data-testid="saves-reading">
          Opening your saved lives. A long life can take a moment.
        </p>
      ) : null}
      {saveListing === "failed" ? (
        <p className="game-problem" role="alert" data-testid="saves-unread">
          Your saved lives could not be read just now. Nothing was deleted.{" "}
          <button type="button" onClick={onRetrySaves}>
            Try again
          </button>
        </p>
      ) : null}
      {saveListing === "outdated" ? (
        <p className="game-problem" role="alert" data-testid="saves-outdated">
          This page is an older copy of the game than the one that kept your
          saved lives. Reload the page to open them. Nothing was deleted.{" "}
          <button type="button" onClick={reloadPage}>
            Reload
          </button>
        </p>
      ) : null}
      {saves.length === 0 && !savesUnavailable && saveListing === "read" ? (
        <p className="game-note" data-testid="saves-empty">
          No lives are saved in this browser yet. You can import a saved life
          below.
        </p>
      ) : null}
      <ul>
        {saves.map((save) => (
          <li key={save.saveId} data-testid="save-entry">
            <div>
              <strong>
                {save.observing ? "Watching the world" : save.playerName}
              </strong>
              <span>
                {save.observing ? "Nobody played" : save.playerAge}
                {save.residence ? ` · ${save.residence.name}` : ""} ·{" "}
                {proseDate(save.currentMoment.date)}
              </span>
            </div>
            <div className="game-saves-actions">
              <button type="button" onClick={() => onOpen(save.saveId)}>
                Open
              </button>
              {store ? (
                <SaveTransferControls
                  store={store}
                  saveId={save.saveId}
                  playerName={save.playerName}
                  onSettled={onTransferSettled}
                  artProvenance={artProvenance}
                />
              ) : null}
              {confirming === save.saveId ? (
                <>
                  <button
                    type="button"
                    data-testid="confirm-delete"
                    onClick={() => {
                      onDelete(save.saveId);
                      setConfirming(null);
                    }}
                  >
                    Delete for good
                  </button>
                  <button type="button" onClick={() => setConfirming(null)}>
                    Keep it
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="delete-save"
                  onClick={() => setConfirming(save.saveId)}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {damaged.length > 0 ? (
        <section className="game-saves-damaged" data-testid="damaged-saves">
          <h2>Set aside</h2>
          <p className="game-note">
            These could not be opened. They are still here — nothing was thrown
            away — and the rest of your games are unaffected.
          </p>
          <ul>
            {damaged.map((entry, index) => (
              <li
                key={entry.saveId ?? `damaged-${index}`}
                data-testid="damaged-entry"
              >
                <span>{entry.reason}</span>
                {entry.defect === "could-not-open-now" ? (
                  <span className="game-note">
                    The browser would not read it this time, so it cannot be
                    removed now either. Try again later.
                  </span>
                ) : entry.mightBeReadableLater ? (
                  <span className="game-note">
                    A later version of the game may be able to open it, so it is
                    worth keeping for now.
                  </span>
                ) : null}
                {entry.saveId && entry.defect !== "could-not-open-now" ? (
                  // Not offered for a save the browser would not read just
                  // now: removing it reads the whole record, and would fail
                  // on exactly that save.
                  // The same two steps a healthy save gets. These are the ones
                  // the screen has just said may open in a later version and
                  // are worth keeping, so a single click was the weakest guard
                  // on the most fragile thing in the list.
                  confirming === entry.saveId ? (
                    <>
                      <button
                        type="button"
                        data-testid="confirm-delete-damaged"
                        onClick={() => {
                          onDelete(entry.saveId as EntityId);
                          setConfirming(null);
                        }}
                      >
                        Remove for good
                      </button>
                      <button type="button" onClick={() => setConfirming(null)}>
                        Keep it
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      data-testid="delete-damaged"
                      onClick={() => setConfirming(entry.saveId as EntityId)}
                    >
                      Remove it
                    </button>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {store ? (
        <SaveImportControl
          store={store}
          onSettled={onTransferSettled}
          artProvenance={artProvenance}
        />
      ) : null}

      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
