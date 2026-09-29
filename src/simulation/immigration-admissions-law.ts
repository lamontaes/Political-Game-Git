import research from "../../data/research/laws/immigration-admissions.json" with { type: "json" };
import { daysBetween } from "./dates";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureJurisdiction,
} from "./national-election-geography";
import { policyTermsInForce } from "./governing/policy-bill-terms";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import {
  materializeSettledTownHousehold,
  townHouseholdSkeleton,
  townResidentId,
  townRoster,
} from "./living-world/town-residents";
import { recordWorldEvent, writeWithWorldIntegrityOnce } from "./world";
import type { World } from "./types";

export const IMMIGRATION_ADMISSIONS_QUESTION =
  "us-federal-positions:immigration.admit-more-immigrants";
/** Largest remainder preserves the filed national total; no person's choice or admission is rolled. */
export function allocateImmigrationAdmissions(
  total: number,
): Readonly<Record<string, number>> {
  if (!Number.isSafeInteger(total) || total < 0)
    throw Error("Admissions require a nonnegative whole count.");
  const places = Object.entries(research.places);
  const denominator = places.reduce((n, [, p]) => n + p.recentForeignBorn, 0);
  const rows = places.map(([key, p]) => ({
    key,
    exact: (total * p.recentForeignBorn) / denominator,
  }));
  const result: Record<string, number> = Object.fromEntries(
    rows.map((r) => [r.key, Math.floor(r.exact)]),
  );
  let remainder = total - Object.values(result).reduce((a, b) => a + b, 0);
  for (const row of rows.sort(
    (a, b) =>
      b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) ||
      a.key.localeCompare(b.key),
  )) {
    if (remainder-- <= 0) break;
    result[row.key]! += 1;
  }
  return result;
}
/** Added admissions are actual dated households, not a multiplier on a population label. */
export function applyImmigrationAdmissions(world: World): World {
  const reading = policyTermsInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    IMMIGRATION_ADMISSIONS_QUESTION,
    world.currentDate,
  );
  const annual = reading?.terms?.values.additionalAdmissionsAnnual;
  if (annual === undefined) return world;
  const elapsed = Math.max(
    0,
    daysBetween(reading!.law.operativeAt, world.currentDate),
  );
  const targets = allocateImmigrationAdmissions(
    Math.floor((annual * elapsed) / 365),
  );
  const existing = world.immigrationAdmissions ?? [];
  if (
    Object.entries(targets).every(
      ([key, target]) =>
        existing
          .filter(
            (r) => r.measureId === reading!.law.measureId && r.stateKey === key,
          )
          .reduce((n, r) => n + r.personIds.length, 0) >= target,
    )
  )
    return world;
  return writeWithWorldIntegrityOnce(world, () => {
    let next = world;
    for (const state of lifePlaceStateIdentities()) {
      const target = targets[state.jurisdictionKey] ?? 0;
      let written = existing
        .filter(
          (r) =>
            r.measureId === reading!.law.measureId &&
            r.stateKey === state.jurisdictionKey,
        )
        .reduce((n, r) => n + r.personIds.length, 0);
      if (written >= target) continue;
      // Population-proportional geography is unread at town level. Use one stable inhabited receiving town per state, explicitly marked as an estimate.
      const places = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
      }).filter(
        (p) =>
          p.scope !== "state" &&
          townRoster(p.context.jurisdiction.id).population > 0,
      );
      const place = places.sort(
        (a, b) =>
          townRoster(b.context.jurisdiction.id).population -
            townRoster(a.context.jurisdiction.id).population ||
          a.key.localeCompare(b.key),
      )[0];
      if (!place)
        throw Error(
          `No inhabited receiving locality is recorded for ${state.jurisdictionKey}`,
        );
      const town = place.context.jurisdiction;
      const stateJurisdiction = stateJurisdictionForKey(state.jurisdictionKey)!;
      next = ensureJurisdiction(
        ensureJurisdiction(next, stateJurisdiction),
        town,
      );
      let index =
        townRoster(town.id).households +
        (next.immigrationAdmissions ?? []).filter((r) => r.townId === town.id)
          .length;
      while (written < target) {
        let skeleton = townHouseholdSkeleton(next, town.id, index);
        if (skeleton.members.length > target - written)
          skeleton = {
            ...skeleton,
            shape: "alone",
            members: [skeleton.members[0]!],
          };
        const key = `immigration:${reading!.law.measureId}:${town.id}:${index}`;
        next = materializeSettledTownHousehold(
          next,
          town.id,
          index,
          skeleton,
          key,
        );
        const personIds = skeleton.members.map((_, m) =>
          townResidentId(next, town.id, index, m),
        );
        const basis = `HARDWIRED filed additional admissions ${annual} per year; ACS recent-entry share allocates the national total. ESTIMATED FROM AVERAGE: receiving town concentrates the state allocation in its largest recorded inhabited locality; household ages and shapes use the existing town generator. Birthplace and prior legal status remain unknown. ${research.places[state.jurisdictionKey as keyof typeof research.places].basis}`;
        next = {
          ...next,
          immigrationAdmissions: [
            ...(next.immigrationAdmissions ?? []),
            {
              key,
              measureId: reading!.law.measureId,
              stateKey: state.jurisdictionKey,
              townId: town.id,
              arrivedOn: next.currentDate,
              householdIndex: index,
              personIds,
              basis,
            },
          ],
        };
        next = recordWorldEvent(next, {
          stableKey: `${key}:arrival`,
          type: "immigration.admitted",
          occurredAt: next.currentDate,
          recordedAt: next.currentDate,
          jurisdictionId: town.id,
          involvedEntityIds: [reading!.law.measureId, town.id, ...personIds],
          participants: [],
          personFactConstraints: [],
          visibility: "limited",
          tags: [
            "immigration-admissions-v1",
            `admitted-people:${personIds.length}`,
            `law:${reading!.law.measureId}`,
          ],
          summary: `${personIds.length} newly admitted ${personIds.length === 1 ? "resident arrived" : "residents arrived"} in ${place.displayName}.`,
          context: {
            location: {
              jurisdictionId: town.id,
              label: place.displayName,
              setting: null,
            },
            socialContext: null,
            pressure: null,
            choice: null,
            motivation: null,
            immediateReaction: null,
          },
        });
        written += personIds.length;
        index += 1;
      }
    }
    return next;
  });
}
