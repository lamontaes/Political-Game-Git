import { isPersonAliveAt } from "../vitality-integrity";
import {
  householdMembershipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";
import { MORTALITY_CAUSE_KEY } from "./death-causes";
import { crisisRecords } from "./records";

/**
 * Read-only person-death projections: who died, and who comes to know it.
 * Nothing here writes. Split from ./notices so a death writer can use them.
 */

export interface PersonDeathNotice {
  readonly noticeKey: string;
  readonly sequence: number;
  readonly personId: EntityId;
  readonly deathRecordId: EntityId;
  readonly deathEventId: EntityId;
  readonly diedAt: IsoDate;
  readonly causeKey: string;
  readonly causeResolved: boolean;
  /** True when the dead person was the player's controlled person. */
  readonly controlledPerson: boolean;
  readonly heldOffice: boolean;
}

/**
 * For PEOPLE: every death, including ordinary civilians, for family and
 * controlled-person continuation. Office succession is not implied here.
 */
export function crisisPersonDeathNotices(
  world: World,
  options: { readonly afterSequence?: number } = {},
): readonly PersonDeathNotice[] {
  const after = options.afterSequence ?? -1;
  const officeDeaths = new Set(
    crisisRecords(world).flatMap((record) =>
      record.kind === "official-continuity" && record.change === "death"
        ? [record.sourceRecordId]
        : [],
    ),
  );
  return world.history.personDeaths
    .filter((death) => death.sequence > after)
    .map((death) => ({
      noticeKey: `crisis:person-death:${death.id}`,
      sequence: death.sequence,
      personId: death.personId,
      deathRecordId: death.id,
      deathEventId: death.eventId,
      diedAt: death.diedAt,
      causeKey: death.causeKey,
      causeResolved: death.causeKey !== MORTALITY_CAUSE_KEY,
      controlledPerson:
        world.control.kind === "person" &&
        world.control.personId === death.personId,
      heldOffice: officeDeaths.has(death.id),
    }));
}

/**
 * One death reaches one recipient once.
 *
 * B (people and information) writes family knowledge and grief from these;
 * D (governing) reads the office-continuity notice instead. The same death
 * produces both, and neither is the other's duplicate. `effectKey` is stable
 * for (death, recipient, relation), so a re-read after any time advance
 * returns the same key and a consumer that stored it writes nothing again.
 */
export interface PersonDeathRecipientNotice {
  readonly effectKey: string;
  readonly sequence: number;
  readonly deathEventId: EntityId;
  readonly deathRecordId: EntityId;
  /** The person who died. */
  readonly personId: EntityId;
  readonly diedAt: IsoDate;
  readonly recipientPersonId: EntityId;
  /** The relation CRISIS can see; never a claim about closeness. */
  readonly relationKind: string;
  readonly controlledPerson: boolean;
  readonly causeKey: string;
  readonly causeResolved: boolean;
  /**
   * Whether the CAUSE may be told to this recipient, which is separate from
   * the fact of the death. False unless a health disclosure actually reached
   * them (or was public). Never inferred from the cause key.
   */
  readonly disclosable: boolean;
  /** The disclosure that makes the cause tellable, when one does. */
  readonly disclosureRecordId: EntityId | null;
  /** True when this recipient already knows the death event. */
  readonly alreadyKnew: boolean;
}

/**
 * Every living recipient of every death after `afterSequence`: household
 * members and recorded kin as CRISIS sees them, each once, with the strongest
 * relation it can name.
 */
export function crisisPersonDeathRecipientNotices(
  world: World,
  options: { readonly afterSequence?: number } = {},
): readonly PersonDeathRecipientNotice[] {
  const notices: PersonDeathRecipientNotice[] = [];
  for (const death of crisisPersonDeathNotices(world, options)) {
    const cutoff = {
      asOfDate: death.diedAt,
      historySequenceExclusive: world.history.nextSequence,
    };
    const relations = new Map<EntityId, string>();
    for (const relationship of kinshipRelationshipsAt(
      world,
      death.personId,
      cutoff,
    )) {
      const other = relationship.personIds.find((id) => id !== death.personId);
      if (other && !relations.has(other))
        relations.set(other, relationship.kind);
    }
    for (const membership of householdMembershipsAt(
      world,
      death.personId,
      cutoff,
    )) {
      for (const memberId of peopleInHouseholdAt(
        world,
        membership.household.id,
        cutoff,
      )) {
        if (memberId === death.personId) continue;
        if (!relations.has(memberId))
          relations.set(memberId, "household:member");
      }
    }
    const disclosures = crisisRecords(world).filter(
      (record) =>
        record.kind === "health-disclosure" &&
        record.personId === death.personId,
    );
    for (const [recipientPersonId, relationKind] of [...relations].sort(
      (a, b) => a[0].localeCompare(b[0]),
    )) {
      if (!world.people[recipientPersonId]) continue;
      if (!isPersonAliveAt(world, recipientPersonId, cutoff)) continue;
      const disclosure = disclosures.find(
        (record) =>
          record.kind === "health-disclosure" &&
          (record.access === "public" ||
            record.recipientIds.includes(recipientPersonId)),
      );
      notices.push({
        effectKey: `crisis:person-death:${death.deathRecordId}:${recipientPersonId}:${relationKind}`,
        sequence: death.sequence,
        deathEventId: death.deathEventId,
        deathRecordId: death.deathRecordId,
        personId: death.personId,
        diedAt: death.diedAt,
        recipientPersonId,
        relationKind,
        controlledPerson: death.controlledPerson,
        causeKey: death.causeKey,
        causeResolved: death.causeResolved,
        disclosable: death.causeResolved && disclosure !== undefined,
        disclosureRecordId: disclosure?.id ?? null,
        alreadyKnew: world.history.knowledge.some(
          (record) =>
            record.personId === recipientPersonId &&
            record.eventId === death.deathEventId,
        ),
      });
    }
  }
  return notices;
}
