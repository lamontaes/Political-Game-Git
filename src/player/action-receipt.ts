import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type SetStateAction,
} from "react";

/** Only completed actions expire, after their full interval and actual CSS fade. */
export function scheduleCompletedReceiptExpiry(
  completed: boolean,
  expire: () => void,
  pendingAnimations: () => readonly Promise<unknown>[] = () => [],
): () => void {
  if (!completed) return () => {};
  let cancelled = false;
  const timer = setTimeout(() => {
    const animations = pendingAnimations();
    if (animations.length === 0) {
      expire();
    } else {
      void Promise.allSettled(animations).then(() => {
        if (!cancelled) expire();
      });
    }
  }, 3_000);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

export interface ActionReceiptPresentation {
  readonly completed: boolean;
  readonly ref: RefObject<HTMLParagraphElement | null>;
}

export function useActionReceipt() {
  const element = useRef<HTMLParagraphElement | null>(null);
  const [receipt, setReceipt] = useState<{
    readonly text: string | null;
    readonly completed: boolean;
  }>({ text: null, completed: false });
  const publish = useCallback(
    (text: SetStateAction<string | null>, completed = false) => {
      // A new object renews the full interval even for identical receipts.
      setReceipt((current) => {
        if (typeof text === "function") {
          const next = text(current.text);
          return next === current.text ? current : { text: next, completed };
        }
        return { text, completed };
      });
    },
    [],
  );
  useEffect(() => {
    if (receipt.completed) {
      // Restart the existing CSS animation even when the receipt text is identical.
      // CSS remains the sole source of its delay, duration and reduced-motion rule.
      for (const animation of element.current?.getAnimations() ?? []) {
        animation.cancel();
        animation.play();
      }
    }
    return scheduleCompletedReceiptExpiry(
      receipt.completed,
      () => {
        setReceipt((current) =>
          current === receipt ? { text: null, completed: false } : current,
        );
      },
      () =>
        (element.current?.getAnimations() ?? []).map(
          (animation) => animation.finished,
        ),
    );
  }, [receipt]);
  return [
    receipt.text,
    publish,
    { completed: receipt.completed, ref: element },
  ] as const;
}
