/**
 * Payday: everyone with a recorded job is paid on the shared clock.
 *
 * Before this, only the person being played was ever paid. A town's jobs
 * (`town-employment.ts`) were recorded as paid work with no pay behind them,
 * and a household adult's recorded pay settled only while a child was being
 * played. In a world watched from the start nobody was paid, so no law that
 * touches a paycheck could ever change one.
 *
 * Now, every four weeks:
 *
 * - A town job that has no pay on record is given weekly pay from today:
 *   the annual median wage for its occupation in its state, from the BLS May
 *   2025 OEWS state tables (the national median where the state figure is
 *   withheld), per hour of a 2,080-hour year, times the middle of the job's
 *   recorded weekly hours. Never below the federal minimum wage. A job whose
 *   occupation has no published median gets no pay, and none is invented.
 * - Every weekly pay on record, for everyone but the person being played,
 *   pays each whole week that came due since the last payday. The person
 *   being played keeps being paid by their own clock, as before, through the
 *   same weekly rule.
 *
 * Cost: a scheduled transition costs the runner whole-world serializations,
 * so payday comes every four weeks rather than weekly, and each writes all of
 * its flows and payments in one batch with one integrity check each.
 */

import { addDays, daysBetween, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { FEDERAL_MINIMUM_HOURLY_MINOR } from "../job-market";
import { currentLifeCutoff, workStatusAt } from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import { resourceFlowTermsAt } from "../resource-queries";
import {
  createResourceFlows,
  money,
  recordResourceTransferOutcomes,
  type CreateResourceFlowInput,
  type RecordResourceTransferOutcomeInput,
} from "../resources";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  ResourceFlow,
  WorkRelationship,
  WorkRoleRecord,
  World,
} from "../types";
import { TOWN_EMPLOYMENT_VERSION } from "./town-employment";
import { TOWN_JOB_SOC } from "./town-job-soc";
import {
  TOWN_PAY_MEDIANS,
  TOWN_PAY_META,
  TOWN_PAY_STATES,
} from "./town-pay.generated";

export const TOWN_PAY_VERSION = "town-pay-v1";
export const PAYDAY_TRANSITION_KEY = "living-world:payday" as const;
export const PAYDAY_INTERVAL_DAYS = 28;

const PAYDAY_KEY_PREFIX = `${TOWN_PAY_VERSION}:payday:`;
const PAY_KEY_PREFIX = `${TOWN_PAY_VERSION}:job-pay:`;
const WEEK_DAYS = 7;
const HOURS_PER_YEAR = 2_080;
const CATCH_UP_LIMIT_WEEKS = 520;

interface OccupationMedians {
  readonly national: number | null;
  readonly byState: ReadonlyMap<string, number>;
}

let medians: ReadonlyMap<string, OccupationMedians> | null = null;

function occupationMedians(): ReadonlyMap<string, OccupationMedians> {
  if (medians) return medians;
  const parsed = new Map<string, OccupationMedians>();
  for (const row of TOWN_PAY_MEDIANS.split(";")) {
    const [code, national, states] = row.split(":");
    const byState = new Map<string, number>();
    (states ?? "").split(",").forEach((cell, index) => {
      if (cell !== "") byState.set(TOWN_PAY_STATES[index]!, Number(cell));
    });
    parsed.set(code!, {
      national: national ? Number(national) : null,
      byState,
    });
  }
  return (medians = parsed);
}

export interface TownJobPay {
  readonly weeklyMinor: number;
  readonly soc: string;
  readonly annualMedianUsd: number;
  readonly basis: "state" | "national";
  readonly weeklyHours: number;
}

/**
 * What a job classified as `occupation`, held in `jurisdictionId` for about
 * `weeklyHours` a week, pays each week; null when no published median exists.
 */
export function townJobWeeklyPay(
  occupation: string | null,
  jurisdictionId: EntityId | null,
  weeklyHours: number,
): TownJobPay | null {
  const soc = occupation ? TOWN_JOB_SOC[occupation] : undefined;
  if (!soc || weeklyHours <= 0) return null;
  const row = occupationMedians().get(soc);
  if (!row) return null;
  const place = jurisdictionId
    ? lifePlaceByJurisdictionId(jurisdictionId)
    : null;
  const stateFips = place?.sourceGeoid?.slice(0, 2) ?? null;
  const state = stateFips ? row.byState.get(stateFips) : undefined;
  const annual = state ?? row.national;
  if (annual === null || annual === undefined) return null;
  const hourlyMinor = Math.max(
    FEDERAL_MINIMUM_HOURLY_MINOR,
    Math.round((annual * 100) / HOURS_PER_YEAR),
  );
  return {
    weeklyMinor: hourlyMinor * weeklyHours,
    soc,
    annualMedianUsd: annual,
    basis: state !== undefined ? "state" : "national",
    weeklyHours,
  };
}

/** Schedules the first payday for a life opened at the current version. Idempotent. */
export function ensurePaydaySchedule(world: World): World {
  const stableKey = `${PAYDAY_KEY_PREFIX}0`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, PAYDAY_INTERVAL_DAYS),
    transitionKey: PAYDAY_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: TOWN_PAY_VERSION },
  });
}

export function paydayHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PAYDAY_TRANSITION_KEY)
    throw new Error("Payday received another transition.");
  const index = Number(dueItem.stableKey.slice(PAYDAY_KEY_PREFIX.length));
  const played =
    world.control.kind === "person" ? world.control.personId : null;
  let next = startTownJobPay(world, played);
  next = settleWeeklyPayForAll(
    next,
    addDays(next.currentDate, -PAYDAY_INTERVAL_DAYS),
    played,
  );
  next = scheduleFutureDueItem(next, {
    stableKey: `${PAYDAY_KEY_PREFIX}${index + 1}`,
    dueAt: addDays(next.currentDate, PAYDAY_INTERVAL_DAYS),
    transitionKey: PAYDAY_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "payday:paid",
    context: null,
    outcomeEventId: null,
  };
}

export const PAYDAY_HANDLERS = [
  [PAYDAY_TRANSITION_KEY, paydayHandler],
] as const;

function isActiveOn(world: World, workId: EntityId, date: IsoDate): boolean {
  return (
    workStatusAt(world, workId, {
      ...currentLifeCutoff(world),
      asOfDate: date,
    })?.status === "active"
  );
}

function latestRoles(world: World): ReadonlyMap<EntityId, WorkRoleRecord> {
  const roles = new Map<EntityId, WorkRoleRecord>();
  for (const role of world.history.workRoles)
    roles.set(role.workRelationshipId, role);
  return roles;
}

function workFlows(world: World): ReadonlyMap<EntityId, ResourceFlow> {
  const flows = new Map<EntityId, ResourceFlow>();
  for (const flow of world.history.resourceFlows)
    if (flow.basisReference.kind === "work")
      flows.set(flow.basisReference.workRelationshipId, flow);
  return flows;
}

/**
 * Gives every active town job with no pay on record its weekly pay, from
 * today forward only: nobody is paid years of back wages for a job the game
 * wrote before pay existed.
 */
export function startTownJobPay(
  world: World,
  exceptPersonId: EntityId | null,
): World {
  const flows = workFlows(world);
  const roles = latestRoles(world);
  const inputs: CreateResourceFlowInput[] = [];
  for (const work of world.history.workRelationships) {
    if (
      work.personId === exceptPersonId ||
      !work.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) ||
      work.compensation !== "paid" ||
      !work.organizationId ||
      flows.has(work.id) ||
      !isActiveOn(world, work.id, world.currentDate)
    )
      continue;
    const role = roles.get(work.id);
    if (!role) continue;
    const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
    const pay = townJobWeeklyPay(
      role.occupationClassification,
      role.locationJurisdictionId,
      Math.round((minimumHours + maximumHours) / 2),
    );
    if (!pay) continue;
    inputs.push(townJobPayFlow(world, work, pay));
  }
  return createResourceFlows(world, inputs);
}

function townJobPayFlow(
  world: World,
  work: WorkRelationship,
  pay: TownJobPay,
): CreateResourceFlowInput {
  return {
    stableKey: `${PAY_KEY_PREFIX}${work.id}`,
    source: { kind: "organization", organizationId: work.organizationId! },
    recipient: { kind: "person", personId: work.personId },
    startsAt: world.currentDate,
    amount: money(pay.weeklyMinor, "USD"),
    cadenceKind: "schedule:weekly",
    basisKind: "compensation:work",
    basisReference: { kind: "work", workRelationshipId: work.id },
    restrictionKind: null,
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: `${TOWN_PAY_VERSION}: paid weekly from ${world.currentDate} for ${pay.weeklyHours} hours at the ${pay.basis} annual median for SOC ${pay.soc} ($${pay.annualMedianUsd}; ${TOWN_PAY_META.source}).`,
    },
  };
}

/**
 * Pays every whole week that came due after `earliestDueExclusive` on every
 * weekly work pay on record, except the played person's. Keyed by the week
 * it began, the same as the played person's own pay, so a week is paid once
 * whichever clock reaches it first.
 */
export function settleWeeklyPayForAll(
  world: World,
  earliestDueExclusive: IsoDate,
  exceptPersonId: EntityId | null,
): World {
  const paidWeeks = new Map<EntityId, number>();
  const flowsById = new Map<EntityId, ResourceFlow>();
  for (const flow of world.history.resourceFlows)
    if (
      flow.basisKind === "compensation:work" &&
      flow.basisReference.kind === "work" &&
      flow.recipient.kind === "person" &&
      flow.recipient.personId !== exceptPersonId
    )
      flowsById.set(flow.id, flow);
  if (flowsById.size === 0) return world;
  for (const outcome of world.history.resourceTransferOutcomes) {
    const flow = flowsById.get(outcome.resourceFlowId);
    if (!flow) continue;
    const week =
      daysBetween(flow.startsAt, outcome.periodStartsAt) / WEEK_DAYS + 1;
    if (week > (paidWeeks.get(flow.id) ?? 0)) paidWeeks.set(flow.id, week);
  }
  const inputs: RecordResourceTransferOutcomeInput[] = [];
  for (const flow of flowsById.values()) {
    if (flow.basisReference.kind !== "work") continue;
    const workId = flow.basisReference.workRelationshipId;
    const firstNewWeek =
      earliestDueExclusive >= flow.startsAt
        ? Math.floor(
            daysBetween(flow.startsAt, earliestDueExclusive) / WEEK_DAYS,
          ) + 1
        : 1;
    const firstWeek = Math.max((paidWeeks.get(flow.id) ?? 0) + 1, firstNewWeek);
    for (
      let week = firstWeek;
      week < firstWeek + CATCH_UP_LIMIT_WEEKS;
      week += 1
    ) {
      const periodStartsAt = makeIsoDate(
        addDays(flow.startsAt, (week - 1) * WEEK_DAYS),
      );
      const dueOn = addDays(flow.startsAt, week * WEEK_DAYS);
      if (dueOn > world.currentDate) break;
      if (!isActiveOn(world, workId, addDays(dueOn, -1))) break;
      const terms = resourceFlowTermsAt(world, flow.id, {
        asOfDate: periodStartsAt,
        historySequenceExclusive: world.history.nextSequence,
      });
      if (terms?.status !== "active" || terms.cadenceKind !== "schedule:weekly")
        break;
      // A change of terms inside the week is settled by the played clock's
      // own writer, which knows how to split it; payday leaves that week.
      if (
        world.history.resourceFlowTerms.some(
          (record) =>
            record.resourceFlowId === flow.id &&
            record.effectiveAt > periodStartsAt &&
            record.effectiveAt < dueOn,
        )
      )
        break;
      inputs.push({
        stableKey: `${flow.stableKey}:${periodStartsAt}`,
        resourceFlowId: flow.id,
        periodStartsAt,
        periodEndsAt: addDays(dueOn, -1),
        occurredAt: dueOn,
        status: "completed",
        attemptedAmount: terms.amount,
        transferredAmount: terms.amount,
        reasonKind: null,
        note: "Pay for the week.",
        provenance: flow.provenance,
      });
    }
  }
  return recordResourceTransferOutcomes(world, inputs);
}
