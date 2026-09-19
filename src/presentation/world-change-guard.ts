import type { World } from "../simulation";

/**
 * Diagnostics for the player root's stale World-change guard.
 *
 * The guard itself lives where the session state does. This module only
 * numbers time requests and keeps a short in-memory record of dropped
 * changes so a long-save profile can show what was refused. Nothing here is
 * saved or read by the simulation.
 */

/**
 * Whether a World change computed from `base` may be committed.
 *
 * `rendered` is called with the World the controls on screen were built
 * from. The first change from that World is admitted; after it, only further
 * changes from the same base (a writer chaining two steps in one handler) are
 * admitted until the next render. A change from any other World is stale.
 */
export interface WorldChangeGuard {
  rendered(world: World | null): void;
  admit(base: World): boolean;
}

export function createWorldChangeGuard(): WorldChangeGuard {
  let committed: World | null = null;
  let acceptedBase: World | null = null;
  return {
    rendered(world) {
      committed = world;
      acceptedBase = null;
    },
    admit(base) {
      if (base !== committed && base !== acceptedBase) return false;
      acceptedBase = base;
      committed = null;
      return true;
    },
  };
}

let sequence = 0;

export function nextTimeRequestId(): string {
  sequence += 1;
  return `time-request-${sequence}`;
}

export interface StaleWorldChange {
  readonly baseMoment: World["currentMoment"];
  readonly proposedMoment: World["currentMoment"];
  readonly timeWouldMove: boolean;
}

const LIMIT = 50;
const dropped: StaleWorldChange[] = [];

export function recordStaleWorldChange(base: World, proposed: World): void {
  dropped.push({
    baseMoment: base.currentMoment,
    proposedMoment: proposed.currentMoment,
    timeWouldMove:
      base.currentMoment.date !== proposed.currentMoment.date ||
      base.currentMoment.minuteOfDay !== proposed.currentMoment.minuteOfDay,
  });
  if (dropped.length > LIMIT) dropped.shift();
}

export function recentStaleWorldChanges(): readonly StaleWorldChange[] {
  return [...dropped];
}
