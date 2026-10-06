import { FAMILY_MEMBER_ADDED_EVENT } from "./people-family";
import {
  activeChildAuthoritiesAt,
  activeCareResponsibilitiesAt,
  organizationParticipationHistoryForPerson,
  organizationParticipationStateHistory,
  organizationProfileAt,
} from "./life-queries";
import { currentLifeCutoff } from "./life-queries";
import { childhoodRecordEntries } from "./childhood-record";
import { upbringingFor } from "./people-upbringing";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  CareResponsibilityShare,
  OrganizationParticipationStateRecord,
  World,
} from "./types";

/**
 * A faith affiliation read from the person's own recorded congregation
 * membership. This is not a belief, religious identity, or a conclusion drawn
 * from relatives or household context.
 */
export interface FaithRecordEntry {
  readonly organizationId: EntityId;
  readonly congregationName: string | null;
  readonly startedAt: IsoDate;
  readonly states: readonly OrganizationParticipationStateRecord[];
}

export interface CurrentFaithRecord {
  readonly status: "affiliated" | "unaffiliated" | "unknown";
  readonly congregationIds: readonly EntityId[];
  readonly primaryCongregationId: EntityId | null;
  readonly mixedHousehold: boolean;
  readonly congregations: readonly {
    readonly organizationId: EntityId;
    readonly name: string | null;
  }[];
  /** Dated source factors retained for household-derived affiliations. */
  readonly householdAttributions: readonly {
    readonly caregiverPersonId: EntityId;
    readonly organizationId: EntityId;
    readonly participationEffectiveAt: IsoDate;
    readonly participationSequence: number;
    readonly participationStartedAt: IsoDate;
    readonly participationRoleKind: string | null;
    readonly caregivingShares: readonly CareResponsibilityShare[];
    readonly caregiverAuthority: boolean;
    readonly caregivingPriority:
      "primary" | "shared" | "supporting" | "unrecorded";
  }[];
  readonly asOf: IsoDate;
  readonly basis:
    | "recorded-personal-life"
    | "attributed-household"
    | "estimated-household"
    | "unrecorded-household";
  readonly estimated: boolean;
  readonly attributedFromPersonIds: readonly EntityId[];
}

function personalFaith(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff,
) {
  const candidates = faithRecordForPerson(world, personId, cutoff).flatMap(
    (entry) => {
      const state = [...entry.states]
        .reverse()
        .find((candidate) => candidate.status !== "expected");
      return state ? [{ entry, state }] : [];
    },
  );
  candidates.sort(
    (left, right) =>
      left.state.effectiveAt.localeCompare(right.state.effectiveAt) ||
      left.state.sequence - right.state.sequence,
  );
  return {
    latest: candidates.at(-1) ?? null,
    active: candidates
      .filter(({ state }) => state.status === "active")
      .map(({ entry }) => entry.organizationId)
      .sort(),
  };
}

function familyFaithOrigin(world: World, personId: EntityId) {
  const additions = world.history.events
    .filter(
      (event) =>
        event.type === FAMILY_MEMBER_ADDED_EVENT &&
        event.involvedEntityIds.includes(personId) &&
        event.occurredAt <= world.currentDate &&
        event.participants.some(
          (participant) =>
            participant.personId === personId &&
            participant.role === "focus:subject",
        ),
    )
    .sort(
      (left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) ||
        left.sequence - right.sequence,
    );
  const addition = additions.at(-1);
  if (addition) {
    return {
      at: addition.occurredAt,
      sequenceExclusive: addition.sequence,
      estimated: false,
      caregiverPersonIds: addition.participants
        .filter((participant) => participant.role === "agency:parent")
        .map((participant) => participant.personId)
        .sort(),
    };
  }

  const upbringing = upbringingFor(world, personId).familyContext;
  const caregiverPersonIds = [
    ...new Set(
      (upbringing?.parentIds.length
        ? upbringing.parentIds
        : (upbringing?.caregiverPersonIds ?? [])
      ).filter((id) => id !== personId),
    ),
  ].sort();
  return {
    at:
      world.people[personId]!.birthDate < world.startedAt
        ? world.startedAt
        : world.people[personId]!.birthDate,
    sequenceExclusive: world.history.nextSequence,
    estimated: !upbringing?.parentIds.length,
    caregiverPersonIds,
  };
}

function householdAttributionsAt(
  world: World,
  childPersonId: EntityId,
  caregiverPersonIds: readonly EntityId[],
  cutoff: HistoricalCutoff,
) {
  const evidenceCutoff: HistoricalCutoff = {
    asOfDate: cutoff.asOfDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  return caregiverPersonIds.flatMap((caregiverPersonId) => {
    const care = activeCareResponsibilitiesAt(
      world,
      caregiverPersonId,
      evidenceCutoff,
    )
      .filter(
        ({ responsibility }) =>
          responsibility.recipientPersonId === childPersonId,
      )
      .map(({ state }) => state.share)
      .sort();
    const caregiverAuthority = activeChildAuthoritiesAt(
      world,
      childPersonId,
      evidenceCutoff,
    ).some(
      ({ authority }) =>
        (authority.kind.startsWith("parental:") ||
          authority.kind.startsWith("guardianship:") ||
          authority.kind.startsWith("custody:")) &&
        authority.holder.kind === "person" &&
        authority.holder.personId === caregiverPersonId,
    );
    const caregivingPriority:
      "primary" | "shared" | "supporting" | "unrecorded" = care.includes(
      "primary",
    )
      ? "primary"
      : care.includes("shared")
        ? "shared"
        : care.includes("supporting")
          ? "supporting"
          : "unrecorded";
    return organizationParticipationHistoryForPerson(
      world,
      caregiverPersonId,
      cutoff,
    )
      .filter(
        (participation) => participation.kind === "membership:congregation",
      )
      .flatMap((participation) => {
        const state = organizationParticipationStateHistory(
          world,
          participation.id,
          cutoff,
        ).at(-1);
        return state?.status === "active"
          ? [
              {
                caregiverPersonId,
                organizationId: participation.organizationId,
                participationEffectiveAt: state.effectiveAt,
                participationSequence: state.sequence,
                participationStartedAt: participation.startedAt,
                participationRoleKind: state.roleKind,
                caregivingShares: care,
                caregivingPriority,
                caregiverAuthority,
              },
            ]
          : [];
      });
  });
}

function faithResult(
  world: World,
  input: Omit<
    CurrentFaithRecord,
    "congregations" | "status" | "primaryCongregationId" | "mixedHousehold"
  > & {
    readonly status?: CurrentFaithRecord["status"];
    readonly primaryCongregationId?: EntityId | null;
    readonly mixedHousehold?: boolean;
  },
): CurrentFaithRecord {
  const congregationIds = [...new Set(input.congregationIds)].sort();
  const cutoff = currentLifeCutoff(world);
  return {
    ...input,
    congregationIds,
    householdAttributions: input.householdAttributions,
    primaryCongregationId:
      input.primaryCongregationId === undefined
        ? congregationIds.length === 1
          ? congregationIds[0]!
          : null
        : input.primaryCongregationId,
    mixedHousehold: input.mixedHousehold ?? false,
    congregations: congregationIds.map((organizationId) => ({
      organizationId,
      name: organizationProfileAt(world, organizationId, cutoff)?.name ?? null,
    })),
    status:
      input.status ?? (congregationIds.length ? "affiliated" : "unaffiliated"),
  };
}

/**
 * Current faith for a person, projected from their own canonical congregation
 * history or their recorded upbringing. The read never appends a second faith
 * store: personal life takes precedence; otherwise a family addition supplies
 * its parents at the event's date and sequence. Estimated household evidence
 * is marked; people with no usable source remain unknown.
 */
export function currentFaithForPerson(
  world: World,
  personId: EntityId,
): CurrentFaithRecord {
  if (!world.people[personId]) throw new Error(`No person ${personId} exists.`);
  const cutoff = currentLifeCutoff(world);
  const own = personalFaith(world, personId, cutoff);
  const ownFaithChoice = childhoodRecordEntries(world)
    .filter(
      (entry) =>
        entry.kind === "faith-choice" &&
        entry.personId === personId &&
        entry.effectiveAt <= world.currentDate,
    )
    .sort(
      (left, right) =>
        left.effectiveAt.localeCompare(right.effectiveAt) ||
        left.sequence - right.sequence,
    )
    .at(-1);
  const choiceSupersedesParticipation =
    ownFaithChoice?.kind === "faith-choice" &&
    (!own.latest ||
      ownFaithChoice.effectiveAt > own.latest.state.effectiveAt ||
      (ownFaithChoice.effectiveAt === own.latest.state.effectiveAt &&
        ownFaithChoice.sequence > own.latest.state.sequence));
  if (choiceSupersedesParticipation) {
    const congregationIds = ownFaithChoice.congregationId
      ? [ownFaithChoice.congregationId]
      : [];
    return faithResult(world, {
      congregationIds,
      householdAttributions: [],
      primaryCongregationId: congregationIds[0] ?? null,
      mixedHousehold: false,
      asOf: ownFaithChoice.effectiveAt,
      basis: "recorded-personal-life",
      estimated: false,
      attributedFromPersonIds: [],
    });
  }
  if (own.latest) {
    const activeOwn = own.active
      .map((organizationId) => {
        const entry = faithRecordForPerson(world, personId, cutoff).find(
          (candidate) => candidate.organizationId === organizationId,
        );
        const state = entry?.states.at(-1);
        return state?.status === "active" ? { organizationId, state } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort(
        (left, right) =>
          right.state.effectiveAt.localeCompare(left.state.effectiveAt) ||
          right.state.sequence - left.state.sequence,
      );
    const ownTie =
      activeOwn.length > 1 &&
      activeOwn[0]!.state.effectiveAt === activeOwn[1]!.state.effectiveAt &&
      activeOwn[0]!.state.sequence === activeOwn[1]!.state.sequence;
    return faithResult(world, {
      congregationIds: own.active,
      householdAttributions: [],
      primaryCongregationId: ownTie
        ? null
        : (activeOwn[0]?.organizationId ?? null),
      mixedHousehold: ownTie,
      asOf: own.latest.state.effectiveAt,
      basis: "recorded-personal-life",
      estimated: false,
      attributedFromPersonIds: [],
    });
  }

  const origin = familyFaithOrigin(world, personId);
  if (origin.caregiverPersonIds.length) {
    const originCutoff: HistoricalCutoff = {
      asOfDate: origin.at,
      historySequenceExclusive: origin.sequenceExclusive,
    };
    const householdAttributions = householdAttributionsAt(
      world,
      personId,
      origin.caregiverPersonIds,
      originCutoff,
    );
    const priority: Record<
      "primary" | "shared" | "supporting" | "unrecorded",
      number
    > = {
      primary: 3,
      shared: 2,
      supporting: 1,
      unrecorded: 0,
    } as const;
    const congregationWeights = new Map<
      EntityId,
      (typeof householdAttributions)[number][]
    >();
    for (const row of householdAttributions) {
      const rows = congregationWeights.get(row.organizationId) ?? [];
      rows.push(row);
      congregationWeights.set(row.organizationId, rows);
    }
    const rankedCongregations = [...congregationWeights.entries()]
      .map(([organizationId, rows]) => {
        const strongest = rows
          .map((row) => ({
            authority: row.caregiverAuthority,
            care: priority[row.caregivingPriority],
            startedAt: row.participationStartedAt,
          }))
          .sort(
            (left, right) =>
              Number(right.authority) - Number(left.authority) ||
              right.care - left.care ||
              left.startedAt.localeCompare(right.startedAt),
          )[0]!;
        return { organizationId, ...strongest };
      })
      .sort(
        (left, right) =>
          Number(right.authority) - Number(left.authority) ||
          right.care - left.care ||
          left.startedAt.localeCompare(right.startedAt) ||
          left.organizationId.localeCompare(right.organizationId),
      );
    const top = rankedCongregations[0];
    const runnerUp = rankedCongregations[1];
    const equalTopWeight =
      !!top &&
      !!runnerUp &&
      top.authority === runnerUp.authority &&
      top.care === runnerUp.care &&
      ((top.care === 0 && !top.authority) ||
        top.startedAt === runnerUp.startedAt);
    return faithResult(world, {
      congregationIds: householdAttributions.map(
        ({ organizationId }) => organizationId,
      ),
      householdAttributions,
      primaryCongregationId: equalTopWeight
        ? null
        : (rankedCongregations[0]?.organizationId ?? null),
      mixedHousehold: equalTopWeight,
      asOf: origin.at,
      basis: origin.estimated ? "estimated-household" : "attributed-household",
      estimated: origin.estimated,
      attributedFromPersonIds: origin.caregiverPersonIds,
      status:
        origin.estimated && householdAttributions.length === 0
          ? "unknown"
          : undefined,
    });
  }
  return faithResult(world, {
    congregationIds: [],
    householdAttributions: [],
    asOf: world.people[personId]!.birthDate,
    basis: "unrecorded-household",
    estimated: false,
    attributedFromPersonIds: [],
    status: "unknown",
  });
}

/**
 * The recorded congregations a person belonged to, including inactive and
 * ended memberships. Old saves and people with no membership have an empty
 * record; no faith is inferred to fill the gap.
 */
export function faithRecordForPerson(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly FaithRecordEntry[] {
  return organizationParticipationHistoryForPerson(world, personId, cutoff)
    .filter((participation) => participation.kind === "membership:congregation")
    .map((participation) => ({
      organizationId: participation.organizationId,
      congregationName:
        organizationProfileAt(world, participation.organizationId, cutoff)
          ?.name ?? null,
      startedAt: participation.startedAt,
      states: organizationParticipationStateHistory(
        world,
        participation.id,
        cutoff,
      ),
    }))
    .sort(
      (left, right) =>
        left.startedAt.localeCompare(right.startedAt) ||
        String(left.organizationId).localeCompare(String(right.organizationId)),
    );
}
