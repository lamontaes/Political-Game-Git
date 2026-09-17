import { createStableId } from "../ids";
import { addDays, daysBetween } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { stateJurisdictionForKey } from "../life-places";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { createWorkItem, workItemState } from "../time-work";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "../municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalStanding,
} from "../municipal-public-work";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import {
  PUBLIC_PROGRAM_EVENT_PREFIX,
  publicProgramRecordId,
  publicProgramRecords,
} from "../public-program-integrity";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  MoneyAmount,
  PublicProgramAppropriationRecord,
  PublicProgramBasis,
  PublicProgramCapacityOutturnRecord,
  PublicProgramCapacityRecord,
  PublicProgramCommitmentRecord,
  PublicProgramInstallmentRecord,
  PublicProgramPurpose,
  PublicProgramRecord,
  World,
  WorkItemStateRecord,
} from "../types";

/**
 * GOVERNING 6 — public programs: appropriation, commitment, installment and
 * capacity outturn, kept apart.
 *
 * An appropriation is spending authority on an existing public account, not
 * cash. An office with the standing to decide commits part of it to one
 * alternative, including committing nothing. Each installment posts on its
 * due date only if the authority still holds and the account actually has the
 * cash; otherwise it fails and says why. Maintenance returns units to service
 * after its delivery lead, and only as far as a declared restoration cost
 * supports; without one the outturn says the number is unknown. Nothing here
 * turns a decision into a promised percentage of better service.
 */

export const PUBLIC_PROGRAM_VERSION = "public-program/v1";
export const PUBLIC_PROGRAM_INSTALLMENT = "public-program:installment";
export const PUBLIC_PROGRAM_DELIVERY = "public-program:delivery";

export interface PublicProgramAlternativeInstallment {
  /** Days after the decision; 0 posts on the day of the decision. */
  readonly afterDays: number;
  readonly amount: MoneyAmount;
  readonly purpose: PublicProgramPurpose;
}

/** One option an office can choose. Supplied by the caller, never a default. */
export interface PublicProgramAlternative {
  readonly key: string;
  readonly title: string;
  readonly installments: readonly PublicProgramAlternativeInstallment[];
  readonly deliveryLeadDays: number | null;
}

export type PublicProgramOffice =
  | { readonly kind: "state-executive" }
  | { readonly kind: "municipal"; readonly governmentKey: string };

export type PublicProgramResult =
  | { readonly ok: true; readonly world: World; readonly recordId: EntityId }
  | { readonly ok: false; readonly world: World; readonly reason: string };

type NewRecord = PublicProgramRecord extends infer R
  ? R extends PublicProgramRecord
    ? Omit<R, "id" | "sequence" | "recordedAt" | "eventId" | "stableKey">
    : never
  : never;

function append(
  world: World,
  stableKey: string,
  eventId: EntityId,
  record: NewRecord,
): { world: World; id: EntityId } {
  const id = publicProgramRecordId(world, stableKey);
  const full = {
    ...record,
    id,
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    eventId,
  } as PublicProgramRecord;
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      publicProgramRecords: [...publicProgramRecords(world), full],
    },
  };
  assertWorldIntegrity(next);
  return { world: next, id };
}

function writeEvent(
  world: World,
  input: {
    readonly stableKey: string;
    readonly kind: PublicProgramRecord["kind"];
    readonly jurisdictionId: EntityId;
    readonly involved: readonly EntityId[];
    readonly participant: EntityId | null;
    readonly visibility: "public" | "private";
    readonly programKey: string;
    readonly summary: string;
  },
): World {
  const involved = [
    ...new Set([
      ...input.involved,
      ...(input.participant ? [input.participant] : []),
    ]),
  ].sort();
  return recordWorldEvent(world, {
    stableKey: `event:${input.stableKey}`,
    type: `${PUBLIC_PROGRAM_EVENT_PREFIX}${input.kind}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: involved,
    participants: input.participant
      ? [
          {
            personId: input.participant,
            role: "agency:public-program",
            detail: "Made the recorded program decision.",
          },
        ]
      : [],
    personFactConstraints: [],
    visibility: input.visibility,
    tags: ["fiscal", `program:${input.programKey}`],
    summary: input.summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function writeRecord(
  world: World,
  stableKey: string,
  event: Parameters<typeof writeEvent>[1],
  record: NewRecord,
): { world: World; id: EntityId } {
  const withEvent = writeEvent(world, event);
  return append(
    withEvent,
    stableKey,
    withEvent.history.events.at(-1)!.id,
    record,
  );
}

export function dollars(amount: MoneyAmount): string {
  return (amount.minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: amount.currency,
    maximumFractionDigits: amount.minorUnits % 100 === 0 ? 0 : 2,
  });
}

function key(programKey: string, ...parts: readonly string[]): string {
  return [PUBLIC_PROGRAM_VERSION, programKey, ...parts].join(":");
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

function ofKind<K extends PublicProgramRecord["kind"]>(
  world: World,
  programKey: string,
  kind: K,
): readonly Extract<PublicProgramRecord, { kind: K }>[] {
  return publicProgramRecords(world).filter(
    (record): record is Extract<PublicProgramRecord, { kind: K }> =>
      record.kind === kind && record.programKey === programKey,
  );
}

export function programCapacity(
  world: World,
  programKey: string,
): PublicProgramCapacityRecord | null {
  return ofKind(world, programKey, "capacity").at(-1) ?? null;
}

export function programAppropriations(
  world: World,
  programKey: string,
): readonly PublicProgramAppropriationRecord[] {
  return ofKind(world, programKey, "appropriation");
}

export function programCommitments(
  world: World,
  programKey: string,
): readonly PublicProgramCommitmentRecord[] {
  return ofKind(world, programKey, "commitment");
}

export function programInstallments(
  world: World,
  programKey: string,
): readonly PublicProgramInstallmentRecord[] {
  return ofKind(world, programKey, "installment");
}

export function programOutturns(
  world: World,
  programKey: string,
): readonly PublicProgramCapacityOutturnRecord[] {
  return ofKind(world, programKey, "capacity-outturn");
}

/** Every program this World has declared, for readers such as CHANGE. */
export function publicProgramKeys(world: World): readonly string[] {
  return [
    ...new Set(publicProgramRecords(world).map((record) => record.programKey)),
  ];
}

function committedAgainst(world: World, appropriationId: EntityId): number {
  return publicProgramRecords(world)
    .filter(
      (record): record is PublicProgramCommitmentRecord =>
        record.kind === "commitment" &&
        record.appropriationId === appropriationId,
    )
    .reduce(
      (total, record) =>
        total +
        record.installments.reduce(
          (sum, plan) => sum + plan.amount.minorUnits,
          0,
        ),
      0,
    );
}

export interface PublicProgramPosition {
  readonly programKey: string;
  readonly appropriated: MoneyAmount;
  readonly committed: MoneyAmount;
  readonly uncommitted: MoneyAmount;
  readonly posted: MoneyAmount;
  readonly failedInstallments: number;
  readonly pendingInstallments: number;
  /** The latest recorded operational count: declared, or after delivered work. */
  readonly unitsOperational: number | null;
  readonly unitsTotal: number | null;
  /** Operating money posted, in months of the declared need, to one decimal. */
  readonly operatingMonthsPosted: string | null;
}

/** Where the program stands, read only from its records. */
export function programPosition(
  world: World,
  programKey: string,
  appropriationId?: EntityId,
): PublicProgramPosition {
  const appropriations = programAppropriations(world, programKey).filter(
    (record) => !appropriationId || record.id === appropriationId,
  );
  const appropriated = appropriations.reduce(
    (total, record) => total + record.amount.minorUnits,
    0,
  );
  const committed = appropriations.reduce(
    (total, record) => total + committedAgainst(world, record.id),
    0,
  );
  const commitments = programCommitments(world, programKey).filter((record) =>
    appropriations.some((a) => a.id === record.appropriationId),
  );
  const installments = programInstallments(world, programKey).filter((record) =>
    commitments.some((c) => c.id === record.commitmentId),
  );
  let posted = 0;
  let operating = 0;
  for (const record of installments) {
    if (record.status !== "posted") continue;
    const plan = commitments.find((c) => c.id === record.commitmentId)!
      .installments[record.installmentIndex]!;
    posted += plan.amount.minorUnits;
    if (plan.purpose === "operating") operating += plan.amount.minorUnits;
  }
  const scheduled = commitments.reduce(
    (total, record) => total + record.installments.length,
    0,
  );
  const capacity = programCapacity(world, programKey);
  const latestOutturn = programOutturns(world, programKey).at(-1);
  return {
    programKey,
    appropriated: money(appropriated, "USD"),
    committed: money(committed, "USD"),
    uncommitted: money(appropriated - committed, "USD"),
    posted: money(posted, "USD"),
    failedInstallments: installments.filter((r) => r.status === "failed")
      .length,
    pendingInstallments: scheduled - installments.length,
    unitsOperational:
      latestOutturn?.unitsOperational ?? capacity?.unitsOperational ?? null,
    unitsTotal: capacity?.unitsTotal ?? null,
    operatingMonthsPosted: capacity
      ? (operating / capacity.monthlyOperatingNeed.minorUnits).toFixed(1)
      : null,
  };
}

// ---------------------------------------------------------------------------
// Declarations
// ---------------------------------------------------------------------------

/** Declares what a service has to work with. Labelled by its basis. */
export function declareProgramCapacity(
  world: World,
  input: Omit<
    PublicProgramCapacityRecord,
    "id" | "sequence" | "recordedAt" | "eventId" | "stableKey" | "kind"
  > & { readonly edition: string },
): { world: World; id: EntityId } {
  return writeRecord(
    world,
    key(input.programKey, "capacity", input.edition),
    {
      stableKey: key(input.programKey, "capacity", input.edition),
      kind: "capacity",
      jurisdictionId: input.jurisdictionId,
      involved: [input.jurisdictionId],
      participant: null,
      visibility: "public",
      programKey: input.programKey,
      summary: `${input.serviceLabel}: ${input.unitsOperational} of ${input.unitsTotal} ${input.unitLabel} in service; ${dollars(input.monthlyOperatingNeed)} a month to operate.`,
    },
    { kind: "capacity", ...stripEdition(input) },
  );
}

function stripEdition<T extends { readonly edition: string }>(
  input: T,
): Omit<T, "edition"> {
  return Object.fromEntries(
    Object.entries(input).filter(([name]) => name !== "edition"),
  ) as Omit<T, "edition">;
}

/** Records spending authority on an existing public account. Not cash. */
export function recordProgramAppropriation(
  world: World,
  input: {
    readonly programKey: string;
    readonly jurisdictionId: EntityId;
    readonly accountOrganizationId: EntityId;
    readonly amount: MoneyAmount;
    readonly availableFrom: IsoDate;
    readonly availableThrough: IsoDate;
    readonly basis: PublicProgramBasis;
    readonly sourceMeasureId?: EntityId | null;
    readonly edition: string;
  },
): { world: World; id: EntityId } {
  const stableKey = key(input.programKey, "appropriation", input.edition);
  return writeRecord(
    world,
    stableKey,
    {
      stableKey,
      kind: "appropriation",
      jurisdictionId: input.jurisdictionId,
      involved: [input.accountOrganizationId],
      participant: null,
      visibility: "public",
      programKey: input.programKey,
      summary: `${dollars(input.amount)} may be committed for ${input.programKey} from ${input.availableFrom} through ${input.availableThrough}. Authority to spend is not cash.`,
    },
    { kind: "appropriation", ...stripEdition(input) },
  );
}

// ---------------------------------------------------------------------------
// Authority
// ---------------------------------------------------------------------------

export type ProgramAuthority =
  | { readonly status: "available"; readonly basis: string }
  | { readonly status: "unavailable"; readonly reason: string }
  | { readonly status: "unknown"; readonly reason: string };

/** Whether this person's office may commit this appropriation, and why. */
export function programAuthority(
  world: World,
  personId: EntityId,
  office: PublicProgramOffice,
  appropriation: PublicProgramAppropriationRecord,
): ProgramAuthority {
  if (office.kind === "state-executive") {
    const holder = currentStateExecutiveHolders(world).find(
      (record) =>
        stateJurisdictionForKey(`US-${record.stateUsps}`)?.id ===
        appropriation.jurisdictionId,
    );
    if (!holder)
      return {
        status: "unavailable",
        reason: "This appropriation does not belong to a state governorship.",
      };
    return holder.personId === personId
      ? {
          status: "available",
          basis: `${holder.title}: executes appropriations the office receives (${PUBLIC_PROGRAM_VERSION} game profile).`,
        }
      : {
          status: "unavailable",
          reason: `Only the sitting ${holder.title} commits this appropriation.`,
        };
  }
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    office.governmentKey,
  );
  if (jurisdictionId !== appropriation.jurisdictionId)
    return {
      status: "unavailable",
      reason: "This appropriation belongs to another government.",
    };
  const standing = municipalStanding(world, {
    governmentKey: office.governmentKey,
    personId,
    residentPlaceGeoid: null,
  });
  const government = municipalGovernmentByKey(office.governmentKey);
  const reading = government ? primaryReading(government) : null;
  if (!reading)
    return {
      status: "unknown",
      reason: "This government's own record is not compiled.",
    };
  // Who executes an adopted budget is a fact about this government. Where the
  // record names the role, it decides; where it shows a manager, the manager
  // administers and a mayor's title alone does not; where it shows neither,
  // the game says so instead of choosing.
  const namedExecutor = reading.budget?.prepares?.join(" ").toLowerCase() ?? "";
  const hasManager = reading.manager !== null;
  const strongMayor =
    reading.mayor?.structuralPosition === "SEPARATE_CHIEF_EXECUTIVE" ||
    reading.form === "MAYOR_COUNCIL";
  const isManager = standing.roles.includes("professional-manager");
  const isMayor = standing.roles.includes("mayor");
  const basis = (role: string, why: string) => ({
    status: "available" as const,
    basis: `${role}: ${why} (${PUBLIC_PROGRAM_VERSION} game profile over ${office.governmentKey}'s compiled record).`,
  });
  if (namedExecutor.includes("manager") && isManager)
    return basis(
      reading.manager?.title ?? "Manager",
      "the record names this role as preparing the budget",
    );
  if (namedExecutor.includes("mayor") && isMayor)
    return basis("Mayor", "the record names the mayor as preparing the budget");
  if (hasManager)
    return isManager
      ? basis(
          reading.manager?.title ?? "Manager",
          "this government has an appointed manager who administers the adopted budget",
        )
      : {
          status: "unavailable",
          reason: `${office.governmentKey} has ${reading.manager?.title ?? "a manager"}, who administers the adopted budget. A mayor or member does not commit it here.`,
        };
  if (strongMayor && isMayor)
    return basis(
      "Mayor",
      "the record shows a separately elected chief executive",
    );
  if (
    standing.roles.some(
      (role) => role === "member" || role === "presiding-member",
    )
  )
    return {
      status: "unavailable",
      reason:
        "A council seat votes on the budget; committing adopted money belongs to the executive.",
    };
  if (standing.roles.length === 0)
    return {
      status: "unavailable",
      reason: "This person holds no office in this government.",
    };
  return {
    status: "unknown",
    reason: `Whether ${office.governmentKey}'s ${standing.roles[0]} commits adopted money is not compiled: the record shows no manager and no separately elected executive.`,
  };
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

export interface PublicProgramForecast {
  readonly alternativeKey: string;
  readonly total: MoneyAmount;
  readonly affordable: boolean;
  readonly uncommittedAfter: MoneyAmount;
  readonly cashNow: MoneyAmount | null;
  readonly operatingMonths: string | null;
  readonly unitsRestored: number | null;
  readonly readyOn: IsoDate | null;
  /** Known arithmetic and what stays uncertain, in plain sentences. */
  readonly lines: readonly string[];
}

/** Arithmetic from the declared capacity. No invented response curve. */
export function forecastProgramAlternative(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
  alternative: PublicProgramAlternative,
): PublicProgramForecast {
  const capacity = programCapacity(world, appropriation.programKey);
  const total = alternative.installments.reduce(
    (sum, plan) => sum + plan.amount.minorUnits,
    0,
  );
  const uncommitted =
    appropriation.amount.minorUnits - committedAgainst(world, appropriation.id);
  const position = resourcePositionAt(
    world,
    {
      kind: "organization",
      organizationId: appropriation.accountOrganizationId,
    },
    appropriation.amount.currency,
  );
  const cashNow = position ? position.liquidBalance : null;
  const operating = alternative.installments
    .filter((plan) => plan.purpose === "operating")
    .reduce((sum, plan) => sum + plan.amount.minorUnits, 0);
  const maintenance = alternative.installments
    .filter((plan) => plan.purpose === "maintenance")
    .reduce((sum, plan) => sum + plan.amount.minorUnits, 0);
  const lines: string[] = [];
  const operatingMonths = capacity
    ? (operating / capacity.monthlyOperatingNeed.minorUnits).toFixed(1)
    : null;
  let unitsRestored: number | null = null;
  if (total === 0) {
    lines.push(
      "Commits nothing. The service keeps what it has now; no new money moves.",
    );
  } else {
    lines.push(
      `Commits ${dollars(money(total, "USD"))} of the ${dollars(money(uncommitted, "USD"))} still uncommitted.`,
    );
    if (capacity && operating > 0)
      lines.push(
        `Covers ${operatingMonths} months of the declared ${dollars(capacity.monthlyOperatingNeed)} monthly operating need, paid as each month falls due.`,
      );
    if (capacity && maintenance > 0) {
      const idle = capacity.unitsTotal - capacity.unitsOperational;
      if (capacity.restorationCostPerUnit) {
        unitsRestored = Math.min(
          idle,
          Math.floor(maintenance / capacity.restorationCostPerUnit.minorUnits),
        );
        lines.push(
          `At the declared ${dollars(capacity.restorationCostPerUnit)} per unit, returns up to ${unitsRestored} of ${idle} idle ${capacity.unitLabel} to service${alternative.deliveryLeadDays ? ` about ${alternative.deliveryLeadDays} days after payment` : ""}.`,
        );
      } else
        lines.push(
          `No restoration cost is declared, so how many idle ${capacity.unitLabel} return is unknown.`,
        );
    }
  }
  if (capacity?.completedPermille !== null && capacity)
    lines.push(
      `Today ${Math.round(capacity.completedPermille! / 10)}% of scheduled trips are reliably completed. No model links money to that share, so it is not forecast.`,
    );
  if (total > uncommitted)
    lines.push("Not affordable: it exceeds the uncommitted appropriation.");
  if (
    cashNow &&
    total > 0 &&
    cashNow.minorUnits < (alternative.installments[0]?.amount.minorUnits ?? 0)
  )
    lines.push(
      "The account does not hold enough cash for the first payment today; it would fail unless receipts arrive.",
    );
  const lead = alternative.deliveryLeadDays;
  return {
    alternativeKey: alternative.key,
    total: money(total, "USD"),
    affordable: total <= uncommitted,
    uncommittedAfter: money(Math.max(0, uncommitted - total), "USD"),
    cashNow,
    operatingMonths,
    unitsRestored,
    readyOn:
      lead !== null && maintenance > 0
        ? addDays(
            world.currentDate,
            lead +
              Math.max(
                0,
                ...alternative.installments
                  .filter((plan) => plan.purpose === "maintenance")
                  .map((plan) => plan.afterDays),
              ),
          )
        : null,
    lines,
  };
}

// ---------------------------------------------------------------------------
// Commitment and installments
// ---------------------------------------------------------------------------

function commitmentKey(
  appropriation: PublicProgramAppropriationRecord,
  alternativeKey: string,
): string {
  return key(
    appropriation.programKey,
    "commitment",
    appropriation.id,
    alternativeKey,
  );
}

function workKey(commitment: PublicProgramCommitmentRecord): string {
  return `${commitment.stableKey}:work`;
}

/** The deciding office chooses one alternative; $0 is a recorded choice too. */
export function commitPublicProgram(
  world: World,
  input: {
    readonly appropriationId: EntityId;
    readonly alternative: PublicProgramAlternative;
    readonly personId: EntityId;
    readonly office: PublicProgramOffice;
    readonly recipientOrganizationId: EntityId | null;
  },
): PublicProgramResult {
  const refuse = (reason: string): PublicProgramResult => ({
    ok: false,
    world,
    reason,
  });
  const appropriation = publicProgramRecords(world).find(
    (record): record is PublicProgramAppropriationRecord =>
      record.id === input.appropriationId && record.kind === "appropriation",
  );
  if (!appropriation) return refuse("No such appropriation is recorded.");
  const authority = programAuthority(
    world,
    input.personId,
    input.office,
    appropriation,
  );
  if (authority.status !== "available") return refuse(authority.reason);
  if (
    world.currentDate < appropriation.availableFrom ||
    world.currentDate > appropriation.availableThrough
  )
    return refuse(
      `This appropriation can be committed only from ${appropriation.availableFrom} through ${appropriation.availableThrough}.`,
    );
  const stableKey = commitmentKey(appropriation, input.alternative.key);
  if (publicProgramRecords(world).some((r) => r.stableKey === stableKey))
    return refuse("This alternative has already been decided.");
  const forecast = forecastProgramAlternative(
    world,
    appropriation,
    input.alternative,
  );
  if (!forecast.affordable)
    return refuse(
      `Not affordable: ${dollars(forecast.total)} exceeds the ${dollars(programPosition(world, appropriation.programKey, appropriation.id).uncommitted)} still uncommitted.`,
    );
  if (forecast.total.minorUnits > 0 && !input.recipientOrganizationId)
    return refuse("Money needs a recipient organization.");
  const installments = input.alternative.installments.map((plan) => ({
    dueAt: addDays(world.currentDate, plan.afterDays),
    amount: plan.amount,
    purpose: plan.purpose,
  }));
  if (installments.some((plan) => plan.dueAt > appropriation.availableThrough))
    return refuse(
      "An installment would fall due after the appropriation lapses.",
    );
  const written = writeRecord(
    world,
    stableKey,
    {
      stableKey,
      kind: "commitment",
      jurisdictionId: appropriation.jurisdictionId,
      involved: [
        appropriation.accountOrganizationId,
        ...(input.recipientOrganizationId
          ? [input.recipientOrganizationId]
          : []),
      ],
      participant: input.personId,
      visibility: "public",
      programKey: appropriation.programKey,
      summary:
        forecast.total.minorUnits === 0
          ? `Decided to commit nothing for ${appropriation.programKey}: ${input.alternative.title}.`
          : `Committed ${dollars(forecast.total)} for ${appropriation.programKey}: ${input.alternative.title}. Payments post only as each falls due and cash allows.`,
    },
    {
      kind: "commitment",
      programKey: appropriation.programKey,
      jurisdictionId: appropriation.jurisdictionId,
      appropriationId: appropriation.id,
      alternativeKey: input.alternative.key,
      alternativeTitle: input.alternative.title,
      decidedByPersonId: input.personId,
      authority: authority.basis,
      recipientOrganizationId:
        forecast.total.minorUnits > 0 ? input.recipientOrganizationId : null,
      installments,
      deliveryLeadDays: input.alternative.deliveryLeadDays,
    },
  );
  let next = written.world;
  const commitment = publicProgramRecords(next).at(
    -1,
  ) as PublicProgramCommitmentRecord;
  if (installments.length === 0)
    return { ok: true, world: next, recordId: written.id };
  next = createWorkItem(next, {
    stableKey: workKey(commitment),
    title: `Carry out: ${input.alternative.title}`,
    summary:
      "The agency posts each payment when it falls due and reports what the service can do afterwards.",
    jurisdictionId: commitment.jurisdictionId,
    sourceEntityIds: [commitment.eventId],
    focus: {
      kind: "other",
      targetKey: "public-program:implementation",
      sourceEntityId: commitment.eventId,
    },
    effort: null,
    access: { kind: "private", personIds: [input.personId] },
    assignedPersonIds: [input.personId],
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  for (const [index, plan] of installments.entries()) {
    if (plan.dueAt === next.currentDate)
      next = settleProgramInstallment(next, commitment.id, index).world;
    else
      next = scheduleFutureDueItem(next, {
        stableKey: `${commitment.stableKey}:installment:${index}`,
        dueAt: plan.dueAt,
        transitionKey: PUBLIC_PROGRAM_INSTALLMENT,
        entityIds: [appropriation.accountOrganizationId],
        jurisdictionId: commitment.jurisdictionId,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [commitment.eventId],
        },
      });
  }
  return { ok: true, world: next, recordId: written.id };
}

function commitmentById(
  world: World,
  id: EntityId,
): PublicProgramCommitmentRecord | null {
  const found = publicProgramRecords(world).find((r) => r.id === id);
  return found?.kind === "commitment" ? found : null;
}

/** Posts one installment if authority and cash allow, or records why not. */
export function settleProgramInstallment(
  world: World,
  commitmentId: EntityId,
  index: number,
): { world: World; installment: PublicProgramInstallmentRecord } {
  const commitment = commitmentById(world, commitmentId);
  if (!commitment) throw new Error("No such program commitment.");
  const plan = commitment.installments[index];
  if (!plan) throw new Error("No such installment.");
  const stableKey = `${commitment.stableKey}:installment:${index}:outturn`;
  const existing = publicProgramRecords(world).find(
    (r) => r.stableKey === stableKey,
  );
  if (existing?.kind === "installment") return { world, installment: existing };
  const appropriation = publicProgramRecords(world).find(
    (r) => r.id === commitment.appropriationId,
  ) as PublicProgramAppropriationRecord;
  const account = {
    kind: "organization" as const,
    organizationId: appropriation.accountOrganizationId,
  };
  const cash = resourcePositionAt(world, account, plan.amount.currency);
  let reason: string | null = null;
  if (world.currentDate > appropriation.availableThrough)
    reason = "The appropriation lapsed before this payment fell due.";
  else if (!cash || cash.liquidBalance.minorUnits < plan.amount.minorUnits)
    reason = `The account held ${cash ? dollars(cash.liquidBalance) : "no recorded cash"}, short of the ${dollars(plan.amount)} due. An appropriation is not cash.`;
  const label = `${commitment.alternativeTitle}, payment ${index + 1} of ${commitment.installments.length}`;
  let next = world;
  let flowId: EntityId | null = null;
  if (!reason) {
    const flowKey = `${commitment.stableKey}:installment:${index}:flow`;
    next = createResourceFlow(next, {
      stableKey: flowKey,
      source: account,
      recipient: {
        kind: "organization",
        organizationId: commitment.recipientOrganizationId!,
      },
      startsAt: next.currentDate,
      amount: plan.amount,
      cadenceKind: "custom:public-program-installment",
      basisKind: "custom:public-program-commitment",
      basisReference: {
        kind: "public-program",
        commitmentId: commitment.id,
        installmentIndex: index,
      },
      restrictionKind: "purpose:public-service",
      jurisdictionId: commitment.jurisdictionId,
      provenance: { kind: "simulated-event", eventId: commitment.eventId },
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${flowKey}:transfer`,
      resourceFlowId: flow.id,
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      attemptedAmount: plan.amount,
      transferredAmount: plan.amount,
      status: "completed",
      reasonKind: null,
      note: `${label}; ${plan.purpose}.`,
      provenance: flow.provenance,
    });
    flowId = flow.id;
  }
  const written = writeRecord(
    next,
    stableKey,
    {
      stableKey,
      kind: "installment",
      jurisdictionId: commitment.jurisdictionId,
      involved: [
        appropriation.accountOrganizationId,
        ...(commitment.recipientOrganizationId
          ? [commitment.recipientOrganizationId]
          : []),
        ...(flowId ? [flowId] : []),
      ],
      participant: null,
      visibility: "public",
      programKey: commitment.programKey,
      summary: reason
        ? `${label} did not post. ${reason}`
        : `${label} posted: ${dollars(plan.amount)} for ${plan.purpose}.`,
    },
    {
      kind: "installment",
      programKey: commitment.programKey,
      jurisdictionId: commitment.jurisdictionId,
      commitmentId: commitment.id,
      installmentIndex: index,
      status: reason ? "failed" : "posted",
      resourceFlowId: flowId,
      reason,
    },
  );
  next = written.world;
  const installment = publicProgramRecords(next).at(
    -1,
  ) as PublicProgramInstallmentRecord;
  if (
    !reason &&
    plan.purpose === "maintenance" &&
    commitment.deliveryLeadDays !== null
  )
    next = scheduleFutureDueItem(next, {
      stableKey: `${commitment.stableKey}:installment:${index}:delivery`,
      dueAt: addDays(next.currentDate, commitment.deliveryLeadDays),
      transitionKey: PUBLIC_PROGRAM_DELIVERY,
      entityIds: [appropriation.accountOrganizationId],
      jurisdictionId: commitment.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [installment.eventId] },
    });
  else if (!reason && plan.purpose === "maintenance")
    next = recordCapacityOutturn(next, commitment, installment);
  return { world: closeWorkIfDone(next, commitment), installment };
}

function recordCapacityOutturn(
  world: World,
  commitment: PublicProgramCommitmentRecord,
  installment: PublicProgramInstallmentRecord,
): World {
  const capacity = programCapacity(world, commitment.programKey);
  if (!capacity) return world;
  const before =
    programOutturns(world, commitment.programKey).at(-1)?.unitsOperational ??
    capacity.unitsOperational;
  const plan = commitment.installments[installment.installmentIndex]!;
  const restored = capacity.restorationCostPerUnit
    ? Math.min(
        capacity.unitsTotal - before,
        Math.floor(
          plan.amount.minorUnits / capacity.restorationCostPerUnit.minorUnits,
        ),
      )
    : null;
  const stableKey = `${installment.stableKey}:capacity`;
  return writeRecord(
    world,
    stableKey,
    {
      stableKey,
      kind: "capacity-outturn",
      jurisdictionId: commitment.jurisdictionId,
      involved: [
        ...(commitment.recipientOrganizationId
          ? [commitment.recipientOrganizationId]
          : [commitment.jurisdictionId]),
      ],
      participant: null,
      visibility: "public",
      programKey: commitment.programKey,
      summary:
        restored === null
          ? `The maintenance work paid for is done. How many ${capacity.unitLabel} it returned is unknown; ${before} of ${capacity.unitsTotal} are counted in service.`
          : `The maintenance work paid for is done: ${restored} ${capacity.unitLabel} returned, ${before + restored} of ${capacity.unitsTotal} now in service.`,
    },
    {
      kind: "capacity-outturn",
      programKey: commitment.programKey,
      jurisdictionId: commitment.jurisdictionId,
      commitmentId: commitment.id,
      installmentId: installment.id,
      unitsOperational: before + (restored ?? 0),
      restoredUnits: restored,
    },
  ).world;
}

function closeWorkIfDone(
  world: World,
  commitment: PublicProgramCommitmentRecord,
): World {
  const records = publicProgramRecords(world);
  const settled = records.filter(
    (r): r is PublicProgramInstallmentRecord =>
      r.kind === "installment" && r.commitmentId === commitment.id,
  );
  if (settled.length < commitment.installments.length) return world;
  const deliveries = settled.filter(
    (r) =>
      r.status === "posted" &&
      commitment.installments[r.installmentIndex]!.purpose === "maintenance",
  );
  if (
    deliveries.some(
      (r) =>
        !records.some(
          (o) => o.kind === "capacity-outturn" && o.installmentId === r.id,
        ),
    )
  )
    return world;
  const work = world.history.workItems.find(
    (w) => w.stableKey === workKey(commitment),
  );
  if (!work) return world;
  const previous = workItemState(world, work.id);
  if (previous.status === "completed" || previous.status === "cancelled")
    return world;
  const stableKey = `${workKey(commitment)}:completed`;
  const state: WorkItemStateRecord = {
    ...previous,
    id: createStableId("work-item-state", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentMoment,
    status: "completed",
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    outcomeEventId: null,
    supersedesStateId: previous.id,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      workItemStates: [...world.history.workItemStates, state],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function dueTarget(
  world: World,
  due: FutureDueItem,
  suffix: string,
): { commitment: PublicProgramCommitmentRecord; index: number } | null {
  const match = new RegExp(`^(.*):installment:(\\d+)${suffix}$`).exec(
    due.stableKey,
  );
  if (!match) return null;
  const commitment = publicProgramRecords(world).find(
    (r): r is PublicProgramCommitmentRecord =>
      r.kind === "commitment" && r.stableKey === match[1],
  );
  return commitment ? { commitment, index: Number(match[2]) } : null;
}

function resolved(
  world: World,
  context: string,
  outcomeEventId: EntityId | null,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId,
  };
}

export function programInstallmentHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const target = dueTarget(world, due, "");
  if (!target) return resolved(world, "No program commitment matches.", null);
  const { world: next, installment } = settleProgramInstallment(
    world,
    target.commitment.id,
    target.index,
  );
  return {
    world: next,
    status: installment.status === "posted" ? "resolved" : "blocked",
    reasonKey:
      installment.status === "posted" ? null : "public-program:payment-failed",
    context: installment.reason ?? "The installment posted.",
    outcomeEventId: installment.eventId,
  };
}

export function programDeliveryHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const target = dueTarget(world, due, ":delivery");
  if (!target) return resolved(world, "No program commitment matches.", null);
  const installment = programInstallments(
    world,
    target.commitment.programKey,
  ).find(
    (r) =>
      r.commitmentId === target.commitment.id &&
      r.installmentIndex === target.index,
  );
  if (!installment || installment.status !== "posted")
    return resolved(world, "Nothing was paid, so nothing is delivered.", null);
  if (
    programOutturns(world, target.commitment.programKey).some(
      (r) => r.installmentId === installment.id,
    )
  )
    return resolved(world, "Already delivered.", null);
  let next = recordCapacityOutturn(world, target.commitment, installment);
  next = closeWorkIfDone(next, target.commitment);
  return resolved(
    next,
    "Maintenance delivered.",
    publicProgramRecords(next).at(-1)!.eventId,
  );
}

export const PUBLIC_PROGRAM_HANDLERS = [
  [PUBLIC_PROGRAM_INSTALLMENT, programInstallmentHandler],
  [PUBLIC_PROGRAM_DELIVERY, programDeliveryHandler],
] as const;

/** Months between two dates, for monthly schedules supplied by callers. */
export function monthlyAfterDays(from: IsoDate, months: number): number {
  const [y, m, d] = from.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, d));
  return daysBetween(from, target.toISOString().slice(0, 10) as IsoDate);
}
