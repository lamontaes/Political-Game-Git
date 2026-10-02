import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { createOrganization, recordWorkStatus } from "../life";
import { workStatusAt } from "../life-queries";
import { personName } from "../people";
import {
  currentResourceCutoff,
  resourcePositionAt,
  resourceFlowTermsAt,
} from "../resource-queries";
import { makeCurrencyCode } from "../resources";
import { recordMediaPurchasePayment } from "./media-purchase-payment";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
  CurrencyCode,
} from "../types";
import { recordWorldEvent } from "../world";
import { mediaOutlets, reporterIsCurrent, reporterRoles } from "./outlets";
import { DEFAULT_MEDIA_OWNERSHIP_PACK } from "./ownership-pack-default";
import {
  loadOwnershipPacks,
  ownerEffectIsSimulated,
  type LoadedOwnershipOwner,
  type OwnershipPack,
  type OwnershipPracticeRow,
  type OwnershipRegistry,
} from "./ownership-packs";
import {
  PRESS_CONTRACT_VERSION,
  type MediaOutletRecord,
  type MediaOwnerRecord,
  type OutletOwnershipRecord,
  type OwnerDirectiveRecord,
  type ReporterRoleRecord,
} from "./records";
import {
  appendPressRecord,
  pressRecordByKey,
  pressRecordsOfKind,
} from "./store";

/**
 * Media owners, and the decisions an owner takes for every outlet it holds at
 * once.
 *
 * Every outlet gets a founding owner drawn from the loaded ownership packs.
 * Each owner reviews its holdings on its own cadence and, at each review, may
 * take any of its practices: cut newsroom jobs across all its outlets, buy an
 * independent outlet, order its outlets to run one another's stories (the
 * news desk carries that out; see `sharingSiblings`), or a practice whose
 * effect is not simulated yet, which
 * the blanket rule records against every outlet it holds without changing
 * anything else.
 *
 * NOT MODELED YET, with the blanket rule standing in:
 * - Acquisitions and other directives still use pack likelihoods. Newsroom
 *   cuts instead require recorded cash below comparable recorded payroll.
 * - Whether a decision is news. Owner events use the `press.` prefix, which
 *   the desk excludes, so none of them reaches a front page until the owner
 *   of newsworthiness admits them.
 * - What a reporter does after losing the job. The job ends through the
 *   ordinary work writer; nothing yet looks for new work on their behalf.
 * - Editors and staff resisting a directive. The owner decided (2026-09-22)
 *   that they can, with consequences, and that the record should keep what
 *   was ordered, what the outlet did and what readers saw. The forms of
 *   resistance and what they cost are still unresearched, so for now every
 *   directive is carried out as ordered.
 */

export const MEDIA_OWNERSHIP_PACKS: readonly OwnershipPack[] = [
  DEFAULT_MEDIA_OWNERSHIP_PACK,
];

let cached: OwnershipRegistry | null = null;

export function loadedOwnershipRegistry(): OwnershipRegistry {
  cached ??= loadOwnershipPacks(MEDIA_OWNERSHIP_PACKS);
  return cached;
}

export function resetLoadedOwnershipRegistry(): void {
  cached = null;
}

export const PRESS_OWNER_REVIEW_TRANSITION_KEY = "press:owner-review";

const OWNER_KEY = "press:owner:";
const HOLDING_KEY = "press:holding:";

export function mediaOwners(world: World): readonly MediaOwnerRecord[] {
  return pressRecordsOfKind(world, "media-owner");
}

export function ownerDirectives(
  world: World,
  ownerId?: EntityId,
): readonly OwnerDirectiveRecord[] {
  return pressRecordsOfKind(world, "owner-directive").filter(
    (directive) => ownerId === undefined || directive.ownerId === ownerId,
  );
}

/** The outlet's current holding, or null when no owner is recorded. */
export function currentOutletOwnership(
  world: World,
  outletId: EntityId,
): OutletOwnershipRecord | null {
  return (
    pressRecordsOfKind(world, "outlet-ownership")
      .filter((record) => record.outletId === outletId)
      .at(-1) ?? null
  );
}

export function outletOwner(
  world: World,
  outletId: EntityId,
): MediaOwnerRecord | null {
  const holding = currentOutletOwnership(world, outletId);
  return holding
    ? (mediaOwners(world).find((owner) => owner.id === holding.ownerId) ?? null)
    : null;
}

/**
 * The other outlets that run this outlet's stories: those its current owner
 * holds, once that owner has ordered its outlets to share. The order stands
 * while the owner holds them; a new owner starts with no order of its own.
 *
 * NOT MODELED YET: editors and staff resisting the order (the owner decided
 * they can, with consequences; how is unresearched), and which sibling picks
 * a story up beyond whether it is relevant to that sibling's own audience.
 * ChatGPT found no reuse rule, lag or share of output, so every relevant
 * sibling runs every story the same day.
 */
export function sharingSiblings(
  world: World,
  outletId: EntityId,
): readonly MediaOutletRecord[] {
  const owner = outletOwner(world, outletId);
  if (!owner) return [];
  const ordered = ownerDirectives(world, owner.id).some(
    (directive) =>
      directive.effect === "share-content-across-outlets" &&
      // An order recorded before sharing was simulated said it changed
      // nothing, and an old save keeps that meaning.
      directive.simulated &&
      directive.decidedAt <= world.currentDate,
  );
  if (!ordered) return [];
  return outletsHeldBy(world, owner.id).filter(
    (outlet) => outlet.id !== outletId,
  );
}

/** Every outlet the owner holds today. */
export function outletsHeldBy(
  world: World,
  ownerId: EntityId,
): readonly MediaOutletRecord[] {
  return mediaOutlets(world).filter(
    (outlet) => currentOutletOwnership(world, outlet.id)?.ownerId === ownerId,
  );
}

function ownerMayHold(
  row: LoadedOwnershipOwner,
  outlet: MediaOutletRecord,
): boolean {
  const { products, scopes } = row.holds;
  return (
    (!products || products.includes(outlet.product)) &&
    (!scopes || scopes.includes(outlet.scope))
  );
}

function ownerRowOf(
  registry: OwnershipRegistry,
  owner: MediaOwnerRecord,
): LoadedOwnershipOwner | null {
  return registry.owners.find((row) => row.key === owner.rowKey) ?? null;
}

/**
 * Gives every outlet without an owner its founding owner. Idempotent; an
 * outlet no loaded owner may hold stays unowned, which is recorded as nothing
 * rather than guessed.
 */
export function ensureMediaOwnership(
  world: World,
  registry: OwnershipRegistry = loadedOwnershipRegistry(),
): World {
  let next = world;
  for (const outlet of mediaOutlets(world)) {
    if (currentOutletOwnership(next, outlet.id)) continue;
    const eligible = registry.owners.filter(
      (row) => foundingWeightFor(row, outlet) > 0 && ownerMayHold(row, outlet),
    );
    if (eligible.length === 0) continue;
    const rng = new SeededRng(world.seed).fork(
      `press:ownership:founding:${outlet.stableKey}`,
    );
    const row = weightedPick(rng, eligible, outlet);
    const owned = ensureOwner(next, row, outlet);
    next = appendPressRecord(owned.world, "outlet-ownership", {
      stableKey: `${HOLDING_KEY}${outlet.id}:0`,
      outletId: outlet.id,
      ownerId: owned.owner.id,
      basis: "founding-owner",
      // The owner is recorded today; on an older save the outlet predates it,
      // and a holding must not begin before its owner exists.
      effectiveAt: owned.world.currentDate,
      eventId: null,
      supersedesOwnershipId: null,
    }).world;
  }
  return next;
}

function foundingWeightFor(
  row: LoadedOwnershipOwner,
  outlet: MediaOutletRecord,
): number {
  return row.foundingWeightByProduct?.[outlet.product] ?? row.foundingWeight;
}

function weightedPick(
  rng: SeededRng,
  rows: readonly LoadedOwnershipOwner[],
  outlet: MediaOutletRecord,
): LoadedOwnershipOwner {
  const total = rows.reduce(
    (sum, row) => sum + foundingWeightFor(row, outlet),
    0,
  );
  let draw = rng.next() * total;
  for (const row of rows) {
    draw -= foundingWeightFor(row, outlet);
    if (draw < 0) return row;
  }
  return rows.at(-1)!;
}

function ensureOwner(
  world: World,
  row: LoadedOwnershipOwner,
  outlet: MediaOutletRecord,
): { readonly world: World; readonly owner: MediaOwnerRecord } {
  const stableKey = row.perOutlet
    ? `${OWNER_KEY}${row.key}:${outlet.id}`
    : `${OWNER_KEY}${row.key}`;
  const existing = pressRecordByKey(world, "media-owner", stableKey);
  if (existing) return { world, owner: existing };
  const rng = new SeededRng(world.seed).fork(
    `press:ownership:name:${stableKey}`,
  );
  const name = rng.pick(row.names).replaceAll("{outlet}", outlet.name);
  let next = createOrganization(world, {
    stableKey: `${stableKey}:organization`,
    formedAt: world.currentDate,
    detailLevel: "detailed",
    provenance: {
      kind: "authored",
      note: `Media owner from the ${row.packId} ownership pack.`,
    },
    initialProfile: {
      name,
      classification: "enterprise:media-ownership",
      locationJurisdictionId: null,
    },
  });
  const organization = next.history.organizations.at(-1)!;
  const appended = appendPressRecord(next, "media-owner", {
    stableKey,
    organizationId: organization.id,
    packId: row.packId,
    rowKey: row.key,
    name,
    ownerKind: row.ownerKind,
    establishedAt: world.currentDate,
  });
  next = appended.world;
  if (row.practices.length > 0) {
    next = scheduleOwnerReview(next, appended.record, row, 0);
  }
  return { world: next, owner: appended.record };
}

function scheduleOwnerReview(
  world: World,
  owner: MediaOwnerRecord,
  row: LoadedOwnershipOwner,
  index: number,
): World {
  const stableKey = `${owner.stableKey}:review:${index}`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, row.reviewEveryDays),
    transitionKey: PRESS_OWNER_REVIEW_TRANSITION_KEY,
    entityIds: [owner.organizationId],
    jurisdictionId: null,
    provenance:
      index === 0
        ? { kind: "initialization", reference: PRESS_CONTRACT_VERSION }
        : { kind: "simulated", sourceEntityIds: [owner.organizationId] },
  });
}

/**
 * One owner's review, in pack order. Cost cutting reads saved books; other
 * practices retain their existing draws until their decision writers are built.
 */
export function pressOwnerReviewHandler(
  world: World,
  dueItem: FutureDueItem,
  registry: OwnershipRegistry = loadedOwnershipRegistry(),
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== PRESS_OWNER_REVIEW_TRANSITION_KEY) {
    throw new Error("The owner review handler received another transition.");
  }
  const marker = ":review:";
  const at = dueItem.stableKey.lastIndexOf(marker);
  const ownerKey = dueItem.stableKey.slice(0, at);
  const index = Number(dueItem.stableKey.slice(at + marker.length));
  const owner = pressRecordByKey(world, "media-owner", ownerKey);
  const row = owner ? ownerRowOf(registry, owner) : null;
  if (!owner || !row) {
    // The pack that supplied this owner is no longer loaded. Ignore it and
    // say so: the owner keeps its outlets and stops reviewing them.
    return {
      world,
      status: "cancelled",
      reasonKey: "press:owner-row-not-loaded",
      context: owner
        ? `Ownership row ${owner.rowKey} is not loaded; ${owner.name} no longer reviews its outlets.`
        : null,
      outcomeEventId: null,
    };
  }
  let next = world;
  let lastEventId: EntityId | null = null;
  for (const practiceKey of row.practices) {
    const practice = registry.practices.get(practiceKey);
    if (!practice) continue;
    const practiceKeyForReview = `${dueItem.stableKey}:${practiceKey}`;
    if (pressRecordByKey(next, "owner-directive", practiceKeyForReview))
      continue;
    // No random stream is created or consulted on the payroll-driven path.
    if (practice.effect === "reduce-newsroom-staff") {
      const decided = reduceNewsroomStaff(
        next,
        owner,
        practice,
        practiceKeyForReview,
        outletsHeldBy(next, owner.id),
      );
      next = decided.world;
      lastEventId = decided.eventId ?? lastEventId;
      continue;
    }
    if (practice.effect === "acquire-outlet") {
      const decided = acquireOutlet(
        next,
        owner,
        practice,
        practiceKeyForReview,
        registry,
      );
      next = decided.world;
      lastEventId = decided.eventId ?? lastEventId;
      continue;
    }
    const review = reviewRecordedPractice(
      next,
      owner,
      practice,
      practiceKeyForReview,
    );
    next = review.world;
    if (!review.selected) continue;
    const decided = carryOutPractice(
      next,
      owner,
      practice,
      `${dueItem.stableKey}:${practiceKey}`,
      registry,
    );
    next = decided.world;
    lastEventId = decided.eventId ?? lastEventId;
  }
  next = scheduleOwnerReview(next, owner, row, index + 1);
  return {
    world: next,
    status: "resolved",
    reasonKey: "press:owner-reviewed",
    context: null,
    outcomeEventId: lastEventId,
  };
}

/** A loaded owner practice is a saved preference, not a probability. */
function reviewRecordedPractice(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
): { readonly world: World; readonly selected: boolean } {
  const actorPersonId = owner.principalPersonId;
  const held = outletsHeldBy(world, owner.id);
  if (
    !actorPersonId ||
    !world.people[actorPersonId] ||
    !held.length ||
    owner.establishedAt > world.currentDate ||
    (world.control.kind === "person" &&
      world.control.personId === actorPersonId)
  )
    return { world, selected: false };
  const reviewed = recordWorldEvent(world, {
    stableKey: `${stableKey}:practice-reviewed`,
    type: "press.owner.practice-reviewed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [actorPersonId, owner.organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      PRESS_CONTRACT_VERSION,
      `press.owner:${owner.id}`,
      `press.practice:${practice.key}`,
    ],
    summary: `${owner.name} reviewed its recorded practice: ${practice.description}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: `Recorded ownership row ${owner.rowKey} includes practice ${practice.key}.`,
      immediateReaction: null,
    },
  });
  const evaluation = evaluateDecision(reviewed, {
    stableKey: `${stableKey}:decision`,
    decisionType: "media.owner-practice",
    actorPersonId,
    cutoff: currentResourceCutoff(reviewed),
    subject: {
      kind: "entity:organization",
      key: owner.organizationId,
      entityId: owner.organizationId,
    },
    options: [
      {
        key: "apply",
        label: "Apply recorded practice",
        description: practice.description,
      },
      {
        key: "wait",
        label: "Wait",
        description: "Keep the current newsroom directives.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: `${stableKey}:recorded-practice`,
        optionKey: "apply",
        sourceType: "domain:media-ownership",
        direction: "supports",
        importance: "moderate",
        confidence: "high",
        explanation: `The saved owner's practice favors this directive: ${practice.description}`,
        sourceRefs: [
          {
            kind: "historical-event",
            eventId: reviewed.history.events.at(-1)!.id,
          },
        ],
      },
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  return {
    world: recordDurableDecisionTrace(reviewed, evaluation),
    selected: evaluation.selectedOptionKey === "apply",
  };
}

function carryOutPractice(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
  registry: OwnershipRegistry,
): { readonly world: World; readonly eventId: EntityId | null } {
  const held = outletsHeldBy(world, owner.id);
  if (!ownerEffectIsSimulated(practice.effect)) {
    if (held.length === 0) return { world, eventId: null };
    return recordBlanketDirective(world, owner, practice, stableKey, held);
  }
  switch (practice.effect) {
    case "reduce-newsroom-staff":
      return reduceNewsroomStaff(world, owner, practice, stableKey, held);
    case "acquire-outlet":
      return acquireOutlet(world, owner, practice, stableKey, registry);
    case "share-content-across-outlets":
      if (held.length === 0) return { world, eventId: null };
      return recordDirective(world, owner, practice, stableKey, held, true);
  }
}

function ownerEvent(
  world: World,
  input: {
    readonly stableKey: string;
    readonly type: `press.owner.${string}`;
    readonly owner: MediaOwnerRecord;
    readonly outlets: readonly MediaOutletRecord[];
    readonly visibility: "limited" | "public";
    readonly summary: string;
    readonly practice: OwnershipPracticeRow;
    readonly motivation?: string;
    readonly sourceRecordIds?: readonly EntityId[];
    readonly lossPeriodKeys?: readonly string[];
  },
): { readonly world: World; readonly eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      ...new Set([
        input.owner.organizationId,
        ...input.outlets.map((outlet) => outlet.organizationId),
      ]),
    ].sort(),
    participants: [],
    personFactConstraints: [],
    visibility: input.visibility,
    tags: [
      PRESS_CONTRACT_VERSION,
      ...(input.lossPeriodKeys ?? []),
      `press.owner:${input.owner.id}`,
      `press.practice:${input.practice.key}`,
      ...input.outlets.map((outlet) => `press.outlet:${outlet.id}`),
      // Financial records are evidence, not event participants.
      ...[...new Set(input.sourceRecordIds ?? [])]
        .sort()
        .map((id) => `press.payroll-source:${id}`),
    ],
    summary: input.summary,
    context: {
      location: null,
      socialContext: input.owner.name,
      pressure: null,
      choice: input.practice.effect,
      motivation: input.motivation ?? null,
      immediateReaction: null,
    },
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

/** The blanket rule: the decision is on record; nothing else changes. */
function recordBlanketDirective(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
  held: readonly MediaOutletRecord[],
): { readonly world: World; readonly eventId: EntityId } {
  return recordDirective(world, owner, practice, stableKey, held, false);
}

/**
 * A standing order recorded against every outlet the owner holds. When
 * `simulated`, something else reads it: a sharing order is read by the news
 * desk each time one of the owner's outlets publishes (`sharingSiblings`).
 */
function recordDirective(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
  held: readonly MediaOutletRecord[],
  simulated: boolean,
): { readonly world: World; readonly eventId: EntityId } {
  const event = ownerEvent(world, {
    stableKey: `${stableKey}:event`,
    type: "press.owner.directive",
    owner,
    outlets: held,
    visibility: "limited",
    summary: `${owner.name}: ${practice.description}`,
    practice,
  });
  const next = appendPressRecord(event.world, "owner-directive", {
    stableKey,
    ownerId: owner.id,
    practiceKey: practice.key,
    effect: practice.effect,
    simulated,
    outletIds: held.map((outlet) => outlet.id),
    decidedAt: world.currentDate,
    eventId: event.eventId,
    endedWorkRelationshipIds: [],
    ownershipId: null,
  }).world;
  return { world: next, eventId: event.eventId };
}

/** Recorded cash and comparable current payroll, with no inferred revenue. */
function newsroomPayroll(world: World, outlet: MediaOutletRecord) {
  const cutoff = currentResourceCutoff(world);
  const work = world.history.workRelationships.filter(
    (row) =>
      row.organizationId === outlet.organizationId &&
      row.compensation === "paid" &&
      row.startedAt <= world.currentDate &&
      workStatusAt(world, row.id, cutoff)?.status === "active",
  );
  if (!work.length) return null;
  const payroll = new Map<EntityId, number>();
  const sourceIds: EntityId[] = [];
  let currency: CurrencyCode | null = null;
  let cadence: string | null = null;
  let total = 0;
  for (const job of work) {
    const flows = world.history.resourceFlows.filter(
      (flow) =>
        flow.source.kind === "organization" &&
        flow.source.organizationId === outlet.organizationId &&
        flow.recipient.kind === "person" &&
        flow.recipient.personId === job.personId &&
        flow.basisReference.kind === "work" &&
        flow.basisReference.workRelationshipId === job.id &&
        flow.startsAt <= world.currentDate,
    );
    let amount = 0;
    for (const flow of flows) {
      const terms = resourceFlowTermsAt(world, flow.id, cutoff);
      if (!terms || terms.status !== "active") continue;
      // Different periods or currencies require a recorded common budget; never guess a conversion.
      if (
        !/^schedule:(?:town-)?(?:weekly|biweekly(?:-\d)?|semimonthly|monthly)$/.test(
          terms.cadenceKind,
        ) ||
        (currency !== null && currency !== terms.amount.currency) ||
        (cadence !== null && cadence !== terms.cadenceKind)
      )
        return null;
      currency = terms.amount.currency;
      cadence = terms.cadenceKind;
      amount += terms.amount.minorUnits;
      sourceIds.push(flow.id, terms.id);
    }
    if (amount <= 0 || !Number.isSafeInteger(amount)) return null;
    payroll.set(job.id, amount);
    total += amount;
    sourceIds.push(job.id, workStatusAt(world, job.id, cutoff)!.id);
  }
  if (!currency || !cadence || !Number.isSafeInteger(total)) return null;
  const cash = resourcePositionAt(
    world,
    { kind: "organization", organizationId: outlet.organizationId },
    currency,
    cutoff,
  );
  if (!cash) return null;
  return {
    payroll,
    total,
    currency,
    cadence,
    cash: cash.liquidBalance.minorUnits,
    sourceIds: [
      ...new Set([...sourceIds, cash.positionId, ...cash.outcomeIds]),
    ],
  };
}

/** End least-senior positions only for recorded period losses beyond reserves. */
function reduceNewsroomStaff(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
  held: readonly MediaOutletRecord[],
): { readonly world: World; readonly eventId: EntityId | null } {
  const cut: ReporterRoleRecord[] = [];
  const sourceRecordIds: EntityId[] = [];
  const reasons: string[] = [];
  const lossPeriodKeys: string[] = [];
  for (const outlet of held) {
    const books = newsroomPayroll(world, outlet);
    const operating = world.townFinances?.businesses[outlet.organizationId];
    if (
      !books ||
      !operating ||
      operating.lastQuarterPay === undefined ||
      operating.lastQuarterPay <= 0 ||
      operating.lastQuarterNet >= 0 ||
      operating.cash < 0 ||
      !operating.lastRound
    )
      continue;
    const periodKey = `press.loss-period:${outlet.organizationId}:${operating.lastRound}`;
    if (world.history.events.some((event) => event.tags.includes(periodKey)))
      continue;
    const loss = Math.round(-operating.lastQuarterNet * 100);
    const reserves = Math.round(operating.cash * 100);
    const periodPayroll = Math.round(operating.lastQuarterPay * 100);
    if (
      ![loss, reserves, periodPayroll].every(Number.isSafeInteger) ||
      loss <= reserves
    )
      continue;
    const jobs = new Map(
      world.history.workRelationships.map((job) => [job.id, job]),
    );
    const candidates = reporterRoles(world, outlet.id)
      .filter(
        (role) =>
          reporterIsCurrent(world, role) &&
          books.payroll.has(role.workRelationshipId),
      )
      .sort((a, b) => {
        const left = jobs.get(a.workRelationshipId)!;
        const right = jobs.get(b.workRelationshipId)!;
        return (
          right.startedAt.localeCompare(left.startedAt) ||
          right.sequence - left.sequence
        );
      });
    let required = loss - reserves;
    const fromOutlet: ReporterRoleRecord[] = [];
    for (const role of candidates) {
      if (required <= 0) break;
      fromOutlet.push(role);
      required -=
        (books.payroll.get(role.workRelationshipId)! / books.total) *
        periodPayroll;
    }
    if (!fromOutlet.length) continue;
    cut.push(...fromOutlet);
    sourceRecordIds.push(...books.sourceIds);
    lossPeriodKeys.push(periodKey);
    reasons.push(`Recorded loss period ${operating.lastRound}.`);
    const format = (amount: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: books.currency,
      }).format(amount / 100);
    reasons.push(
      `${outlet.name} lost ${format(loss)} in its recorded quarter, beyond ${format(reserves)} in reserves; its quarter payroll was ${format(periodPayroll)}.`,
    );
  }
  if (cut.length === 0) return { world, eventId: null };
  const affected = held.filter((outlet) =>
    cut.some((role) => role.outletId === outlet.id),
  );
  const event = ownerEvent(world, {
    stableKey: `${stableKey}:event`,
    type: "press.owner.staff-reduction",
    owner,
    outlets: affected,
    visibility: "public",
    summary: `${owner.name} eliminated ${cut.length} newsroom ${cut.length === 1 ? "position" : "positions"} across ${affected.length} ${affected.length === 1 ? "outlet" : "outlets"} it owns.`,
    practice,
    motivation: reasons.join(" "),
    sourceRecordIds,
    lossPeriodKeys,
  });
  let next = event.world;
  for (const role of cut) {
    const outlet = held.find((candidate) => candidate.id === role.outletId)!;
    const status = workStatusAt(next, role.workRelationshipId)!;
    next = recordWorkStatus(next, {
      stableKey: `${stableKey}:ended:${role.id}`,
      workRelationshipId: role.workRelationshipId,
      effectiveAt: next.currentDate,
      status: "ended",
      reason: `Position eliminated because recorded quarter losses exceeded reserves; least-senior positions were ended first.`,
      provenance: { kind: "simulated-event", eventId: event.eventId },
      supersedesStatusId: status.id,
    });
    next = recordWorldEvent(next, {
      stableKey: `${stableKey}:laid-off:${role.id}`,
      type: "press.reporter-position-eliminated",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: role.geographyJurisdictionIds[0] ?? null,
      involvedEntityIds: [role.personId, outlet.organizationId].sort(),
      participants: [
        {
          personId: role.personId,
          role: "agency:reporter",
          detail: `Lost the job of ${role.title} at ${outlet.name}`,
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        PRESS_CONTRACT_VERSION,
        `press.owner:${owner.id}`,
        `press.outlet:${outlet.id}`,
      ],
      summary: `${personName(next.people[role.personId]!)} lost the job of ${role.title.toLowerCase()} at ${outlet.name} when ${owner.name} cut staff.`,
      context: {
        location: null,
        socialContext: outlet.name,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  next = appendPressRecord(next, "owner-directive", {
    stableKey,
    ownerId: owner.id,
    practiceKey: practice.key,
    effect: practice.effect,
    simulated: true,
    outletIds: held.map((outlet) => outlet.id),
    decidedAt: world.currentDate,
    eventId: event.eventId,
    endedWorkRelationshipIds: cut.map((role) => role.workRelationshipId),
    ownershipId: null,
  }).world;
  return { world: next, eventId: event.eventId };
}

/** Existing recorded asking terms only; absent valuation leaves the sale pending. */
function acquireOutlet(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
  registry: OwnershipRegistry,
): { readonly world: World; readonly eventId: EntityId | null } {
  const pending = { world, eventId: null };
  const buyerRow = ownerRowOf(registry, owner);
  const buyerActor = owner.principalPersonId;
  if (
    !buyerRow ||
    !buyerActor ||
    !world.people[buyerActor] ||
    owner.establishedAt > world.currentDate ||
    (world.control.kind === "person" && world.control.personId === buyerActor)
  )
    return pending;
  const cash = resourcePositionAt(
    world,
    { kind: "organization", organizationId: owner.organizationId },
    USD,
  );
  if (!cash) return pending;
  const choices = mediaOutlets(world).flatMap((outlet) => {
    const holding = currentOutletOwnership(world, outlet.id);
    const seller = holding
      ? mediaOwners(world).find((entry) => entry.id === holding.ownerId)
      : undefined;
    const sellerActor = seller?.principalPersonId;
    const books = world.townFinances?.businesses[outlet.organizationId];
    const dollars = registry.askingPriceDollars[outlet.resourceTier];
    const price = dollars === undefined ? null : dollars * 100;
    if (
      !holding ||
      !seller ||
      seller.id === owner.id ||
      !sellerActor ||
      !world.people[sellerActor] ||
      sellerActor === buyerActor ||
      seller.establishedAt > world.currentDate ||
      (world.control.kind === "person" &&
        world.control.personId === sellerActor) ||
      !ownerRowOf(registry, seller)?.sellsOutlets ||
      !ownerMayHold(buyerRow, outlet) ||
      !books ||
      !Number.isFinite(books.lastQuarterNet) ||
      !Number.isFinite(books.debt) ||
      (books.lastQuarterNet >= 0 && books.debt <= 0) ||
      price === null ||
      !Number.isSafeInteger(price) ||
      price <= 0 ||
      cash.liquidBalance.minorUnits < price
    )
      return [];
    return [{ outlet, holding, seller, sellerActor, books, price }];
  });
  // No saved preference distinguishes equally eligible outlets. Leave the choice pending.
  if (choices.length !== 1) return pending;
  const choice = choices[0]!;
  let next = recordWorldEvent(world, {
    stableKey: `${stableKey}:books-reviewed`,
    type: "press.owner.purchase-reviewed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: choice.outlet.primaryJurisdictionIds[0] ?? null,
    involvedEntityIds: [
      buyerActor,
      choice.sellerActor,
      owner.organizationId,
      choice.seller.organizationId,
      choice.outlet.organizationId,
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      PRESS_CONTRACT_VERSION,
      `press.outlet:${choice.outlet.id}`,
      `press.cash-source:${cash.positionId}`,
    ],
    summary: `Recorded books and existing asking terms were reviewed for ${choice.outlet.name}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: `Recorded quarter net ${choice.books.lastQuarterNet}; recorded debt ${choice.books.debt}; asking price ${choice.price} minor units; buyer cash ${cash.liquidBalance.minorUnits} minor units.`,
      immediateReaction: null,
    },
  });
  const evidence = next.history.events.at(-1)!;
  const decide = (
    actorPersonId: EntityId,
    action: "sell" | "buy",
    explanation: string,
  ) => {
    const evaluation = evaluateDecision(next, {
      stableKey: `${stableKey}:${action}`,
      decisionType: `media.${action}`,
      actorPersonId,
      cutoff: currentResourceCutoff(next),
      subject: {
        kind: "entity:organization",
        key: choice.outlet.organizationId,
        entityId: choice.outlet.organizationId,
      },
      options: [
        { key: action, label: action, description: explanation },
        {
          key: "wait",
          label: "Wait",
          description: "Keep the existing holding and cash.",
        },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: `${stableKey}:${action}:recorded-basis`,
          optionKey: action,
          sourceType: "domain:media-ownership",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation,
          sourceRefs: [{ kind: "historical-event", eventId: evidence.id }],
        },
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    return evaluation.selectedOptionKey === action;
  };
  if (
    !decide(
      choice.sellerActor,
      "sell",
      "Recorded outlet losses or debt favor selling at the existing asking terms.",
    )
  )
    return { world: next, eventId: null };
  if (
    !decide(
      buyerActor,
      "buy",
      `${practice.description} Actual recorded cash covers the asking terms.`,
    )
  )
    return { world: next, eventId: null };
  const event = ownerEvent(next, {
    stableKey: `${stableKey}:event`,
    type: "press.owner.acquisition",
    owner,
    outlets: [choice.outlet],
    visibility: "public",
    summary: `${owner.name} bought ${choice.outlet.name} from ${choice.seller.name}.`,
    practice,
    motivation:
      "Both recorded principals selected the transaction from recorded books, asking terms and cash.",
    sourceRecordIds: [
      cash.positionId,
      evidence.id,
      ...next.history.decisionTraces.slice(-2).map((trace) => trace.id),
    ],
  });
  const paid = recordMediaPurchasePayment(event.world, {
    stableKey,
    buyerOrganizationId: owner.organizationId,
    decisionMakerPersonId: buyerActor,
    sellerOrganizationId: choice.seller.organizationId,
    sellerName: choice.seller.name,
    outletName: choice.outlet.name,
    jurisdictionId: choice.outlet.primaryJurisdictionIds[0] ?? null,
    eventId: event.eventId,
    priceMinorUnits: choice.price,
  });
  if (paid === event.world) return { world: paid, eventId: null };
  const holding = appendPressRecord(paid, "outlet-ownership", {
    stableKey: `${HOLDING_KEY}${choice.outlet.id}:${choice.holding.sequence}`,
    outletId: choice.outlet.id,
    ownerId: owner.id,
    basis: "acquisition",
    effectiveAt: world.currentDate,
    eventId: event.eventId,
    supersedesOwnershipId: choice.holding.id,
  });
  return {
    world: appendPressRecord(holding.world, "owner-directive", {
      stableKey,
      ownerId: owner.id,
      practiceKey: practice.key,
      effect: practice.effect,
      simulated: true,
      outletIds: [choice.outlet.id],
      decidedAt: world.currentDate,
      eventId: event.eventId,
      endedWorkRelationshipIds: [],
      ownershipId: holding.record.id,
    }).world,
    eventId: event.eventId,
  };
}

/* -------------------------------------------------------------------------- */
/* A person buying an outlet                                                   */
/* -------------------------------------------------------------------------- */

const USD = makeCurrencyCode("USD");

export type OutletPurchaseTerms =
  | {
      readonly status: "available";
      readonly outletId: EntityId;
      readonly sellerName: string;
      readonly priceMinorUnits: number;
    }
  | {
      readonly status:
        | "already-yours"
        | "no-recorded-owner"
        | "not-for-sale"
        | "no-price"
        | "savings-not-on-record"
        | "cannot-afford";
      readonly outletId: EntityId;
      /** A sentence the player reads. */
      readonly reason: string;
      readonly priceMinorUnits: number | null;
    };

/**
 * Whether this person can buy this outlet today, and for how much. Reads
 * only; the purchase itself is `purchaseOutlet`.
 *
 * NOT MODELED YET, with the blanket rule standing in: an outlet's price is
 * the loaded pack's asking price for its size, not a valuation, and there is
 * no negotiation, financing or seller's refusal. Money is only what the
 * record holds: a person whose savings are not on record cannot buy, rather
 * than being assumed to have none or enough.
 */
export function outletPurchaseTerms(
  world: World,
  buyerPersonId: EntityId,
  outletId: EntityId,
  registry: OwnershipRegistry = loadedOwnershipRegistry(),
): OutletPurchaseTerms {
  const outlet = mediaOutlets(world).find((entry) => entry.id === outletId);
  if (!outlet) throw new Error(`No such outlet: ${outletId}`);
  const owner = outletOwner(world, outletId);
  const dollars = registry.askingPriceDollars[outlet.resourceTier];
  const price = dollars === undefined ? null : dollars * 100;
  const refuse = (
    status: Exclude<OutletPurchaseTerms["status"], "available">,
    reason: string,
  ): OutletPurchaseTerms => ({
    status,
    outletId,
    reason,
    priceMinorUnits: price,
  });
  if (!owner) {
    return refuse(
      "no-recorded-owner",
      `Nobody is on record as owning ${outlet.name}, so there is no one to buy it from.`,
    );
  }
  if (owner.principalPersonId === buyerPersonId) {
    return refuse("already-yours", `You already own ${outlet.name}.`);
  }
  if (!ownerRowOf(registry, owner)?.sellsOutlets) {
    return refuse(
      "not-for-sale",
      `${owner.name} is not selling ${outlet.name}.`,
    );
  }
  if (price === null) {
    return refuse(
      "no-price",
      `No asking price is set for an outlet the size of ${outlet.name}.`,
    );
  }
  const savings = resourcePositionAt(
    world,
    { kind: "person", personId: buyerPersonId },
    USD,
    currentResourceCutoff(world),
  );
  if (!savings) {
    return refuse(
      "savings-not-on-record",
      "Your savings are not on record, so there is nothing to pay from.",
    );
  }
  if (savings.liquidBalance.minorUnits < price) {
    return refuse(
      "cannot-afford",
      `${owner.name} is asking more than you have.`,
    );
  }
  return {
    status: "available",
    outletId,
    sellerName: owner.name,
    priceMinorUnits: price,
  };
}

/**
 * A person buys an outlet outright: the money goes from their savings to the
 * seller, and the outlet's holding passes to an owner that is that person.
 * Refuses, and changes nothing, unless `outletPurchaseTerms` is available.
 */
export function purchaseOutlet(
  world: World,
  input: {
    readonly stableKey: string;
    readonly buyerPersonId: EntityId;
    readonly outletId: EntityId;
  },
  registry: OwnershipRegistry = loadedOwnershipRegistry(),
): World {
  const terms = outletPurchaseTerms(
    world,
    input.buyerPersonId,
    input.outletId,
    registry,
  );
  if (terms.status !== "available") throw new Error(terms.reason);
  const buyer = world.people[input.buyerPersonId];
  if (!buyer) throw new Error(`No such person: ${input.buyerPersonId}`);
  const outlet = mediaOutlets(world).find(
    (entry) => entry.id === input.outletId,
  )!;
  const holding = currentOutletOwnership(world, outlet.id)!;
  const seller = outletOwner(world, outlet.id)!;
  const buyerName = personName(buyer);

  let next = world;
  const ownerKey = `${OWNER_KEY}person:${buyer.id}`;
  let owner = pressRecordByKey(next, "media-owner", ownerKey);
  if (!owner) {
    next = createOrganization(next, {
      stableKey: `${ownerKey}:organization`,
      formedAt: next.currentDate,
      detailLevel: "detailed",
      provenance: {
        kind: "authored",
        note: "The holding through which a person owns news outlets outright.",
      },
      initialProfile: {
        name: buyerName,
        classification: "enterprise:media-ownership",
        locationJurisdictionId: buyer.homeJurisdictionId,
      },
    });
    const appended = appendPressRecord(next, "media-owner", {
      stableKey: ownerKey,
      organizationId: next.history.organizations.at(-1)!.id,
      packId: "person",
      rowKey: "owner.person",
      name: buyerName,
      ownerKind: "individual",
      establishedAt: next.currentDate,
      principalPersonId: buyer.id,
    });
    next = appended.world;
    owner = appended.record;
  }

  next = recordWorldEvent(next, {
    stableKey: `${input.stableKey}:event`,
    type: "press.owner.acquisition",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: outlet.primaryJurisdictionIds[0] ?? null,
    involvedEntityIds: [
      buyer.id,
      owner.organizationId,
      seller.organizationId,
      outlet.organizationId,
    ].sort(),
    participants: [
      {
        personId: buyer.id,
        role: "agency:actor",
        detail: `Bought ${outlet.name} from ${seller.name}`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      PRESS_CONTRACT_VERSION,
      `press.owner:${owner.id}`,
      `press.outlet:${outlet.id}`,
      "provenance:player-choice",
    ],
    summary: `${buyerName} bought ${outlet.name} from ${seller.name}.`,
    context: {
      location: null,
      socialContext: outlet.name,
      pressure: null,
      choice: "acquire-outlet",
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordMediaPurchasePayment(next, {
    stableKey: input.stableKey,
    buyerPersonId: buyer.id,
    sellerOrganizationId: seller.organizationId,
    sellerName: seller.name,
    outletName: outlet.name,
    jurisdictionId: outlet.primaryJurisdictionIds[0] ?? null,
    eventId: event.id,
    priceMinorUnits: terms.priceMinorUnits,
  });
  return appendPressRecord(next, "outlet-ownership", {
    stableKey: `${HOLDING_KEY}${outlet.id}:${holding.sequence}`,
    outletId: outlet.id,
    ownerId: owner.id,
    basis: "acquisition",
    effectiveAt: next.currentDate,
    eventId: event.id,
    supersedesOwnershipId: holding.id,
  }).world;
}
