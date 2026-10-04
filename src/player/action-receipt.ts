import { useCallback, useEffect, useState, type SetStateAction } from "react";

/** Only explicitly completed actions expire; refusals and decisions persist. */
export function scheduleCompletedReceiptExpiry(
  completed: boolean,
  expire: () => void,
): () => void {
  if (!completed) return () => {};
  const timer = setTimeout(expire, 3_000);
  return () => clearTimeout(timer);
}

export function useActionReceipt() {
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
  useEffect(
    () =>
      scheduleCompletedReceiptExpiry(receipt.completed, () => {
        setReceipt((current) =>
          current === receipt ? { text: null, completed: false } : current,
        );
      }),
    [receipt],
  );
  return [receipt.text, publish] as const;
}
