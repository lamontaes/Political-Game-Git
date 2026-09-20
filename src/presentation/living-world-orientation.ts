import { stateJurisdictionForKey } from "../simulation/life-places";
import {
  LIVING_WORLD_CONTRACT_VERSION,
  currentStateExecutiveHolders,
  homeLocalGovernmentStatus,
  homeStateUsps,
  nationalParties,
  partyColorOrder,
  projectCongress,
  publicPartyAffiliation,
} from "../simulation";
import type {
  CongressView,
  EntityId,
  IsoDate,
  PartyView,
  PublicHolderView,
  RuleFieldKey,
  World,
} from "../simulation";
import { currentPublicOfficeholders } from "./opening-officeholders";

export interface LocalityGovernmentView {
  readonly organizationId: EntityId | null;
  readonly name: string;
  /** Empty when no holder is recorded; never an inferred mayor or council. */
  readonly holders: readonly PublicHolderView[];
  /** RULES fields whose absence keeps members unrecorded. */
  readonly membershipMissing: readonly RuleFieldKey[];
}

export interface WorldOrientation {
  readonly version: typeof LIVING_WORLD_CONTRACT_VERSION;
  readonly asOf: IsoDate;
  /** Changes whenever anything is appended to the save's history. */
  readonly worldRevision: number;
  readonly executive: readonly PublicHolderView[];
  /** Null for a save whose public world was never established. */
  readonly congress: CongressView | null;
  readonly homeState: {
    readonly stateUsps: string;
    readonly jurisdictionId: EntityId | null;
    readonly governor: PublicHolderView | null;
  } | null;
  readonly locality: {
    readonly jurisdictionId: EntityId;
    readonly name: string | null;
    readonly governments: readonly LocalityGovernmentView[];
  } | null;
  readonly parties: readonly PartyView[];
  /**
   * Every national party the save ever recorded, in permanent order. Color
   * and legend slots key on this, so a later founding, merger or dissolution
   * never moves another party's color. Absent in hand-built fixtures.
   */
  readonly partyColorOrder?: readonly EntityId[];
  /** Filled by W3 producers; empty until then. */
  readonly publicMatters: readonly never[];
}

const FEDERAL_OFFICE_KEYS = new Set([
  "us-president",
  "us-vice-president",
  "us-chief-justice",
]);

/**
 * One pure read of the public world a life opens into. It writes nothing,
 * materializes nobody and grants no knowledge or acquaintance.
 */
export function projectWorldOrientation(
  world: World,
  playerPersonId: EntityId,
): WorldOrientation {
  const player = world.people[playerPersonId];
  if (!player) throw new Error("The orientation player is absent.");
  const holderView = (holder: {
    readonly officeKey: string;
    readonly title: string;
    readonly personId: EntityId;
    readonly personName: string;
    readonly termId: EntityId;
    readonly startedAt: IsoDate | null;
    readonly endExclusive: IsoDate | null;
    readonly stateUsps?: string;
  }): PublicHolderView => {
    const person = world.people[holder.personId]!;
    return {
      personId: holder.personId,
      personName: holder.personName,
      officeKey: holder.officeKey,
      title: holder.title,
      stateUsps: holder.stateUsps ?? null,
      partyOrganizationId: publicPartyAffiliation(world, holder.personId),
      caucusOrganizationId: null,
      termId: holder.termId,
      startedAt: holder.startedAt,
      endExclusive: holder.endExclusive,
      serviceSince: holder.startedAt,
      birthDate: person.birthDate,
      residenceJurisdictionId: person.homeJurisdictionId,
      residenceLabel:
        world.jurisdictions[person.homeJurisdictionId]?.name ?? null,
    };
  };

  const executive = currentPublicOfficeholders(world)
    .filter((holder) => FEDERAL_OFFICE_KEYS.has(holder.officeKey))
    .map(holderView);

  const stateUsps = homeStateUsps(world, playerPersonId);
  const governorRecord = stateUsps
    ? currentStateExecutiveHolders(world).find(
        (holder) => holder.stateUsps === stateUsps,
      )
    : undefined;
  const governor = governorRecord ? holderView(governorRecord) : null;

  const congress = projectCongress(world);
  const local = homeLocalGovernmentStatus(world, playerPersonId);
  const holderIds = [
    ...executive.map((holder) => holder.personId),
    ...(governor ? [governor.personId] : []),
    ...(congress
      ? [...congress.house.seats, ...congress.senate.seats].flatMap((seat) =>
          seat.occupant.kind === "member"
            ? [seat.occupant.member.personId]
            : [],
        )
      : []),
  ];

  return {
    version: LIVING_WORLD_CONTRACT_VERSION,
    asOf: world.currentDate,
    worldRevision: world.history.nextSequence,
    executive,
    congress,
    homeState: stateUsps
      ? {
          stateUsps,
          jurisdictionId:
            stateUsps === "DC"
              ? player.homeJurisdictionId
              : (stateJurisdictionForKey(`US-${stateUsps}`)?.id ?? null),
          governor,
        }
      : null,
    locality: {
      jurisdictionId: player.homeJurisdictionId,
      name: world.jurisdictions[player.homeJurisdictionId]?.name ?? null,
      governments: local.governments.map((government) => ({
        organizationId: government.organizationId,
        name: government.name,
        holders: [],
        membershipMissing: government.membershipMissing,
      })),
    },
    parties: nationalParties(world, holderIds),
    partyColorOrder: partyColorOrder(world),
    publicMatters: [],
  };
}
