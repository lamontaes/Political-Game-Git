import { useEffect, useRef, useState } from "react";
import {
  paydayNotifications,
  type PaydayNotice,
} from "../presentation/payday-notification";
import type { EntityId, World } from "../simulation/types";

export function PayDayNotices({
  notices,
  onDismiss,
}: {
  readonly notices: readonly Pick<
    PaydayNotice,
    "paycheckId" | "headline" | "details"
  >[];
  readonly onDismiss: (paycheckId: EntityId) => void;
}) {
  return (
    <>
      {notices.map((notice) => (
        <section
          key={notice.paycheckId}
          className="life-hud-note life-hud-note--outcome"
          data-testid="payday-notification"
          data-paycheck-id={notice.paycheckId}
        >
          <p role="status">{notice.headline}</p>
          <details>
            <summary>Details</summary>
            <ul>
              {notice.details.map((line, index) => (
                <li key={`${index}:${line}`}>{line}</li>
              ))}
            </ul>
          </details>
          <button
            type="button"
            className="life-hud-dismiss"
            aria-label="Dismiss payday notification"
            onClick={() => onDismiss(notice.paycheckId)}
          >
            ✕
          </button>
        </section>
      ))}
    </>
  );
}

/** Observe newly saved pay across every shell action without creating or settling money. */
export function PaydayNotification({
  world,
  personId,
}: {
  readonly world: World;
  readonly personId: EntityId;
}) {
  const previous = useRef({ world, personId });
  const [notices, setNotices] = useState<readonly PaydayNotice[]>([]);
  useEffect(() => {
    const before = previous.current;
    previous.current = { world, personId };
    if (before.personId !== personId || before.world.id !== world.id) {
      setNotices([]);
      return;
    }
    const added = paydayNotifications(before.world, world, personId);
    if (added.length) setNotices((current) => [...current, ...added]);
  }, [world, personId]);
  return (
    <PayDayNotices
      notices={notices}
      onDismiss={(id) =>
        setNotices((current) =>
          current.filter((notice) => notice.paycheckId !== id),
        )
      }
    />
  );
}
