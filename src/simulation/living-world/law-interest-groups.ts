import { createOrganization, createOrganizationParticipation } from "../life";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  activeWorkRelationshipsAt,
  kinshipRelationshipsAt,
} from "../life-queries";
import {
  lawInterestGroup,
  lawInterestGroupKey,
  lawInterestMembers,
} from "../official-view-reads";
import type { EntityId, LawExposureRecord, World } from "../types";
import { reactionLens } from "./official-views";

/**
 * Organized interests (spec 5): people a law costs a real share of their pay
 * band together against it.
 *
 * APPROVED provisional values (Claude CTO, September 28, 2026, 4:57 a.m.
 * EDT): a group forms in a town once at least 6 residents have each lost a
 * tenth of a month's pay or more to the same law. The group is an ordinary
 * organization, so it shows wherever the game lists a person's groups.
 *
 * Joining is each person's own decision, never a draw (no-dice rule): the
 * size of their loss against their own pay, weighed by their temperament
 * (`reactionLens`), and whether they already know a member through family or
 * work. The same person in the same situation always decides the same way.
 *
 * NOT MODELED yet: an owner joining because their business paid (no writer
 * records a business paying a law's cost yet), group money, and donations.
 */

const G = "law-interest";

// APPROVED provisional: the loss that counts, and how many residents it takes.
const LOSS_THAT_COUNTS_PER_MONTH_OF_PAY = 0.1;
const FOUNDING_RESIDENTS = 6;
// PLACEHOLDER: resolve is the loss in multiples of the loss that counts,
// times the person's temperament. At twice the loss that counts, a person of
// even temper joins on their own; someone who already knows a member joins
// once the loss counts at all.
const RESOLVE_TO_JOIN_ALONE = 2;
const RESOLVE_TO_JOIN_WITH_A_TIE = 1;

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
  return share !== null && share >= LOSS_THAT_COUNTS_PER_MONTH_OF_PAY;
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
  const members = lawInterestMembers(next, groupId);
  const resolve =
    (shareOfPay(exposure)! / LOSS_THAT_COUNTS_PER_MONTH_OF_PAY) *
    reactionLens(next, exposure.personId);
  const tied = knowsAMember(next, exposure.personId, members);
  if (resolve < (tied ? RESOLVE_TO_JOIN_WITH_A_TIE : RESOLVE_TO_JOIN_ALONE))
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
      note: tied
        ? "Joined after the law cost them a real share of their pay, alongside someone they know."
        : "Joined after the law cost them a real share of their pay.",
    },
  });
}

/** Whether the person already knows a member, through family or a workplace. */
function knowsAMember(
  world: World,
  personId: EntityId,
  members: readonly EntityId[],
): boolean {
  if (members.length === 0) return false;
  const others = new Set(members.filter((id) => id !== personId));
  if (
    kinshipRelationshipsAt(world, personId).some((row) =>
      row.personIds.some((id) => others.has(id)),
    )
  )
    return true;
  const workplaces = new Set(
    activeWorkRelationshipsAt(world, personId)
      .map((row) => row.relationship.organizationId)
      .filter((id): id is EntityId => id !== null),
  );
  if (workplaces.size === 0) return false;
  return [...others].some((id) =>
    activeWorkRelationshipsAt(world, id).some(
      (row) =>
        row.relationship.organizationId !== null &&
        workplaces.has(row.relationship.organizationId),
    ),
  );
}
