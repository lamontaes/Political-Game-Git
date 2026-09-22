import { useEffect, useRef } from "react";
import type { LivingSurfaceRecord } from "../presentation/living-scene-surfaces";
import type { ShellRef } from "../presentation/shell-navigation";

/** Reads the same current record painted in the room. Opening and closing are
 * navigation only; no knowledge, clock, attendance or publication writer. */
export function SceneSurfaceReader({
  record,
  onClose,
  onOpenEntity,
}: {
  readonly record: LivingSurfaceRecord;
  readonly onClose: () => void;
  readonly onOpenEntity?: (ref: ShellRef) => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
  }, []);
  const detail = record.detail;
  return (
    <aside
      className="pg-surface-reader"
      role="dialog"
      aria-modal="false"
      aria-labelledby="pg-surface-heading"
      data-testid="scene-surface-reader"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <h2 id="pg-surface-heading">{record.heading}</h2>
        <button
          ref={closeButton}
          type="button"
          className="ui-action"
          onClick={onClose}
        >
          Back to room
        </button>
      </header>
      {record.masthead ? <p>{record.masthead}</p> : null}
      {record.dateLabel ? <p>{record.dateLabel}</p> : null}
      {(detail?.kind === "article"
        ? [detail.article.body]
        : detail?.kind === "record"
          ? [detail.body]
          : record.lines
      ).map((line, index) => (
        <p key={index} className="pg-surface-reader-body">
          {line}
        </p>
      ))}
      {detail?.kind === "entity" && onOpenEntity ? (
        <button
          type="button"
          className="ui-action"
          onClick={() => onOpenEntity(detail.ref)}
        >
          Open full record
        </button>
      ) : null}
    </aside>
  );
}
