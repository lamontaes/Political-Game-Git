/**
 * Causes of anger and fear the world can already read. Like `causes.ts`, each
 * reader looks at one quarter and returns contributions keyed to the record
 * that caused them; it never writes.
 *
 * Read here:
 * - A governor's or President's disaster decision the game judges a failure
 *   (`handlingVerdict`), in the state the disaster struck.
 * - A rise in the published national unemployment rate over the quarter, in
 *   every state alike, because unemployment is recorded nationally.
 * - An attack on a person (`violence-attempt`), in the state where the target
 *   lived, so violence feeds the anger that can lead to more of it.
 *
 * Not read, and why, is in `PRESSURE_SEAMS`: displacement (the migration lane
 * owns it), polarization (nothing measures it), and scandal.
 *
 * The normalized amounts below are estimates because the source records do
 * not publish values on the game's pressure scale. Their calibration basis is
 * stated beside each value.
 */

import { handlingVerdict } from "../crisis/handling-reactions";
import { crisisRecords } from "../crisis/records";
import type { HazardMagnitude } from "../crisis/types";
import { macroReleasesAt } from "../macro-economy/readers";
import type { IsoDate, World } from "../types";
import type { PressureContribution } from "./contract";

/**
 * ESTIMATED FROM AVERAGE: the same normalized magnitude scale used by the
 * recorded hazard-pressure reader. Basis: the game's four recorded hazard
 * magnitudes; places used: every state and territory represented by that
 * nationwide reader. A failed response therefore adds the same amount as the
 * underlying event rather than inventing a second severity ordering.
 */
export const ESTIMATED_FAILED_HANDLING_ANGER: Readonly<
  Record<HazardMagnitude, number>
> = {
  minor: 0.02,
  moderate: 0.05,
  major: 0.1,
  catastrophic: 0.2,
};

/**
 * ESTIMATED FROM AVERAGE: 0.1 pressure per percentage-point rise. Basis: one
 * point is one-third of the unrest line; places used: all states and
 * territories because the input is the recorded national BLS release.
 */
export const ESTIMATED_UNEMPLOYMENT_RISE_ANGER = 0.1;

/**
 * ESTIMATED FROM AVERAGE: 0.2 anger and fear per recorded attack. Basis: the
 * midpoint between the recorded major (0.1) and catastrophic (0.2) hazard
 * responses, rounded to the more severe endpoint because an attack is an
 * intentional local event; places used: all states and territories.
 */
export const ESTIMATED_ATTACK_PRESSURE = { anger: 0.2, fear: 0.2 } as const;

import { homeStateKey as homeStateKeyOf } from "../state-jurisdiction-id";
export { homeStateKeyOf };

/**
 * Anger and fear contributions for one quarter, `periodStart` to `periodEnd`
 * inclusive, by state key. `stateKeys` are the world's states, for causes
 * recorded nationally.
 */
export function angerCausesInPeriod(
  world: World,
  periodStart: IsoDate,
  periodEnd: IsoDate,
  stateKeys: readonly string[],
): ReadonlyMap<string, readonly PressureContribution[]> {
  const byState = new Map<string, PressureContribution[]>();
  const add = (stateKey: string, contribution: PressureContribution) => {
    const list = byState.get(stateKey) ?? [];
    list.push(contribution);
    byState.set(stateKey, list);
  };
  const within = (date: IsoDate) => date >= periodStart && date <= periodEnd;
  const records = crisisRecords(world);
  const episodes = new Map(
    records.flatMap((record) =>
      record.kind === "hazard-episode" ? [[record.id, record] as const] : [],
    ),
  );

  for (const record of records) {
    if (record.kind === "disaster-response" && within(record.effectiveAt)) {
      if (handlingVerdict(world, record) !== "failed") continue;
      const episode = episodes.get(record.episodeId);
      if (!episode) continue;
      add(`US-${episode.stateUsps}`, {
        causeKey: `failed-handling:${record.stage}`,
        kind: "anger",
        amount: ESTIMATED_FAILED_HANDLING_ANGER[episode.magnitude],
        sourceId: record.id,
      });
    } else if (
      record.kind === "violence-attempt" &&
      within(record.effectiveAt)
    ) {
      const stateKey = homeStateKeyOf(world, record.targetPersonId);
      if (!stateKey) continue;
      for (const kind of ["anger", "fear"] as const)
        add(stateKey, {
          causeKey: `attack:${record.outcome}`,
          kind,
          amount: ESTIMATED_ATTACK_PRESSURE[kind],
          sourceId: record.id,
        });
    }
  }

  // What people see is the published figure, so the rise is read between the
  // last national release before the quarter and the last one within it.
  const releases = macroReleasesAt(
    world,
    periodEnd,
    "unemployment-rate",
  ).filter((release) => release.scope === "national" && release.value !== null);
  const latest = releases
    .filter((release) => within(release.releasedAt))
    .at(-1);
  const prior = releases
    .filter((release) => release.releasedAt < periodStart)
    .at(-1);
  const rise = latest && prior ? latest.value! - prior.value! : 0;
  if (latest && rise > 0) {
    const amount =
      Math.round(rise * ESTIMATED_UNEMPLOYMENT_RISE_ANGER * 10000) / 10000;
    for (const stateKey of stateKeys)
      add(stateKey, {
        causeKey: "unemployment-rise:national",
        kind: "anger",
        amount,
        sourceId: latest.eventId,
      });
  }
  return byState;
}
