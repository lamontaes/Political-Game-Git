import { addDays, makeIsoDate } from "../dates";
import { draftLineageComponents } from "../legislation-draft-lineage";
import { measureEnactment } from "../legislation";
import {
  assertPublicGovernmentIdentity,
  publicGovernmentIdentityForRecord,
  samePublicGovernmentIdentity,
} from "../public-government-identity";
import { fiscalYearContaining } from "../public-budgets/fiscal";
import { fiscalYearStartFor } from "./budget-stakes";
import { BUDGET_PROGRAMS } from "../public-budgets/store";
import { money } from "../resources";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  MoneyAmount,
  PublicGovernmentIdentity,
  PublicProgramAppropriationRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { PROGRAM_FAMILIES } from "./program-families";
import {
  governingMatterById,
  governingOfficeForPerson,
} from "./state-governing";

export const BUDGET_DOLLARS = "budget:request-dollars";
export const BUDGET_DOLLARS_VERSION = "budget-dollars:v1";
export const EXECUTIVE_BUDGET_REQUEST = "governing.budget-request";
const REQUEST_TAG = "executive-budget-request:";

export interface ExecutiveBudgetRequestLine {
  readonly familyKey: string;
  readonly amount: MoneyAmount;
}

interface RequestPayload {
  readonly matterId: EntityId;
  readonly decisionEventId: EntityId;
  readonly officeKey: string;
  readonly personId: EntityId;
  readonly governmentIdentity: PublicGovernmentIdentity;
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate;
  readonly lines: readonly ExecutiveBudgetRequestLine[];
}

export interface ExecutiveBudgetRequest extends RequestPayload {
  readonly event: HistoricalEvent;
}

export function validateExecutiveBudgetRequestLines(
  lines: readonly ExecutiveBudgetRequestLine[],
): void {
  if (!lines.length)
    throw new Error("A budget request needs a family and a dollar amount.");
  const seen = new Set<string>();
  for (const line of lines) {
    if (!PROGRAM_FAMILIES.some((family) => family.familyKey === line.familyKey))
      throw new Error(
        "That program family is not in the shared drafting bank.",
      );
    if (seen.has(line.familyKey))
      throw new Error("Each family has one requested amount.");
    seen.add(line.familyKey);
    if (
      line.amount.currency !== "USD" ||
      !Number.isSafeInteger(line.amount.minorUnits) ||
      line.amount.minorUnits < 0
    )
      throw new Error("A requested amount must be nonnegative whole US cents.");
  }
}

/** A proposal tied to a completed executive choice, never spending authority,
 * an appropriation, an account opening or a cash transfer. */
export function recordExecutiveBudgetRequest(
  world: World,
  input: {
    readonly matterId: EntityId;
    readonly decisionEventId: EntityId;
    readonly startsOn: IsoDate;
    readonly endsOn: IsoDate;
    readonly lines: readonly ExecutiveBudgetRequestLine[];
  },
): World {
  const matter = governingMatterById(world, input.matterId);
  if (
    !matter ||
    matter.family !== "budget" ||
    matter.status !== "decided" ||
    matter.decision?.id !== input.decisionEventId ||
    !matter.decision.tags.includes(`choice:${BUDGET_DOLLARS}`)
  )
    throw new Error(
      "A dollar request requires this budget matter's actual completed decision.",
    );
  const office = governingOfficeForPerson(world, matter.holderPersonId);
  if (!office || office.officeKey !== matter.officeKey)
    throw new Error(
      "This budget request no longer belongs to the current executive.",
    );
  validateExecutiveBudgetRequestLines(input.lines);
  const startsOn = makeIsoDate(input.startsOn);
  const endsOn = makeIsoDate(input.endsOn);
  if (endsOn < startsOn)
    throw new Error("The requested budget period ends before it starts.");
  const governmentIdentity: PublicGovernmentIdentity =
    office.programOffice?.kind === "municipal"
      ? {
          kind: "local-government",
          governmentKey: office.programOffice.governmentKey,
          jurisdictionId: office.jurisdictionId,
        }
      : { kind: "jurisdiction", jurisdictionId: office.jurisdictionId };
  assertPublicGovernmentIdentity(world, governmentIdentity);
  const payload: RequestPayload = {
    matterId: matter.id,
    decisionEventId: input.decisionEventId,
    officeKey: office.officeKey,
    personId: office.holderPersonId,
    governmentIdentity,
    startsOn,
    endsOn,
    lines: [...input.lines]
      .sort((a, b) => a.familyKey.localeCompare(b.familyKey))
      .map((line) => ({
        familyKey: line.familyKey,
        amount: money(line.amount.minorUnits, "USD"),
      })),
  };
  const tag = `${REQUEST_TAG}${encodeURIComponent(JSON.stringify(payload))}`;
  const stableKey = `${matter.stableKey}:dollar-request`;
  const prior = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (prior) {
    if (!prior.tags.includes(tag))
      throw new Error("This completed budget request cannot be rewritten.");
    return world;
  }
  return recordWorldEvent(world, {
    stableKey,
    type: EXECUTIVE_BUDGET_REQUEST,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      office.holderPersonId,
      ...(office.organizationId ? [office.organizationId] : []),
    ],
    participants: [
      {
        personId: office.holderPersonId,
        role: "agency:budget-request",
        detail: office.title,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      tag,
      `matter:${matter.id}`,
      `source-event:${input.decisionEventId}`,
      `office:${office.officeKey}`,
      `term:${office.termId}`,
    ],
    summary: `${office.title} requested ${payload.lines.map((line) => `$${(line.amount.minorUnits / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for ${PROGRAM_FAMILIES.find((family) => family.familyKey === line.familyKey)!.title}`).join("; ")} for ${startsOn} through ${endsOn}. This is a request to the legislature, not authority to spend.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "Requested dollar amounts by program family.",
      motivation: null,
      immediateReaction: null,
    },
  });
}

export function executiveBudgetRequests(
  world: World,
  identity?: PublicGovernmentIdentity,
): readonly ExecutiveBudgetRequest[] {
  return world.history.events.flatMap((event) => {
    if (event.type !== EXECUTIVE_BUDGET_REQUEST) return [];
    const tag = event.tags.find((entry) => entry.startsWith(REQUEST_TAG));
    if (!tag) return [];
    const payload: RequestPayload = JSON.parse(
      decodeURIComponent(tag.slice(REQUEST_TAG.length)),
    );
    validateExecutiveBudgetRequestLines(payload.lines);
    if (
      identity &&
      !samePublicGovernmentIdentity(payload.governmentIdentity, identity)
    )
      return [];
    return [{ ...payload, event }];
  });
}

/** The exact modeled category total, displayed once per category. It is not
 * an allocation to each drafting family or proof of a legislative enactment. */
export function modeledExecutiveBudgetBaseline(
  world: World,
  identity: PublicGovernmentIdentity,
  onDate: IsoDate,
) {
  const candidates =
    world.publicBudgets?.governments.filter((government) =>
      samePublicGovernmentIdentity(
        publicGovernmentIdentityForRecord(government),
        identity,
      ),
    ) ?? [];
  if (candidates.length !== 1) return null;
  const government = candidates[0]!;
  const year = government.years.find(
    (row) => row.startsOn <= onDate && row.endsOn >= onDate,
  );
  if (!year) return null;
  return {
    governmentKey: government.key,
    startsOn: year.startsOn,
    endsOn: year.endsOn,
    adoptedOn: year.adoptedOn,
    basis: year.basis,
    sourceNotes: government.openingNotes,
    categories: BUDGET_PROGRAMS.map((category, index) => ({
      category,
      amount: money(Math.round(year.appropriations[index]! * 100), "USD"),
    })),
  };
}

/** Whole recorded authorizations with their own dates. No annualization or
 * attribution of a broad category total to several families. */
export function enactedFamilyAppropriations(
  world: World,
  request: ExecutiveBudgetRequest,
  familyKey: string,
): readonly PublicProgramAppropriationRecord[] {
  return (world.history.publicProgramRecords ?? []).filter(
    (record): record is PublicProgramAppropriationRecord => {
      if (
        record.kind !== "appropriation" ||
        record.recordedAt > world.currentDate ||
        !samePublicGovernmentIdentity(
          publicGovernmentIdentityForRecord(record),
          request.governmentIdentity,
        ) ||
        record.availableThrough < request.startsOn ||
        record.availableFrom > request.endsOn ||
        !record.sourceMeasureId
      )
        return false;
      const namespace = record.programKey.split(":", 1)[0];
      const lineage = draftLineageComponents(world, record.sourceMeasureId);
      const matchesFamily =
        namespace === familyKey ||
        (!PROGRAM_FAMILIES.some((family) => family.familyKey === namespace) &&
          lineage.length === 1 &&
          lineage[0]!.familyKey === familyKey);
      if (!matchesFamily) return false;
      const enactment = measureEnactment(world, record.sourceMeasureId);
      return (
        enactment?.outcome === "enacted" &&
        enactment.resolvedAt <= world.currentDate
      );
    },
  );
}

/** Exact input parsing: no floating-point rounding of a player's dollars. */
export function parseExecutiveBudgetDollars(value: string): MoneyAmount | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const cents =
    BigInt(match[1]!) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return money(Number(cents), "USD");
}

/** The canonical identity of this executive, with no geographic aliases. */
export function executiveBudgetIdentity(
  world: World,
  personId: EntityId,
): PublicGovernmentIdentity | null {
  const office = governingOfficeForPerson(world, personId);
  if (!office) return null;
  return office.programOffice?.kind === "municipal"
    ? {
        kind: "local-government",
        governmentKey: office.programOffice.governmentKey,
        jurisdictionId: office.jurisdictionId,
      }
    : { kind: "jurisdiction", jurisdictionId: office.jurisdictionId };
}

/** The next period from the represented government's own recorded calendar. */
export function executiveBudgetRequestPeriod(world: World, personId: EntityId) {
  const identity = executiveBudgetIdentity(world, personId);
  if (!identity) return null;
  const rows =
    world.publicBudgets?.governments.filter((government) =>
      samePublicGovernmentIdentity(
        publicGovernmentIdentityForRecord(government),
        identity,
      ),
    ) ?? [];
  const government = rows.length === 1 ? rows[0]! : null;
  const start =
    government?.fiscalYearStart ??
    (identity.kind === "jurisdiction"
      ? fiscalYearStartFor(world, identity.jurisdictionId)
      : null);
  if (!start) return null;
  const current = fiscalYearContaining(world.currentDate, start);
  const next = fiscalYearContaining(addDays(current.endsOn, 1), start);
  return {
    ...next,
    basis: government?.fiscalYearStartBasis ?? "shared fiscal-year source",
    sourceNotes: government?.openingNotes ?? [],
  };
}
