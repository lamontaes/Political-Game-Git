import { useRef, useState } from "react";

import type { EntityId } from "../simulation";
import type { BrowserSaveStore } from "../presentation/browser-world-repository";
import {
  downloadFileName,
  exportPortableSave,
  importPortableSave,
  parsePortableSave,
  serializePortableSave,
  type PortableArtProvenance,
} from "../presentation/portable-save";

/**
 * Feature-local export/import on the existing Saved games screen.
 *
 * PT3 owns the shell mount; this only uses the save store and the browser
 * file picker / download, never a privileged filesystem bridge.
 */

export function SaveTransferControls({
  store,
  saveId,
  playerName,
  onSettled,
  artProvenance = "production",
}: {
  readonly store: BrowserSaveStore;
  readonly saveId: EntityId;
  readonly playerName: string;
  readonly onSettled: (notice: string | null, problem: string | null) => void;
  readonly artProvenance?: PortableArtProvenance;
}) {
  const [busy, setBusy] = useState(false);

  async function exportLife() {
    setBusy(true);
    try {
      const exported = await exportPortableSave(store, saveId, {
        artProvenance,
      });
      if (exported.status !== "ok") {
        onSettled(null, exported.reason);
        return;
      }
      const blob = new Blob([serializePortableSave(exported.bundle)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFileName(playerName);
      link.click();
      URL.revokeObjectURL(url);
      onSettled(
        "Saved life downloaded. Keep the file; the original save is still here.",
        null,
      );
    } catch {
      onSettled(null, "That life could not be exported.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      data-testid={`export-save-${saveId}`}
      disabled={busy}
      onClick={() => void exportLife()}
    >
      Export
    </button>
  );
}

export function SaveImportControl({
  store,
  onSettled,
  artProvenance = "production",
}: {
  readonly store: BrowserSaveStore;
  readonly onSettled: (notice: string | null, problem: string | null) => void;
  readonly artProvenance?: PortableArtProvenance;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 8 * 1024 * 1024) {
        onSettled(
          null,
          "That file is larger than a saved life is allowed to be.",
        );
        return;
      }
      const text = await file.text();
      const parsed = parsePortableSave(text, {
        productionProfile: artProvenance === "production",
      });
      if (parsed.status !== "ok") {
        onSettled(null, parsed.reason);
        return;
      }
      const imported = await importPortableSave(store, parsed.bundle);
      if (imported.status !== "imported") {
        onSettled(null, imported.reason);
        return;
      }
      onSettled(
        "Imported as a new save of the same life. The file and your other games were not changed.",
        null,
      );
    } catch {
      onSettled(
        null,
        "That file could not be imported. Existing saves are unchanged.",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="game-saves-import">
      <input
        ref={input}
        type="file"
        accept=".json,.ocd-life.json,application/json"
        hidden
        data-testid="import-save-file"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
      <button
        type="button"
        data-testid="import-save"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        Import a saved life
      </button>
    </div>
  );
}
