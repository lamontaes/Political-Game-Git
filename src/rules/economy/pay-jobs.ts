/** Full retained payroll startup and teacher raise closures as ordered common-writer requests. */
import { addDays, daysBetween } from "../../simulation/dates";
import { personGender } from "../../simulation/person-identity";
import { money } from "./cost-money";
import { townPayPercentile } from "./town-pay";
import { payPeriodEndingOn } from "./payday-and-shift";
import {
  growingIndex,
  recordsWithFieldValue,
  recordById,
  type GrowingIndexKind,
} from "./raw-record-index";
import {
  townJobRate as rateOf,
  stateMedianAnnualWage as medianOf,
  type WageSourceFacts,
} from "./wage-source";
import { townPayPeriod as periodOf, type PayPeriodFacts } from "./pay-period";
import {
  recordedCredentialHourlyPay as credentialOf,
  resourceFlowTermsAt as flowTermsOf,
  type CredentialPayFacts,
} from "./credential-pay";
import { lawInForce as legalNow, type LawFacts } from "../laws/dated-law";
import { lawEffectStamp } from "../laws/effect-stamp";
import { TOWN_PAY_META } from "../../simulation/living-world/town-pay.generated";
import { TOWN_EMPLOYMENT_VERSION } from "./labor-readings";
import {
  TEACHER_FLOOR_EMPLOYER,
  TEACHER_FLOOR_OCCUPATION,
  type TeacherSalaryFloor,
} from "../laws/teacher-floor";
import type * as life from "../../simulation/life-queries";
import type { publicTaxAccountForIdentity as nativeAccount } from "../../simulation/tax-policy";
import type {
  CreateResourceFlowInput,
  RecordResourceFlowTermsInput,
} from "../../simulation/resources";
import type {
  World,
  EntityId,
  IsoDate,
  WorkRelationship,
  WorkRoleRecord,
  ResourceFlow,
  ResourceFlowTermsRecord,
  PublicGovernmentIdentity,
  HistoricalCutoff,
} from "../../simulation/types";
import type { TownPayPeriod } from "./credential-pay";
export interface PayJobFacts {
  readonly id: EntityId;
  readonly currentDate: IsoDate;
  readonly records: World["history"];
  readonly people: World["people"];
  readonly policyCatalog: World["policyCatalog"];
  readonly wage: WageSourceFacts;
  readonly period: PayPeriodFacts;
  readonly credential: CredentialPayFacts;
  readonly laws: LawFacts;
  readonly profiles: ReadonlyMap<
    EntityId,
    ReturnType<typeof life.organizationProfileAt>
  >;
  readonly statuses: ReadonlyMap<string, ReturnType<typeof life.workStatusAt>>;
  readonly minimums: ReadonlyMap<string, number | null>;
  readonly teacherFloors: ReadonlyMap<string, TeacherSalaryFloor | null>;
  readonly phases: ReadonlyMap<EntityId, number>;
  readonly accounts: ReadonlyMap<string, ReturnType<typeof nativeAccount>>;
}
export type PayJobRequest =
  | {
      readonly kind: "createResourceFlows";
      readonly input: readonly CreateResourceFlowInput[];
    }
  | {
      readonly kind: "recordResourceFlowTerms";
      readonly input: RecordResourceFlowTermsInput;
    }
  | {
      readonly kind: "ensureLocalPublicAccount";
      readonly input: Extract<
        PublicGovernmentIdentity,
        { kind: "local-government" }
      >;
    }
  | { readonly kind: "ensureTaxPublicAccount"; readonly input: EntityId }
  | {
      readonly kind: "attachTermsStamp";
      readonly saved: ResourceFlowTermsRecord;
    };
export const payDateReceiptKey = (id: EntityId | null, date: IsoDate) =>
  JSON.stringify([id, date]);
function receipt<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  if (!map.has(key))
    throw Error("Missing payroll life/source/legal receipt: " + key);
  return map.get(key)!;
}
function organizationProfileAt(facts: PayJobFacts, id: EntityId) {
  return receipt(facts.profiles, id);
}
function currentLifeCutoff(facts: PayJobFacts): HistoricalCutoff {
  return {
    asOfDate: facts.currentDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
function workStatusAt(
  facts: PayJobFacts,
  id: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(facts),
) {
  return receipt(facts.statuses, payDateReceiptKey(id, cutoff.asOfDate));
}
function resourceFlowTermsAt(facts: PayJobFacts, id: EntityId) {
  return flowTermsOf(
    { currentDate: facts.currentDate, records: facts.records },
    id,
  );
}
function recordedCredentialHourlyPay(
  facts: PayJobFacts,
  id: EntityId,
  date: IsoDate,
) {
  return credentialOf(facts.credential, id, date);
}
function townMinimumHourlyAt(
  facts: PayJobFacts,
  id: EntityId | null,
  date: IsoDate,
) {
  return receipt(facts.minimums, payDateReceiptKey(id, date));
}
function stateMedianAnnualWage(
  facts: PayJobFacts,
  occupation: string,
  id: EntityId | null,
) {
  return medianOf(facts.wage, occupation, id);
}
function townJobRate(
  facts: PayJobFacts,
  occupation: string | null,
  id: EntityId | null,
  percentile: number,
  minimum?: number | null,
) {
  return rateOf(facts.wage, occupation, id, percentile, minimum);
}
function townPayPeriod(
  facts: PayJobFacts,
  id: EntityId,
  classification: string,
  staff: number,
) {
  return periodOf(facts.period, id, classification, staff);
}
// STOPGAP: economy.pay-start-native-phase
function nativePhasePosition(facts: PayJobFacts, id: EntityId) {
  return receipt(facts.phases, id);
}
function teacherSalaryFloorAt(
  facts: PayJobFacts,
  id: EntityId | null,
  date: IsoDate,
  _median: number | null,
) {
  void _median;
  return receipt(facts.teacherFloors, payDateReceiptKey(id, date));
}
function lawInForce(
  facts: PayJobFacts,
  id: EntityId,
  q: EntityId,
  date: IsoDate,
) {
  return legalNow(facts.laws, id, q, date);
}
function publicTaxAccountForIdentity(
  facts: PayJobFacts,
  identity: PublicGovernmentIdentity,
) {
  return receipt(facts.accounts, JSON.stringify(identity));
}
export const TOWN_PAY_VERSION = "town-pay-v2";
const PAY_KEY_PREFIX = `${TOWN_PAY_VERSION}:job-pay:`;
const HOURS_PER_YEAR = 2080;
const CATCH_UP_LIMIT_DAYS = 400;
const PERIODS_PER_YEAR: Readonly<Record<TownPayPeriod, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};
function statusOn(facts: PayJobFacts, workId: EntityId, date: IsoDate) {
  return workStatusAt(facts, workId, {
    ...currentLifeCutoff(facts),
    asOfDate: date,
  });
}
const DEATH_DATES: GrowingIndexKind<Map<EntityId, IsoDate>> = {
  create: () => new Map(),
  add: (dates, record) => {
    const death = record as PayJobFacts["records"]["personDeaths"][number];
    dates.set(death.personId, death.diedAt);
  },
};
function deathDates(facts: PayJobFacts): ReadonlyMap<EntityId, IsoDate> {
  return growingIndex(DEATH_DATES, facts.records.personDeaths);
}
// STOPGAP: economy.pay-job-profile-history-frontier
function latestRoles(
  facts: PayJobFacts,
): ReadonlyMap<EntityId, WorkRoleRecord> {
  const roles = new Map<EntityId, WorkRoleRecord>();
  for (const role of facts.records.workRoles)
    roles.set(role.workRelationshipId, role);
  return roles;
}
export function weeklyHoursOf(role: WorkRoleRecord): number {
  const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
  return (minimumHours + maximumHours) / 2;
}
const PAY_FLOWS: GrowingIndexKind<ResourceFlow[]> = {
  create: () => [],
  add: (flows, record) => {
    const flow = record as ResourceFlow;
    if (flow.stableKey.startsWith(PAY_KEY_PREFIX)) flows.push(flow);
  },
};
function townPayFlows(facts: PayJobFacts): readonly ResourceFlow[] {
  return growingIndex(PAY_FLOWS, facts.records.resourceFlows);
}
function termsByPayFlow(
  facts: PayJobFacts,
): ReadonlyMap<EntityId, readonly ResourceFlowTermsRecord[]> {
  const byFlow = new Map<EntityId, readonly ResourceFlowTermsRecord[]>();
  for (const flow of townPayFlows(facts)) {
    const terms = recordsWithFieldValue(
      facts.records.resourceFlowTerms,
      "resourceFlowId",
      flow.id,
    );
    if (terms.length > 0) byFlow.set(flow.id, terms);
  }
  return byFlow;
}
interface PayNote {
  readonly period: TownPayPeriod;
  readonly phase: number;
}
function payNoteOf(cadenceKind: string): PayNote | null {
  const match =
    /^schedule:town-(weekly|biweekly|semimonthly|monthly)(?:-(\d))?$/.exec(
      cadenceKind,
    );
  if (!match) return null;
  return {
    period: match[1] as TownPayPeriod,
    phase: Number(match[2] ?? 0),
  };
}
export function* startTownJobPay(
  facts: PayJobFacts,
  exceptPersonId: EntityId | null,
  since: IsoDate,
): Generator<PayJobRequest, PayJobFacts, PayJobFacts> {
  let next = facts;
  const paid = new Set<EntityId>();
  for (const flow of facts.records.resourceFlows)
    if (flow.basisReference.kind === "work")
      paid.add(flow.basisReference.workRelationshipId);
  const roles = latestRoles(facts);
  const dead = deathDates(facts);
  const staff = new Map<EntityId, number>();
  const candidates: WorkRelationship[] = [];
  for (const work of facts.records.workRelationships) {
    if (
      !work.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) ||
      work.compensation !== "paid" ||
      !work.organizationId ||
      statusOn(facts, work.id, facts.currentDate)?.status !== "active"
    )
      continue;
    staff.set(work.organizationId, (staff.get(work.organizationId) ?? 0) + 1);
    if (
      work.personId === exceptPersonId ||
      paid.has(work.id) ||
      dead.has(work.personId)
    )
      continue;
    candidates.push(work);
  }
  const inputs: CreateResourceFlowInput[] = [];
  const floorLaws = anyTeacherFloorLawEnacted(facts);
  let coveredMen: ReadonlySet<EntityId> | null = null;
  const periods = new Map<EntityId, TownPayPeriod>();
  for (const flow of facts.records.resourceFlows) {
    if (
      !flow.stableKey.startsWith(PAY_KEY_PREFIX) ||
      flow.source.kind !== "organization"
    )
      continue;
    const terms = resourceFlowTermsAt(facts, flow.id);
    const note = terms ? payNoteOf(terms.cadenceKind) : null;
    if (note) {
      const employer =
        flow.basisReference.kind === "work"
          ? recordById(
              facts.records.workRelationships,
              flow.basisReference.workRelationshipId,
            )?.organizationId
          : null;
      periods.set(employer ?? flow.source.organizationId, note.period);
    }
  }
  for (const work of candidates) {
    const role = roles.get(work.id);
    if (!role) continue;
    const payer = yield* townPaySource(next, work.organizationId!);
    next = payer.facts;
    const earliest = addDays(since, -31);
    const formedAt =
      facts.records.organizations.find(
        (organization) => organization.id === work.organizationId,
      )?.formedAt ?? work.startedAt;
    const payerFormedAt = recordById(
      next.records.organizations,
      payer.organizationId,
    )!.formedAt;
    const startsAt = [work.startedAt, earliest, formedAt, payerFormedAt].reduce(
      (a, b) => (a > b ? a : b),
    );
    const tenure = daysBetween(work.startedAt, startsAt) / 365.25;
    const minimum = townMinimumHourlyAt(
      facts,
      role.locationJurisdictionId,
      startsAt,
    );
    const baseline = townJobRate(
      facts,
      role.occupationClassification,
      role.locationJurisdictionId,
      townPayPercentile(tenure),
      minimum,
    );
    if (!baseline) continue;
    const credentialPay = recordedCredentialHourlyPay(facts, work.id, startsAt);
    const offered = credentialPay
      ? {
          ...baseline,
          hourlyMinor: Math.max(
            credentialPay.hourlyMinor,
            Math.round((minimum ?? 0) * 100),
          ),
          floored: credentialPay.hourlyMinor < Math.round((minimum ?? 0) * 100),
        }
      : baseline;
    coveredMen ??= menPartneredWithMen(facts, facts.currentDate);
    const paid = coveredMen.has(work.personId)
      ? payAtHire(facts, {
          personId: work.personId,
          jobJurisdictionId: role.locationJurisdictionId,
          date: startsAt,
          amountMinor: offered.hourlyMinor,
          floorMinor: (minimum ?? 0) * 100,
        })
      : null;
    const gap = paid?.belowRate === true;
    const rate = gap ? { ...offered, hourlyMinor: paid.amountMinor } : offered;
    const organizationId = work.organizationId!;
    const floor = floorLaws
      ? teacherFloorFor(facts, role, organizationId, startsAt)
      : null;
    const floorHourlyMinor = floor ? floorHourlyMinorOf(floor) : 0;
    const hourlyMinor = Math.max(rate.hourlyMinor, floorHourlyMinor);
    let period = periods.get(organizationId);
    if (!period) {
      const profile = organizationProfileAt(facts, organizationId);
      period = townPayPeriod(
        facts,
        organizationId,
        profile?.classification ?? "",
        staff.get(organizationId) ?? 1,
      );
      periods.set(organizationId, period);
    }
    const phase =
      period === "biweekly"
        ? Math.floor(nativePhasePosition(facts, organizationId) * 2)
        : 0;
    const weeklyHours = weeklyHoursOf(role);
    const perPeriod = Math.round(
      (hourlyMinor * weeklyHours * 52) / PERIODS_PER_YEAR[period],
    );
    if (perPeriod <= 0) continue;
    inputs.push({
      stableKey: `${PAY_KEY_PREFIX}${work.id}`,
      source: { kind: "organization", organizationId: payer.organizationId },
      recipient: { kind: "person", personId: work.personId },
      startsAt,
      amount: money(perPeriod, "USD"),
      cadenceKind: `schedule:town-${period}${period === "biweekly" ? `-${phase}` : ""}`,
      basisKind: "compensation:work",
      basisReference: { kind: "work", workRelationshipId: work.id },
      restrictionKind: null,
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: `${TOWN_PAY_VERSION}: $${(hourlyMinor / 100).toFixed(2)} an hour${hourlyMinor > rate.hourlyMinor ? " (the state's minimum teacher salary)" : rate.floored ? " (the minimum wage)" : ""}${gap && hourlyMinor === rate.hourlyMinor ? `, ${UNCOVERED_PAY_NOTE}` : ""} for ${weeklyHours} hours a week, paid ${period}; ${credentialPay ? `ESTIMATED FROM AVERAGE of ${credentialPay.peerCount} paid same-occupation/workplace credential peers; source records ${credentialPay.sourceRecordIds.join(", ")}` : `the ${Math.round(rate.percentile)}th percentile for SOC ${rate.soc} in OEWS area ${rate.area} (${TOWN_PAY_META.wages})`}.`,
      },
    });
  }
  return yield {
    kind: "createResourceFlows",
    input: inputs,
  };
}
export function* townPaySource(
  facts: PayJobFacts,
  employerId: EntityId,
): Generator<
  PayJobRequest,
  {
    readonly facts: PayJobFacts;
    readonly organizationId: EntityId;
  },
  PayJobFacts
> {
  const profile = organizationProfileAt(facts, employerId);
  if (!profile)
    throw new Error("A payroll employer needs its recorded profile.");
  const identity = profile.publicGovernmentIdentity;
  if (!identity) return { facts, organizationId: employerId };
  const next =
    identity.kind === "local-government"
      ? yield {
          kind: "ensureLocalPublicAccount",
          input: identity,
        }
      : yield {
          kind: "ensureTaxPublicAccount",
          input: identity.jurisdictionId,
        };
  const account = publicTaxAccountForIdentity(next, identity);
  if (!account)
    throw new Error(
      "The recorded payroll government has no canonical public account.",
    );
  return { facts: next, organizationId: account.organizationId };
}
const JOB_ENDINGS: GrowingIndexKind<Map<EntityId, IsoDate>> = {
  create: () => new Map(),
  add: (index, record) => {
    const status = record as PayJobFacts["records"]["workStatuses"][number];
    if (status.status === "ended")
      index.set(status.workRelationshipId, status.effectiveAt);
    else index.delete(status.workRelationshipId);
  },
};
const LAST_PERIOD_PAID: GrowingIndexKind<Map<EntityId, IsoDate>> = {
  create: () => new Map(),
  add: (index, record) => {
    const outcome =
      record as PayJobFacts["records"]["resourceTransferOutcomes"][number];
    const previous = index.get(outcome.resourceFlowId);
    if (!previous || previous < outcome.periodEndsAt)
      index.set(outcome.resourceFlowId, outcome.periodEndsAt);
  },
};
function teacherFloorFor(
  facts: PayJobFacts,
  role: WorkRoleRecord,
  organizationId: EntityId,
  onDate: IsoDate,
): TeacherSalaryFloor | null {
  if (role.occupationClassification !== TEACHER_FLOOR_OCCUPATION) return null;
  if (
    organizationProfileAt(facts, organizationId)?.classification !==
    TEACHER_FLOOR_EMPLOYER
  )
    return null;
  return teacherSalaryFloorAt(
    facts,
    role.locationJurisdictionId,
    onDate,
    stateMedianAnnualWage(
      facts,
      TEACHER_FLOOR_OCCUPATION,
      role.locationJurisdictionId,
    ),
  );
}
function floorHourlyMinorOf(floor: TeacherSalaryFloor): number {
  return Math.round((floor.annual / HOURS_PER_YEAR) * 100);
}
// STOPGAP: economy.pay-teacher-reprise-window
export function* raiseTeacherPayToFloor(
  facts: PayJobFacts,
  exceptPersonId: EntityId | null,
): Generator<PayJobRequest, PayJobFacts, PayJobFacts> {
  if (!anyTeacherFloorLawEnacted(facts)) return facts;
  const designationOf = new Map<EntityId, string>();
  for (const measure of facts.records.legislativeMeasures ?? [])
    designationOf.set(measure.id, measure.designation);
  const eventOf = new Map<EntityId, EntityId>();
  for (const enactment of facts.records.legislativeEnactments ?? [])
    eventOf.set(enactment.measureId, enactment.outcomeEventId);
  const roles = latestRoles(facts);
  const termsByFlow = termsByPayFlow(facts);
  const endedOn = growingIndex(JOB_ENDINGS, facts.records.workStatuses);
  const lastPaid = growingIndex(
    LAST_PERIOD_PAID,
    facts.records.resourceTransferOutcomes,
  );
  let next = facts;
  for (const flow of townPayFlows(facts)) {
    if (
      flow.basisReference.kind !== "work" ||
      flow.source.kind !== "organization" ||
      (flow.recipient.kind === "person" &&
        flow.recipient.personId === exceptPersonId)
    )
      continue;
    const role = roles.get(flow.basisReference.workRelationshipId);
    if (!role || role.occupationClassification !== TEACHER_FLOOR_OCCUPATION)
      continue;
    const organizationId = recordById(
      facts.records.workRelationships,
      flow.basisReference.workRelationshipId,
    )?.organizationId;
    if (!organizationId) continue;
    let current = termsByFlow.get(flow.id)?.at(-1);
    const note = current ? payNoteOf(current.cadenceKind) : null;
    if (!current || current.status !== "active" || !note) continue;
    const weeklyHours = weeklyHoursOf(role);
    const after = [
      current.effectiveAt,
      lastPaid.get(flow.id) ?? current.effectiveAt,
      addDays(facts.currentDate, -CATCH_UP_LIMIT_DAYS),
    ].reduce((a, b) => (a > b ? a : b));
    for (
      let day = addDays(after, 1);
      day <= facts.currentDate;
      day = addDays(day, 1)
    ) {
      if (!payPeriodEndingOn(note.period, addDays(day, -1), note.phase))
        continue;
      const ended = endedOn.get(flow.basisReference.workRelationshipId);
      if (ended !== undefined && ended <= day) break;
      const floor = teacherFloorFor(next, role, organizationId, day);
      if (!floor) continue;
      const amount = Math.round(
        (floorHourlyMinorOf(floor) * weeklyHours * 52) /
          PERIODS_PER_YEAR[note.period],
      );
      if (amount <= current.amount.minorUnits) continue;
      const designation = designationOf.get(floor.measureId) ?? "A state law";
      const event = eventOf.get(floor.measureId);
      const salary = `$${floor.annual.toLocaleString("en-US")} a year`;
      next = yield {
        kind: "recordResourceFlowTerms",
        input: {
          stableKey: `${flow.stableKey}:teacher-floor:${day}`,
          resourceFlowId: flow.id,
          effectiveAt: day,
          status: "active",
          amount: money(amount, current.amount.currency),
          cadenceKind: current.cadenceKind,
          reason: `${designation} set the state's minimum teacher salary at ${salary}.`,
          provenance: event
            ? { kind: "simulated-event", eventId: event }
            : {
                kind: "authored",
                note: `${TOWN_PAY_VERSION}: raised to the minimum teacher salary ${designation} set, ${salary}.`,
              },
          supersedesTermsId: current.id,
        },
      };
      current = next.records.resourceFlowTerms.at(-1)!;
      const proposition = Object.values(next.policyCatalog.propositions).find(
        (row) => row.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
      );
      const jurisdictionId = role.locationJurisdictionId;
      const governing =
        proposition && jurisdictionId
          ? lawInForce(next, jurisdictionId, proposition.id, floor.from)
          : null;
      const stamp =
        governing?.measureId === floor.measureId && jurisdictionId
          ? lawEffectStamp(governing, {
              effectKind: "pay",
              questionKey: TEACHER_SALARY_FLOOR_QUESTION,
              jurisdictionId,
              appliedAt: day,
              sourceRecordIds: [flow.id, role.workRelationshipId, current.id],
            })
          : null;
      if (stamp) {
        // STOPGAP: economy.pay-teacher-stamp-receipt
        const saved = { ...current, lawEffectStamps: [stamp] };
        next = yield {
          kind: "attachTermsStamp",
          saved,
        };
        current = saved;
      }
    }
  }
  return next;
}
export const TEACHER_SALARY_FLOOR_QUESTION =
  "us-policy-positions:education.raise-teacher-minimum-salary";
const propositionIds = new WeakMap<object, EntityId | null>();
function teacherFloorProposition(facts: PayJobFacts): EntityId | null {
  const catalog = facts.policyCatalog;
  if (!catalog) return null;
  const cached = propositionIds.get(catalog);
  if (cached !== undefined) return cached;
  const found =
    catalog.propositionOrder.find(
      (id) =>
        catalog.propositions[id]?.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
    ) ?? null;
  propositionIds.set(catalog, found);
  return found;
}
export function anyTeacherFloorLawEnacted(facts: PayJobFacts): boolean {
  return teacherFloorProposition(facts) !== null;
}
export function menPartneredWithMen(
  facts: PayJobFacts,
  date: IsoDate,
  only?: EntityId,
): ReadonlySet<EntityId> {
  const partnerships = (facts.records.partnerships ?? []).filter(
    (row) => only === undefined || row.personIds.includes(only),
  );
  const ids = new Set(partnerships.map((row) => row.id));
  const latest = new Map<
    EntityId,
    {
      at: IsoDate;
      seq: number;
      active: boolean;
    }
  >();
  for (const state of facts.records.partnershipStates ?? []) {
    if (state.effectiveAt > date || !ids.has(state.partnershipId)) continue;
    const seen = latest.get(state.partnershipId);
    if (
      !seen ||
      state.effectiveAt > seen.at ||
      (state.effectiveAt === seen.at && state.sequence > seen.seq)
    )
      latest.set(state.partnershipId, {
        at: state.effectiveAt,
        seq: state.sequence,
        active: state.status === "active",
      });
  }
  const men = new Set<EntityId>();
  for (const partnership of partnerships) {
    if (partnership.startedAt > date) continue;
    if (!latest.get(partnership.id)?.active) continue;
    const [a, b] = partnership.personIds;
    if (
      personGender(facts.people[a]) === "male" &&
      personGender(facts.people[b]) === "male"
    ) {
      men.add(a);
      men.add(b);
    }
  }
  return men;
}
export const UNCOVERED_PAY_NOTE = "";
// STOPGAP: economy.pay-start-coverage-English
export function payAtHire(
  _world: PayJobFacts,
  input: {
    readonly personId: EntityId;
    readonly jobJurisdictionId: EntityId | null;
    readonly date: IsoDate;
    readonly amountMinor: number;
    readonly floorMinor: number;
  },
): {
  readonly amountMinor: number;
  readonly belowRate: boolean;
} {
  void _world;
  return { amountMinor: input.amountMinor, belowRate: false };
}
