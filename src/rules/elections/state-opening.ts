import { addDays, type IsoDate } from "./calendar";
import { logistic, logit, clampShare } from "./electorate";
import type {
  EntityId,
  OrganizationParticipation,
} from "../../simulation/types";
import type { CandidacyPack } from "../../simulation/candidacy-packs";
import type { CongressSeat } from "../../simulation/living-world/congress-seats";
import type { GeneratedSeatCondition } from "../../simulation/world-setup/types";
import type { SeatedChamberPlan } from "./chamber-plan";
import type { LegislativeTermLimitRule } from "./legislative-term-limits";
export function stateOpeningBaseline(
  facts: {
    readonly seats: readonly CongressSeat[];
    readonly conditions: readonly GeneratedSeatCondition[];
  },
  stateUsps: string,
) {
  const houseShares = new Map<string, number[]>();
  for (const seat of facts.seats) {
    if (seat.chamberKey !== "us-house") continue;
    const share = facts.conditions.find(
      (row) => row.seatKey === seat.seatKey,
    )?.generatedShare;
    if (share === null || share === undefined) continue;
    const list = houseShares.get(seat.stateUsps) ?? [];
    list.push(logit(clampShare(share, 1e-6)));
    houseShares.set(seat.stateUsps, list);
  }
  const mean = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const home = houseShares.get(stateUsps) ?? [];
  // A state whose House seats carry no two-party margin (an at-large seat
  // decided another way) is centered on its own statewide Senate contests
  // instead, generated from the same conditions. Never a neighbor's.
  const statewide = facts.seats
    .filter(
      (seat) => seat.chamberKey === "us-senate" && seat.stateUsps === stateUsps,
    )
    .map(
      (seat) =>
        facts.conditions.find((row) => row.seatKey === seat.seatKey)
          ?.generatedShare ?? null,
    )
    .filter((share): share is number => share !== null)
    .map((share) => logit(clampShare(share, 1e-6)));
  const center =
    home.length > 0
      ? mean(home)
      : statewide.length > 0
        ? mean(statewide)
        : null;
  let squares = 0;
  let freedom = 0;
  for (const values of houseShares.values()) {
    if (values.length < 2) continue;
    const m = mean(values);
    for (const value of values) squares += (value - m) ** 2;
    freedom += values.length - 1;
  }
  const spread = freedom > 0 ? Math.sqrt(squares / freedom) : 0;

  return { center, spread };
}
export interface OpeningDraw {
  readonly lean: number;
  readonly age: number;
  readonly drawnYears: number;
}
export interface OpeningMember {
  readonly chamber: SeatedChamberPlan;
  readonly officeKey: string;
  readonly ordinal: number;
  readonly party: string | null;
  readonly democraticShare: number | null;
  readonly serviceSince: IsoDate;
  readonly yearsServed: number;
  readonly minimumAge: number;
}
export interface StateOpeningFacts {
  readonly date: IsoDate;
  readonly pack: CandidacyPack | null;
  readonly established: boolean;
  readonly subjectExists: boolean;
  readonly politicalExists: boolean;
  readonly jurisdictionExists: boolean;
  readonly chambers: readonly SeatedChamberPlan[];
  readonly center: number | null;
  readonly spread: number;
  readonly partyIds: readonly string[];
  readonly limit: LegislativeTermLimitRule | null;
  readonly draws: ReadonlyMap<string, OpeningDraw>;
  readonly recordedParties: Readonly<
    Record<
      string,
      {
        readonly democrats: number;
        readonly republicans: number;
        readonly other: number;
        readonly vacancies: number;
      } | null
    >
  >;
}
export function ensureStateLegislatureOpening(facts: StateOpeningFacts) {
  if (!facts.pack || facts.established) return null;
  if (!facts.subjectExists)
    throw new Error("The state legislature opening needs an existing subject.");
  if (!facts.politicalExists || !facts.jurisdictionExists) return null;
  const { chambers } = facts;
  const members: OpeningMember[] = [];
  let earliest = facts.date;
  for (const chamber of chambers) {
    const office = facts.pack.offices.find(
      (candidate) => candidate.officeKey === chamber.officeKey,
    )!;
    const minimumAge =
      office.qualification.minimumAge.kind === "known"
        ? office.qualification.minimumAge.value
        : 18;
    const limitYears = facts.limit
      ? Math.min(
          facts.limit.perChamberYears ?? Number.POSITIVE_INFINITY,
          facts.limit.totalYears ?? Number.POSITIVE_INFINITY,
        )
      : null;
    for (let ordinal = 1; ordinal <= chamber.size; ordinal++) {
      const draw = facts.draws.get(`${chamber.officeKey}|${ordinal}`)!;
      let party: string | null = null;
      let democraticShare: number | null = null;
      if (facts.center !== null && facts.partyIds.length === 2) {
        const lean = facts.center + facts.spread * draw.lean;
        democraticShare = logistic(lean);
        party = democraticShare >= 0.5 ? "democratic" : "republican";
      }
      const yearsServed = Math.min(
        limitYears === null ? draw.drawnYears : draw.drawnYears % limitYears,
        Math.max(0, draw.age - minimumAge - 1),
      );
      const serviceSince = addDays(facts.date, -Math.max(1, yearsServed * 365));
      if (serviceSince < earliest) earliest = serviceSince;
      members.push({
        chamber,
        officeKey: office.officeKey,
        ordinal,
        party,
        democraticShare,
        serviceSince,
        yearsServed,
        minimumAge,
      });
    }
  }
  for (const chamber of chambers) {
    const recorded = facts.recordedParties[chamber.chamberKey] ?? null;
    if (!recorded) continue;
    const indices = members
      .map((member, index) => ({ member, index }))
      .filter(
        ({ member }) =>
          member.chamber === chamber && member.democraticShare !== null,
      )
      .sort(
        (left, right) =>
          right.member.democraticShare! - left.member.democraticShare! ||
          left.member.ordinal - right.member.ordinal,
      )
      .map(({ index }) => index);
    if (indices.length === 0) continue;
    const total =
      recorded.democrats +
      recorded.republicans +
      recorded.other +
      recorded.vacancies;
    if (total === 0) continue;
    const democrats = Math.round((indices.length * recorded.democrats) / total);
    const republicans = Math.min(
      indices.length - democrats,
      Math.round((indices.length * recorded.republicans) / total),
    );
    indices.forEach((index, rank) => {
      const party =
        rank < democrats
          ? "democratic"
          : rank >= indices.length - republicans
            ? "republican"
            : members[index]!.party;
      members[index] = { ...members[index]!, party };
    });
  }

  if (members.length === 0) return null;
  return {
    members,
    earliest,
    weeklyHours: { minimumHours: 10, maximumHours: 45 },
    seatShares: members.flatMap((member) =>
      member.democraticShare === null
        ? []
        : [
            {
              officeKey: member.officeKey,
              ordinal: member.ordinal,
              share: member.democraticShare.toFixed(6),
            },
          ],
    ),
  };
}
export function affiliationIndexes(
  participations: readonly OrganizationParticipation[],
  partyAffiliationKind: string,
) {
  const affiliationsByStableKey = new Map<string, OrganizationParticipation>();
  const firstPartyByPerson = new Map<EntityId, OrganizationParticipation>();
  for (const participation of participations) {
    affiliationsByStableKey.set(participation.stableKey, participation);
    if (
      participation.kind === partyAffiliationKind &&
      !firstPartyByPerson.has(participation.personId)
    )
      firstPartyByPerson.set(participation.personId, participation);
  }
  return { affiliationsByStableKey, firstPartyByPerson };
}

export function stateInstitutionSeats(
  members: readonly {
    readonly officeKey: string;
    readonly workRelationshipId: EntityId;
  }[],
  tenures: ReadonlyMap<
    EntityId,
    {
      readonly id: EntityId;
      readonly organizationId: EntityId | null | undefined;
    }
  >,
) {
  const seats = new Map<
    string,
    { organizationId: EntityId; tenureIds: EntityId[] }
  >();
  for (const member of members) {
    const tenure = tenures.get(member.workRelationshipId);
    if (!tenure?.organizationId)
      throw new Error(
        "State institution binding requires its saved seat tenure",
      );
    const existing = seats.get(member.officeKey);
    if (existing && existing.organizationId !== tenure.organizationId)
      throw new Error(
        "State chamber seats disagree on their saved institution",
      );
    if (existing) existing.tenureIds.push(tenure.id);
    else
      seats.set(member.officeKey, {
        organizationId: tenure.organizationId,
        tenureIds: [tenure.id],
      });
  }
  return seats;
}
export function stateInstitutionBinding(facts: {
  readonly openingKey: string;
  readonly officeKey: string;
  readonly jurisdictionId: EntityId;
  readonly date: IsoDate;
  readonly organization: { readonly id: EntityId } | undefined;
  readonly profile: { readonly id: EntityId } | undefined;
  readonly priorBindingId: EntityId | null;
  readonly tenureIds: readonly EntityId[];
}) {
  if (!facts.organization || !facts.profile)
    throw new Error(
      "State institution binding requires its saved body profile",
    );
  return {
    stableKey: `${facts.openingKey}:institution:${facts.officeKey}`,
    officeKey: facts.officeKey,
    jurisdictionId: facts.jurisdictionId,
    organizationId: facts.organization.id,
    effectiveAt: facts.date,
    supersedesBindingId: facts.priorBindingId,
    sourceRecordIds: [
      facts.organization.id,
      facts.profile.id,
      facts.jurisdictionId,
      ...facts.tenureIds,
    ],
  };
}

// stopgapId: "SG-P14-elections-state-opening-service"

// stopgapId: "SG-P14-elections-state-opening-lean"
