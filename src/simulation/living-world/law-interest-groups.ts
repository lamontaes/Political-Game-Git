import { createOrganization, createOrganizationParticipation } from "../life";
import { lifePlaceByJurisdictionId } from "../life-places";
import { SeededRng } from "../rng";
import {
  lawInterestGroup,
  lawInterestGroupKey,
  lawInterestMembers,
} from "../official-view-reads";
import type { LawExposureRecord, World } from "../types";

/**
 * Organized interests (spec 5): people a law costs a real share of their pay
 * band together against it.
 *
 * APPROVED provisional values (Claude CTO, September 28, 2026, 4:57 a.m.
 * EDT): a group forms in a town once at least 6 residents have each lost a
 * tenth of a month's pay or more to the same law, and each of them joins with
 * odds that rise with the size of the hit. The group is an ordinary
 * organization, so it shows wherever the game lists a person's groups.
 *
 * NOT MODELED yet: an owner joining because their business paid (no writer
 * records a business paying a law's cost yet), group money, and donations.
 */

const G = "law-interest";

// APPROVED provisional: the loss that counts, and how many residents it takes.
const COST_SHARE_OF_PAY = 0.1;
const FOUNDING_RESIDENTS = 6;
// PLACEHOLDER: joining odds rise with the loss as a share of a month's pay,
// from 30 percent at the threshold to 90 percent at seven tenths or more.
const JOIN_AT_THRESHOLD = 0.3;
const JOIN_MOST = 0.9;

/** The loss as a share of the person's month's pay, or null when unmeasured. */
function shareOfPay(exposure: LawExposureRecord): number | null {
  if (exposure.direction !== "cost" || exposure.amount === null) return null;
  const pay = exposure.monthlyPay?.minorUnits ?? 0;
  if (pay <= 0) return null;
  return exposure.amount.minorUnits / pay;
}

/** A person's own exposure that counts toward a group: a big enough loss. */
function qualifies(exposure: LawExposureRecord): boolean {
  if (exposure.relation !== "own") return false;
  const share = shareOfPay(exposure);
  return share !== null && share >= COST_SHARE_OF_PAY;
}

/**
 * Called when a person reflects on their own exposure: forms the town's group
 * once enough residents qualify, and lets this person join it.
 */
export function joinLawInterestGroup(
  world: World,
  exposure: LawExposureRecord,
): World {
  if (!qualifies(exposure)) return world;
  const person = world.people[exposure.personId];
  const town = person?.homeJurisdictionId;
  if (!person || !town) return world;
  let next = world;
  let groupId = lawInterestGroup(next, town, exposure.measureId);
  if (!groupId) {
    const hit = new Set(
      (world.history.lawExposures ?? [])
        .filter(
          (row) =>
            row.measureId === exposure.measureId &&
            qualifies(row) &&
            world.people[row.personId]?.homeJurisdictionId === town,
        )
        .map((row) => row.personId),
    );
    if (hit.size < FOUNDING_RESIDENTS) return world;
    const measure = world.history.legislativeMeasures?.find(
      (row) => row.id === exposure.measureId,
    );
    const place = lifePlaceByJurisdictionId(town)?.displayName;
    if (!measure || !place) return world;
    next = createOrganization(next, {
      stableKey: lawInterestGroupKey(town, exposure.measureId),
      formedAt: next.currentDate,
      provenance: {
        kind: "authored",
        note: "Residents a law cost a tenth of a month's pay or more.",
      },
      initialProfile: {
        // PLACEHOLDER wording, awaiting editorial review.
        name: `${place} Residents Against ${measure.shortTitle}`,
        classification: "membership:law-interest",
        locationJurisdictionId: town,
      },
    });
    groupId = lawInterestGroup(next, town, exposure.measureId)!;
  }
  if (lawInterestMembers(next, groupId).includes(exposure.personId))
    return next;
  const share = shareOfPay(exposure)!;
  const odds = Math.min(
    JOIN_MOST,
    JOIN_AT_THRESHOLD + (share - COST_SHARE_OF_PAY),
  );
  if (new SeededRng(world.seed).fork(`${G}:join:${exposure.id}`).next() >= odds)
    return next;
  return createOrganizationParticipation(next, {
    stableKey: `${G}:member:${groupId}:${exposure.personId}`,
    personId: exposure.personId,
    organizationId: groupId,
    startedAt: next.currentDate,
    kind: "membership:law-interest",
    roleKind: "member:law-interest",
    context: null,
    provenance: {
      kind: "authored",
      note: "Joined after the law cost them a real share of their pay.",
    },
  });
}
