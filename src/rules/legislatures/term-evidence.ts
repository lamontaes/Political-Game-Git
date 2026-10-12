import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  World,
} from "../../simulation/types";
import {
  legislativeTermDates,
  type LegislativeTermFacts,
} from "../elections/legislative-terms";
import {
  legacyUnboundDistrictSeat,
  type UnboundDistrictFacts,
} from "./unbound-district";
export interface LegislativeEvidenceFacts extends UnboundDistrictFacts {
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly people: World["people"];
  readonly deaths: World["history"]["personDeaths"];
  readonly dueItems: World["history"]["futureDueItems"];
  readonly dueStates: World["history"]["futureDueItemStates"];
  readonly relationships: World["history"]["workRelationships"];
  readonly contests: NonNullable<World["history"]["electionContests"]>;
  readonly results: NonNullable<World["history"]["electionContestResults"]>;
  readonly campaigns: NonNullable<World["history"]["campaigns"]>;
  readonly organizations: World["history"]["organizations"];
  readonly jurisdictionsByKey: ReadonlyMap<
    string,
    World["jurisdictions"][EntityId]
  >;
  readonly termFacts: ReadonlyMap<string, LegislativeTermFacts>;
  readonly workRoles: ReadonlyMap<
    EntityId,
    { readonly locationJurisdictionId: EntityId | null }
  >;
  readonly workStatuses: ReadonlyMap<EntityId, { readonly status: string }>;
  readonly events: World["history"]["events"];
}
const LEGISLATIVE_TERM_ENTRY = "election:legislative-term-entry",
  LEGISLATIVE_TERM_EXPIRY = "election:legislative-term-expiry";
function isPersonAliveAt(
  facts: LegislativeEvidenceFacts,
  personId: EntityId,
  cutoff: HistoricalCutoff,
): boolean {
  const person = facts.people[personId];
  if (!person) throw new Error(`Missing vitality person: ${personId}`);
  if (cutoff.asOfDate < person.birthDate) return false;
  return !facts.deaths.some(
    (row) =>
      row.personId === personId &&
      row.diedAt <= cutoff.asOfDate &&
      row.sequence < cutoff.historySequenceExclusive,
  );
}
export function legislativeTermForRelationship(
  facts: LegislativeEvidenceFacts,
  relationshipId: EntityId,
) {
  const entry = facts.dueItems.find(
    (d) =>
      d.transitionKey === LEGISLATIVE_TERM_ENTRY &&
      d.entityIds.includes(relationshipId),
  );
  if (!entry) return null;
  const relationship = facts.relationships.find((r) => r.id === relationshipId);
  const contest = (facts.contests ?? []).find((c) =>
    entry.entityIds.includes(c.id),
  );
  const result =
    contest &&
    (facts.results.find((row) => row.contestId === contest.id) ?? null);
  const campaign = (facts.campaigns ?? []).find(
    (c) => c.contestId === contest?.id,
  );
  const pack = campaign && facts.packs.get(campaign.candidacyPackId);
  const governing = pack && facts.jurisdictionsByKey.get(pack.jurisdictionKey);
  const expiry = facts.dueItems.find(
    (d) =>
      d.transitionKey === LEGISLATIVE_TERM_EXPIRY &&
      d.entityIds.includes(relationshipId),
  );
  const timing =
    contest &&
    legislativeTermDates(
      facts.termFacts.get(contest.office.officeKey)!,
      contest.office.officeKey,
      contest.electionDate,
    );
  if (
    !relationship ||
    !contest ||
    !result ||
    !campaign ||
    !pack ||
    !governing ||
    !expiry ||
    !timing ||
    entry.stableKey !==
      `legislative-term:${contest.id}:${timing.ruleVersion}:entry` ||
    expiry.stableKey !==
      `legislative-term:${contest.id}:${timing.ruleVersion}:expiry` ||
    entry.dueAt !== timing.startsAt ||
    expiry.dueAt !== timing.endsAt ||
    relationship.startedAt !== entry.dueAt ||
    relationship.kind !== "employment:legislative-member" ||
    relationship.provenance.kind !== "simulated-event" ||
    relationship.provenance.eventId !== result.outcomeEventId ||
    relationship.personId !== result.winnerPersonId ||
    !entry.entityIds.includes(result.id) ||
    entry.entityIds.length !== 3 ||
    expiry.entityIds.length !== 3 ||
    !expiry.entityIds.includes(result.id) ||
    !expiry.entityIds.includes(contest.id) ||
    facts.workRoles.get(relationship.id)?.locationJurisdictionId !==
      governing.id ||
    entry.jurisdictionId !== governing.id ||
    expiry.jurisdictionId !== governing.id ||
    !facts.organizations.some(
      (o) =>
        o.id === relationship.organizationId &&
        o.stableKey === `legislature:${pack.packId}`,
    )
  )
    return null;
  return {
    relationship,
    contest,
    result,
    campaign,
    pack,
    governing,
    entry,
    expiry,
    startsAt: entry.dueAt,
    endsAt: expiry.dueAt,
    seatKey:
      contest.office.districtBinding?.recordId ??
      contest.office.seatKey ??
      legacyUnboundDistrictSeat(
        facts,
        contest,
        relationship.personId,
        pack.packId,
      ) ??
      contest.id,
  };
}

export function activeLegislativeTermEvidence(
  facts: LegislativeEvidenceFacts,
  relationshipId: EntityId,
) {
  const term = legislativeTermForRelationship(facts, relationshipId);
  if (
    !term ||
    facts.onDate < term.startsAt ||
    facts.onDate >= term.endsAt ||
    facts.workStatuses.get(relationshipId)?.status !== "active" ||
    !isPersonAliveAt(facts, term.relationship.personId, {
      asOfDate: facts.onDate,
      historySequenceExclusive: facts.nextSequence,
    })
  )
    return null;
  const entered =
    facts.dueStates.some(
      (s) => s.dueItemId === term.entry.id && s.status === "resolved",
    ) ||
    facts.events.some(
      (event) =>
        event.type === "election.term-entered-late" &&
        event.stableKey === `late-term-entry:${relationshipId}` &&
        event.occurredAt <= facts.onDate,
    );
  return entered ? term : null;
}
