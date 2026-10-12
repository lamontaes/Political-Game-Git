/** Complete retained local business creation, identity/name collision, formation/worker timing and obligation requests. */
import { makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import { money } from "./cost-money";
import {
  LOCAL_BUSINESS_ESTIMATE,
  localBusinessWageMinor,
  type EmployerWageFacts,
} from "./employer-wage";
import { localBusinessPlansFor } from "./business-plans";
import type { BusinessSupplyFacts } from "./business-supply";
import type {
  createOrganization,
  createWorkRelationships,
  CreateWorkRelationshipInput,
} from "../../simulation/life";
import type {
  createResourceFlows,
  CreateResourceFlowInput,
} from "../../simulation/resources";
import type {
  createCharacterHistoryContextPeople,
  CharacterHistoryContextPersonInput,
} from "../../simulation/character-history";
import type { InventedPersonRole } from "../../simulation/invented-person-age";
import type {
  World,
  EntityId,
  IsoDate,
  TimeDemandProfile,
} from "../../simulation/types";
export type LocalBusinessPlan = ReturnType<
  typeof localBusinessPlansFor
>[number];
export type LocalBusinessKind = LocalBusinessPlan["kind"];
// STOPGAP: economy.local-name-raw-word-source
export interface LocalSeatingFacts {
  readonly id: EntityId;
  readonly currentDate: IsoDate;
  readonly jurisdictions: World["jurisdictions"];
  readonly records: World["history"];
  readonly supply: BusinessSupplyFacts;
  readonly wage: EmployerWageFacts;
  readonly words: ReadonlyMap<string, readonly number[]>;
  readonly identities: ReadonlyMap<
    string,
    {
      readonly names: readonly { givenName: string; familyName: string }[];
      readonly identity: CharacterHistoryContextPersonInput["identity"];
      readonly birthDate: IsoDate;
    }
  >;
}
export type LocalSeatingRequest =
  | {
      readonly kind: "createCharacterHistoryContextPeople";
      readonly input: Parameters<typeof createCharacterHistoryContextPeople>[1];
    }
  | {
      readonly kind: "createOrganization";
      readonly input: Parameters<typeof createOrganization>[1];
    }
  | {
      readonly kind: "createWorkRelationships";
      readonly input: Parameters<typeof createWorkRelationships>[1];
    }
  | {
      readonly kind: "createResourceFlows";
      readonly input: Parameters<typeof createResourceFlows>[1];
    };
export const localSeatingSourceKey = (...keys: unknown[]) =>
  JSON.stringify(keys);
const LOCAL_BUSINESS_MAX_PER_KIND = 2,
  LOCAL_BUSINESS_MAX_STAFF = 3;
const BUSINESS_REVENUE_BASIS = "custom:business-revenue",
  BUSINESS_WAGES_BASIS = "compensation:wages",
  BUSINESS_OWNER_WORK_KIND = "independent:business-owner",
  BUSINESS_WORKER_WORK_KIND = "employment:local-business";
function originalWords(words: readonly number[]) {
  let index = 0;
  return {
    integer(minInclusive: number, maxExclusive: number) {
      if (
        !Number.isSafeInteger(minInclusive) ||
        !Number.isSafeInteger(maxExclusive) ||
        maxExclusive <= minInclusive
      )
        throw new Error(
          "RNG integer bounds must be safe integers with max greater than min.",
        );
      const range = maxExclusive - minInclusive;
      if (range > 0x100000000)
        throw new Error("RNG integer range must not exceed 2^32 values.");
      const acceptanceLimit = Math.floor(0x100000000 / range) * range;
      let value: number;
      do {
        if (index >= words.length)
          throw Error("Raw local business numeric receipt exhausted");
        value = words[index++]!;
      } while (value >= acceptanceLimit);
      return minInclusive + (value % range);
    },
  };
}

function characterHistoryContextPersonId(
  facts: LocalSeatingFacts,
  key: string,
): EntityId {
  return createStableId("person", facts.id + ":life-context-v1:" + key);
}
// STOPGAP: economy.local-business-flow-drafts
function* aggregateCustomers(
  facts: LocalSeatingFacts,
  id: EntityId,
): Generator<
  LocalSeatingRequest,
  { facts: LocalSeatingFacts; organizationId: EntityId },
  LocalSeatingFacts
> {
  const key = "local-customers:" + id;
  const existing = facts.records.organizations.find((o) => o.stableKey === key);
  if (existing) return { facts, organizationId: existing.id };
  const next = yield {
    kind: "createOrganization",
    input: {
      stableKey: key,
      formedAt: facts.currentDate,
      detailLevel: "lightweight",
      provenance: {
        kind: "authored",
        note: "An aggregate counterparty for what a town's customers spend at its businesses. The game has no individual shoppers and does not pretend to model them.",
      },
      initialProfile: {
        name: "Local customers",
        classification: "custom:aggregate-customers",
        locationJurisdictionId: id,
      },
    },
  };
  return { facts: next, organizationId: next.records.organizations.at(-1)!.id };
}
// STOPGAP: economy.local-business-opening-cap
export function* seatLocalBusinesses(
  facts: LocalSeatingFacts,
  id: EntityId,
): Generator<LocalSeatingRequest, LocalSeatingFacts, LocalSeatingFacts> {
  return yield* seatMissingLocalBusinesses(facts, id);
}
export const FULL_TIME: Omit<TimeDemandProfile, "locationJurisdictionId"> = {
  expectedWeekly: { minimumHours: 35, maximumHours: 45 },
  attention: "moderate",
  concurrency: "mostly-exclusive",
  scheduleRigidity: "rigid",
  interruptibility: "limited",
};
function businessKey(
  jurisdictionId: EntityId,
  kind: LocalBusinessKind,
  index = 0,
) {
  const base = `local-business:${jurisdictionId}:${kind.key}`;
  return index === 0 ? base : `${base}:${index + 1}`;
}
function seatedBusinessKeys(
  facts: LocalSeatingFacts,
  jurisdictionId: EntityId,
): ReadonlySet<string> {
  const prefix = `local-business:${jurisdictionId}:`;
  const keys = new Set<string>();
  for (const record of facts.records.organizations)
    if (record.stableKey.startsWith(prefix)) keys.add(record.stableKey);
  return keys;
}
// STOPGAP: economy.local-formation-age-dates
function yearsBefore(date: IsoDate, years: number): IsoDate {
  return makeIsoDate(
    `${Number(date.slice(0, 4)) - years}${date.slice(4, 7)}-01`,
  );
}
function later(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}
export function* seatMissingLocalBusinesses(
  facts: LocalSeatingFacts,
  jurisdictionId: EntityId,
): Generator<LocalSeatingRequest, LocalSeatingFacts, LocalSeatingFacts> {
  if (!facts.jurisdictions[jurisdictionId]) return facts;
  if (seatedBusinessKeys(facts, jurisdictionId).size > 0) return facts;
  const missing = localBusinessPlansFor(facts.supply, jurisdictionId);
  if (missing.length === 0) return facts;
  const today = facts.currentDate;
  const currency = money(0, LOCAL_BUSINESS_ESTIMATE.currency).currency;
  const provenanceFor = (planned: LocalBusinessPlan) => ({
    kind: "authored" as const,
    note:
      `${planned.estimateBasis ?? "Recorded saved business plan."} Owner draw pending: this legacy organization has no recorded nonpay operating costs/net earnings; modeled revenue and staff wage commitments do not establish distributable profit. ` +
      (planned.sourced
        ? `Local business from published counts: the town's share of the county's establishments (about ${planned.expected!.toFixed(1)} of this kind in town; County Business Patterns 2023), staff from employees per establishment and sales from Economic Census 2022 sales per employee. At most ${LOCAL_BUSINESS_MAX_PER_KIND} of a kind and ${LOCAL_BUSINESS_MAX_STAFF} staff are seated (game assumption, for speed). The owner's draw is not established without recorded operating costs.`
        : `ESTIMATED local business pending research question ${LOCAL_BUSINESS_ESTIMATE.researchQuestionId}.`),
  });
  type Staffing = {
    planned: LocalBusinessPlan;
    kind: LocalBusinessKind;
    formedAt: IsoDate;
    owner: CharacterHistoryContextPersonInput;
    workers: {
      input: CharacterHistoryContextPersonInput;
      since: IsoDate;
    }[];
  };
  const plans: Staffing[] = [];
  const people: CharacterHistoryContextPersonInput[] = [];
  const taken = new Set<string>();
  for (const planned of missing) {
    const { kind } = planned;
    const fork =
      planned.index === 0 ? kind.key : kind.key + ":" + (planned.index + 1);
    const kindRng = originalWords(facts.words.get(fork)!);
    const draw = (role: string, ageRole: InventedPersonRole) => {
      const source = facts.identities.get(localSeatingSourceKey(fork, role));
      if (!source) throw Error("Missing raw WHO identity receipt");
      void ageRole;
      let name = source.names[0]!;
      for (
        let attempt = 1;
        role === "owner" && attempt < 8 && taken.has(name.familyName);
        attempt++
      )
        name = source.names[attempt]!;
      if (role === "owner") taken.add(name.familyName);
      const input: CharacterHistoryContextPersonInput = {
        stableKey:
          businessKey(jurisdictionId, kind, planned.index) + ":" + role,
        ...name,
        identity: source.identity,
        birthDate: source.birthDate,
        homeJurisdictionId: jurisdictionId,
      };
      people.push(input);
      return input;
    };
    const owner = draw("owner", "business-owner");
    const ownerAdult = yearsBefore(owner.birthDate, -22);
    const formedAt = later(
      yearsBefore(today, kindRng.integer(1, 31)),
      ownerAdult,
    );
    const workers = Array.from({ length: planned.workers }, (_, index) => {
      const input = draw(`worker:${index + 1}`, "business-worker");
      const since = later(
        yearsBefore(today, kindRng.integer(0, 6)),
        later(formedAt, yearsBefore(input.birthDate, -16)),
      );
      return { input, since: since > today ? today : since };
    });
    plans.push({
      planned,
      kind,
      formedAt: formedAt > today ? today : formedAt,
      owner,
      workers,
    });
  }
  let next = yield {
    kind: "createCharacterHistoryContextPeople",
    input: people,
  };
  const customers = yield* aggregateCustomers(next, jurisdictionId);
  next = customers.facts;
  const personId = (input: CharacterHistoryContextPersonInput) =>
    characterHistoryContextPersonId(next, input.stableKey);
  const jobs: CreateWorkRelationshipInput[] = [];
  const flows: CreateResourceFlowInput[] = [];
  for (const plan of plans) {
    const key = businessKey(jurisdictionId, plan.kind, plan.planned.index);
    const provenance = provenanceFor(plan.planned);
    next = yield {
      kind: "createOrganization",
      input: {
        stableKey: key,
        formedAt: plan.formedAt,
        detailLevel: "lightweight",
        provenance,
        initialProfile: {
          name: plan.kind.name(plan.owner.familyName),
          classification: plan.kind.classification,
          locationJurisdictionId: jurisdictionId,
        },
      },
    };
    const organizationId = next.records.organizations.at(-1)!.id;
    const business = { kind: "organization" as const, organizationId };
    const ownerId = personId(plan.owner);
    jobs.push({
      stableKey: `${key}:owner:work`,
      personId: ownerId,
      organizationId,
      startedAt: plan.formedAt,
      kind: BUSINESS_OWNER_WORK_KIND,
      compensation: "paid",
      authority: "directs-others",
      dependency: "independent",
      economicRisk: "person-borne",
      provenance,
      initialRole: {
        title: plan.kind.ownerTitle,
        occupationClassification: null,
        locationJurisdictionId: jurisdictionId,
        timeDemand: { ...FULL_TIME, locationJurisdictionId: jurisdictionId },
      },
    });
    flows.push({
      stableKey: `${key}:revenue`,
      source: {
        kind: "organization",
        organizationId: customers.organizationId,
      },
      recipient: business,
      startsAt: today,
      amount: money(plan.planned.monthlyRevenueMinor, currency),
      cadenceKind: "schedule:monthly",
      basisKind: BUSINESS_REVENUE_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId,
      provenance,
    });
    plan.workers.forEach(({ input, since }, index) => {
      const workerId = personId(input);
      jobs.push({
        stableKey: `${key}:worker:${index + 1}:work`,
        personId: workerId,
        organizationId,
        startedAt: since,
        kind: BUSINESS_WORKER_WORK_KIND,
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: plan.kind.workerTitle,
          occupationClassification: plan.kind.workerOccupation,
          locationJurisdictionId: jurisdictionId,
          timeDemand: { ...FULL_TIME, locationJurisdictionId: jurisdictionId },
        },
      });
      flows.push({
        stableKey: `${key}:worker:${index + 1}:wages`,
        source: business,
        recipient: { kind: "person", personId: workerId },
        startsAt: today,
        amount: money(
          localBusinessWageMinor(facts.wage, plan.kind, jurisdictionId)
            .monthlyMinor,
          currency,
        ),
        cadenceKind: "schedule:monthly",
        basisKind: BUSINESS_WAGES_BASIS,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId,
        provenance,
      });
    });
  }
  next = yield {
    kind: "createWorkRelationships",
    input: jobs,
  };
  return yield {
    kind: "createResourceFlows",
    input: flows,
  };
}
