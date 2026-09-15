import { useEffect, useId, useRef, type ReactNode } from "react";

/** Native top-layer dialog keeps the pending body and its decision in the viewport. */
export function AppearanceOutfitDialog({
  title,
  children,
  onApply,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  onApply: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    cancel.current?.focus();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="appearance-outfit-dialog"
      aria-labelledby={titleId}
      data-testid="outfit-replacement-preview"
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <header>
        <h2 id={titleId}>Preview appearance and outfit</h2>
        <p>{title}</p>
        <p>This is a preview. Your current appearance has not changed.</p>
      </header>
      <div className="appearance-outfit-dialog-content">{children}</div>
      <footer>
        <button ref={cancel} type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={onApply}>
          Apply this outfit
        </button>
      </footer>
    </dialog>
  );
}
