/** P8 prototype boundary. No game screen or old-core clock imports this API. */
import type { Parameter } from "./parameters";
export type PersonId = string;
export type PlaceId = string;
export type IsoDate = string;
export type Tier = string;
export type NeedKind = string;
export type GoalKind = string;

export interface Source {
  tag: "SOURCED" | "ESTIMATED";
  citation: string;
  asOf: IsoDate;
  estimatedFrom?: string;
}

export interface Affect {
  at: IsoDate;
  mood: number;
  stress: number;
  moodBaseline: number;
  stressBaseline: number;
}

export interface Drive {
  id: string;
  sourceEventId: string;
  topic: string;
  desiredChange: string;
  strength: number;
  kind?: string;
}

export interface Goal {
  id: string;
  kind: GoalKind;
  urgency: number;
  sourceDriveId?: string;
  targetId?: string;
}

export interface PersonInput {
  id: PersonId;
  givenName: string;
  familyName: string;
  birthDate: IsoDate;
  placeId: PlaceId;
  countyId?: PlaceId;
  householdId: string;
  tier: Tier;
  traits: Readonly<Record<string, number>>;
  traitSources?: Readonly<Record<string, Source>>;
  liquidMinor: number;
  livingCostDailyMinor: number;
  source: Source;
  familyIds: readonly PersonId[];
  knownIds: readonly PersonId[];
  jobId?: string;
  said?: readonly string[];
  looks?: Readonly<Record<string, string>>;
  pastFacts?: readonly {
    id: string;
    date: IsoDate;
    kind: string;
    summary: string;
    source: Source;
    facts?: Readonly<Record<string, string>>;
  }[];
}

export interface PersonState extends Omit<
  PersonInput,
  "traits" | "familyIds" | "knownIds"
> {
  traits: Record<string, number>;
  familyIds: Set<PersonId>;
  knownIds: Set<PersonId>;
  lastActDate: IsoDate;
  affect: Affect;
  needs: Record<NeedKind, number>;
  goals: Map<string, Goal>;
  drives: Map<string, Drive>;
  lastChoice?: string;
  lastReason?: string;
  lastContactDate: IsoDate;
  alive: boolean;
  actCount: number;
  actsByKind: Map<string, number>;
}

export interface JobInput {
  id: string;
  personId: PersonId;
  organizationId: string;
  title: string;
  wageDailyMinor: number;
  hoursDaily: number;
  source: Source;
  occupationClassification?: string;
}

export interface OrganizationInput {
  id: string;
  placeId: PlaceId;
  name: string;
  kind: string;
  topic?: string;
  liquidMinor: number;
  source: Source;
  classification?: string;
  governmentFacts?: Readonly<Record<string, string>>;
}

export interface PublicOrganization {
  id: string;
  placeId: PlaceId;
  name: string;
  kind: string;
  source: Source;
  affordances?: readonly string[];
  facts?: Readonly<Record<string, string>>;
  staff?: readonly {
    personId: PersonId;
    jobId: string;
    title: string;
    source: Source;
  }[];
}

export interface HouseholdInput {
  id: string;
  placeId: PlaceId;
  memberIds: readonly PersonId[];
  source: Source;
}

export interface Relationship {
  id: string;
  actorId: PersonId;
  otherId: PersonId;
  kind: "family" | "coworker" | "contact" | "group";
  level: number;
  lastContactDate: IsoDate;
  promise?: string;
}

export interface ActionDefinition {
  id: string;
  actKinds: readonly string[];
  goalKinds: readonly GoalKind[];
  need: NeedKind;
  effortParameter: string;
  effectParameter: string;
  targetKind: string;
  effect: string;
  emotion?: {
    moodMultiplierParameter: string;
    stressMultiplierParameter: string;
  };
  stopgapId?: string;
  prerequisites?: readonly { operation: string; argument?: string }[];
}

export interface ActOffer {
  definition: ActionDefinition;
  targetId: string;
  driveId?: string;
  availableHours: number;
}

export interface DecisionReason {
  need: number;
  goal: number;
  drive: number;
  trait: number;
  emotion: number;
  effort: number;
}

export interface DecisionResult {
  actorId: PersonId;
  date: IsoDate;
  selected?: ActOffer;
  reasonKey: string;
  selectedReasons?: DecisionReason;
  scores?: readonly {
    actionId: string;
    targetId: string;
    score: number;
    reasons: DecisionReason;
  }[];
}

export interface CoreEventInput {
  id: string;
  date: IsoDate;
  kind: string;
  personIds: readonly PersonId[];
  placeId: PlaceId;
  source: Source;
  topic?: string;
  desiredChange?: string;
  moodImpulse?: number;
  stressImpulse?: number;
  facts?: Readonly<Record<string, string>>;
  publicRecord?: boolean;
  news?: boolean;
  witnessIds?: readonly PersonId[];
}

export interface LogRecord extends CoreEventInput {
  visibility?: "circle" | "public" | "news" | "observer";
  actorId?: PersonId;
  actionId?: string;
  targetId?: string;
  driveId?: string;
  reasonKey?: string;
  decision?: DecisionResult;
}

export interface ActCounter {
  month: string;
  actorId: PersonId;
  actionId: string;
  count: number;
  needContribution: number;
  goalContribution: number;
  driveContribution: number;
}

export interface CoreInput {
  seed: string;
  startedAt: IsoDate;
  people: readonly PersonInput[];
  households: readonly HouseholdInput[];
  jobs: readonly JobInput[];
  organizations: readonly OrganizationInput[];
  publicOrganizations?: readonly PublicOrganization[];
  playerId?: PersonId;
  focusPersonIds: readonly PersonId[];
  focusPlaceIds: readonly PlaceId[];
  calendarDates: readonly IsoDate[];
  gaps: readonly string[];
  priorFactsSource?: readonly {
    personId: PersonId;
    field: string;
    status: "filled" | "preserved" | "unresolved";
    factIds: readonly string[];
    source?: Source;
    reason: string;
  }[];
  familyLinks?: readonly {
    id: string;
    kind: "parent-child" | "partner";
    personIds: readonly [PersonId, PersonId];
  }[];
  husks?: readonly HuskInput[];
  placeMetadata?: Readonly<Record<string, string>>;
}

export interface HuskInput {
  id: PersonId;
  givenName: string;
  familyName: string;
  placeId: PlaceId;
  countyId?: PlaceId;
  looks: Readonly<Record<string, string>>;
  said: readonly string[];
  birthDate?: IsoDate;
  familyIds?: readonly PersonId[];
  source: Source;
}

export interface Membership {
  id: string;
  personId: PersonId;
  organizationId: string;
  joinedAt: IsoDate;
  sourceDriveId?: string;
  status: "requested" | "confirmed";
}

export interface CoreState {
  schemaVersion: string;
  apiVersion: string;
  seed: string;
  startedAt: IsoDate;
  date: IsoDate;
  people: Map<PersonId, PersonState>;
  husks: Map<PersonId, HuskInput>;
  households: Map<string, HouseholdInput>;
  jobs: Map<string, JobInput>;
  organizations: Map<string, OrganizationInput>;
  publicOrganizations: Map<string, PublicOrganization>;
  publicOrganizationsByPlace: Map<PlaceId, Set<string>>;
  relationships: Map<string, Relationship>;
  familyLinks: Map<string, NonNullable<CoreInput["familyLinks"]>[number]>;
  memberships: Map<string, Membership>;
  peopleByPlace: Map<PlaceId, Set<PersonId>>;
  peopleByTier: Map<Tier, Set<PersonId>>;
  organizationsByPlaceKind: Map<string, Set<string>>;
  relationshipsByPerson: Map<PersonId, Set<string>>;
  membershipsByPerson: Map<PersonId, Set<string>>;
  pendingCallbacks: Map<string, CoreEventInput>;
  durableLog: Map<string, LogRecord>;
  logByPerson: Map<PersonId, Set<string>>;
  logByKind: Map<string, Set<string>>;
  logByPlace: Map<PlaceId, Set<string>>;
  latestPublicViews: Map<
    string,
    { personId: PersonId; topic: string; view: string; reasonKey: string }
  >;
  actCounters: Map<string, ActCounter>;
  actCountersByMonth: Map<string, Set<string>>;
  actsByMonthKind: Map<string, number>;
  organizedTopicsByPerson: Map<PersonId, Set<string>>;
  eventIds: Set<string>;
  calendarDates: Set<IsoDate>;
  focusPersonIds: Set<PersonId>;
  focusPlaceIds: Set<PlaceId>;
  playerId?: PersonId;
  observer: boolean;
  sequence: number;
  gaps: Set<string>;
  placeMetadata: Readonly<Record<string, string>>;
  stopgapHits: Set<string>;
  knowledgeByPerson: Map<PersonId, Map<string, KnownFact>>;
  data: CoreData;
  modules: Map<string, CoreModule>;
}

export interface KnownFact {
  key: string;
  value: string;
  learnedAt: IsoDate;
  sourceId: string;
  access: "self" | "perceived" | "told" | "public";
}

export interface NeedDefinition {
  id: string;
  evaluator: string;
  goalKind: string;
  parameters: Readonly<Record<string, string>>;
  stopgapId?: string;
}

export interface TierDefinition {
  id: string;
  cadence: string;
  intervalParameter?: string;
}

export interface CoreData {
  version: string;
  parameters: Readonly<Record<string, Parameter>>;
  needs: readonly NeedDefinition[];
  actions: readonly ActionDefinition[];
  tiers: readonly TierDefinition[];
  actKinds: readonly string[];
  traitPulls: Readonly<
    Record<
      string,
      {
        high?: { toward?: readonly string[]; away?: readonly string[] };
        low?: { toward?: readonly string[]; away?: readonly string[] };
      }
    >
  >;
  situations: readonly {
    id: string;
    requiredFields: readonly string[];
    goalKind: string;
    driveKind: string;
    conditions?: readonly { field: string; operation: string }[];
    stopgapId?: string;
  }[];
  appraisalTraits: readonly {
    traitId: string;
    weightParameter: string;
    oneSided: boolean;
    stopgapId?: string;
  }[];
}

export interface CoreModule {
  id: string;
  onEvent?: (
    api: CoreAPI,
    event: CoreEventInput,
    learnedBy: readonly PersonId[],
  ) => void;
  needEvaluators?: Readonly<
    Record<
      string,
      (
        api: CoreAPI,
        actor: Readonly<PersonState>,
        definition: NeedDefinition,
      ) => number
    >
  >;
  offerProviders?: Readonly<
    Record<
      string,
      (
        api: CoreAPI,
        actor: Readonly<PersonState>,
        action: ActionDefinition,
      ) => readonly ActOffer[]
    >
  >;
  effectHandlers?: Readonly<
    Record<
      string,
      (
        api: CoreAPI,
        actorId: PersonId,
        offer: ActOffer,
        date: IsoDate,
        days: number,
      ) => void
    >
  >;
  eligibilityRules?: Readonly<
    Record<
      string,
      (
        api: CoreAPI,
        actor: Readonly<PersonState>,
        offer: ActOffer,
        argument?: string,
      ) => boolean
    >
  >;
}

/** All engine changes enter through this versioned facade. */
export interface CoreAPI {
  version: string;
  readonly state: Readonly<CoreState>;
  parameter(key: string): number;
  observe(personId: PersonId, fact: KnownFact): void;
  knows(personId: PersonId, key: string): KnownFact | undefined;
  transfer(payerId: string, payeeId: string, minor: number): number;
  relationship(
    actorId: PersonId,
    otherId: PersonId,
    kind: Relationship["kind"],
    change: number,
  ): void;
  join(personId: PersonId, organizationId: string, driveId?: string): void;
  emit(event: CoreEventInput): void;
  recordAct(
    actorId: PersonId,
    offer: ActOffer,
    date: IsoDate,
    reason: DecisionResult,
  ): void;
  stopgap(id: string): void;
  updatePerson(
    personId: PersonId,
    changes: Partial<
      Pick<
        PersonState,
        | "affect"
        | "lastContactDate"
        | "lastChoice"
        | "lastReason"
        | "alive"
        | "jobId"
        | "tier"
        | "lastActDate"
      >
    >,
  ): void;
  addOrganization(input: OrganizationInput): void;
  lookupPublicOrganization(personId: PersonId, organizationId: string): void;
  updateNeeds(
    personId: PersonId,
    values: Readonly<Record<string, number>>,
  ): void;
  updateGoal(personId: PersonId, goal: Goal): void;
  updateDrive(personId: PersonId, drive: Drive): void;
  markOrganized(personId: PersonId, topic: string): void;
  requestCallback(event: CoreEventInput): void;
}
