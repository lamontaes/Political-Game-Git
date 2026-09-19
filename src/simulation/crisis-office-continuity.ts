import { crisisRecords } from "./crisis/records";
import { crisisOfficeContinuityNotices } from "./crisis/notices";
import {
  OFFICE_CONTINUITY_EVENT,
  applyOfficeContinuityNotices,
} from "./governing/office-continuity";
import type { World } from "./types";

/**
 * Connects CRISIS office-continuity notices to GOVERNING's consumer on every
 * date boundary, so a death or known incapacity in ordinary play reaches the
 * office the same day it is recorded. The consumer is idempotent; this only
 * narrows the notices it is handed to those after the last one it applied.
 */
const LAST_APPLIED = new WeakMap<readonly unknown[], number>();

function lastAppliedNoticeSequence(world: World): number {
  const events = world.history.events;
  const cached = LAST_APPLIED.get(events);
  if (cached !== undefined) return cached;
  let sequence = -1;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]!;
    if (event.type !== OFFICE_CONTINUITY_EVENT) continue;
    const key = event.tags
      .find((tag) => tag.startsWith("crisis-notice:"))
      ?.slice("crisis-notice:".length);
    const record = key
      ? crisisRecords(world).find((candidate) => candidate.stableKey === key)
      : undefined;
    if (record) {
      sequence = record.sequence;
      break;
    }
  }
  LAST_APPLIED.set(events, sequence);
  return sequence;
}

export function applyCrisisOfficeContinuity(world: World): World {
  if (!crisisRecords(world).some((r) => r.kind === "official-continuity"))
    return world;
  const notices = crisisOfficeContinuityNotices(world, {
    afterSequence: lastAppliedNoticeSequence(world),
  });
  return notices.length ? applyOfficeContinuityNotices(world, notices) : world;
}
