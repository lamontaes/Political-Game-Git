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
 * Every number marked BLANKET is a placeholder, filed with ChatGPT as
 * `political-violence-what-builds-to-an-attack`.
 */

import { handlingVerdict } from "../crisis/handling-reactions";
import { crisisRecords } from "../crisis/records";
import type { HazardMagnitude } from "../crisis/types";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import { macroReleasesAt } from "../macro-economy/readers";
import type { EntityId, IsoDate, World } from "../types";
import type { PressureContribution } from "./contract";

/**
 * BLANKET: anger in the struck state when a disaster decision is judged a
 * failure, by the disaster's magnitude. Not researched.
 */
export const BLANKET_FAILED_HANDLING_ANGER: Readonly<
  Record<HazardMagnitude, number>
> = {
  minor: 0.02,
  moderate: 0.05,
  major: 0.1,
  catastrophic: 0.2,
};

/**
 * BLANKET: anger in every state per percentage point that national
 * unemployment rose over the quarter. A fall adds nothing. Not researched.
 */
export const BLANKET_UNEMPLOYMENT_RISE_ANGER = 0.1;

/** BLANKET: what an attack adds in the target's state. Not researched. */
export const BLANKET_ATTACK_PRESSURE = { anger: 0.2, fear: 0.2 } as const;

/** The state a person's home belongs to, or null when it cannot be read. */
export function homeStateKeyOf(
  world: World,
  personId: EntityId,
): string | null {
  const home = world.people[personId]?.homeJurisdictionId;
  if (!home) return null;
  const place = lifePlaceByJurisdictionId(home)?.stateJurisdictionKey;
  if (place) return place;
  const jurisdiction = world.jurisdictions[home];
  return jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
}

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
        amount: BLANKET_FAILED_HANDLING_ANGER[episode.magnitude],
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
          amount: BLANKET_ATTACK_PRESSURE[kind],
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
      Math.round(rise * BLANKET_UNEMPLOYMENT_RISE_ANGER * 10000) / 10000;
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
