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
      {notice ? <p className="game-note">{notice}</p> : null}
      {problem ? (
        <p className="game-problem" role="alert">
          {problem}
        </p>
      ) : null}
      {saveListing === "failed" ? (
        <button type="button" data-testid="saves-unread" onClick={onRetrySaves}>
          Try again
        </button>
      ) : null}
      {saveListing === "outdated" ? (
        <button type="button" data-testid="saves-outdated" onClick={reloadPage}>
          Reload
        </button>
      ) : null}
      <ul>
        {saves.map((save) => (
          <li key={save.saveId} data-testid="save-entry">
            <div>
              <strong>{save.observing ? "" : save.playerName}</strong>
              <span>
                {save.observing ? "" : save.playerAge}
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
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirming(null)}>
                    Keep
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
          <ul>
            {damaged.map((entry, index) => (
              <li
                key={entry.saveId ?? `damaged-${index}`}
                data-testid="damaged-entry"
              >
                <span>{entry.reason}</span>
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
                        Remove
                      </button>
                      <button type="button" onClick={() => setConfirming(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      data-testid="delete-damaged"
                      onClick={() => setConfirming(entry.saveId as EntityId)}
                    >
                      Remove
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
