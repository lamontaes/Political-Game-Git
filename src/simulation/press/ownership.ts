import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { createOrganization, recordWorkStatus } from "../life";
import { workStatusAt } from "../life-queries";
import { personName } from "../people";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
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
 * independent outlet, or a practice whose effect is not simulated yet, which
 * the blanket rule records against every outlet it holds without changing
 * anything else.
 *
 * NOT MODELLED YET, with the blanket rule standing in:
 * - Why an owner decides. There is no media revenue, debt or audience model,
 *   so every decision is the pack's `likelihoodPerReview` draw.
 * - Whether a decision is news. Owner events use the `press.` prefix, which
 *   the desk excludes, so none of them reaches a front page until the owner
 *   of newsworthiness admits them.
 * - What a reporter does after losing the job. The job ends through the
 *   ordinary work writer; nothing yet looks for new work on their behalf.
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
      (row) => row.foundingWeight > 0 && ownerMayHold(row, outlet),
    );
    if (eligible.length === 0) continue;
    const rng = new SeededRng(world.seed).fork(
      `press:ownership:founding:${outlet.stableKey}`,
    );
    const row = weightedPick(rng, eligible);
    const owned = ensureOwner(next, row, outlet);
    next = appendPressRecord(owned.world, "outlet-ownership", {
      stableKey: `${HOLDING_KEY}${outlet.id}:0`,
      outletId: outlet.id,
      ownerId: owned.owner.id,
      basis: "founding-owner",
      effectiveAt: outlet.establishedAt,
      eventId: null,
      supersedesOwnershipId: null,
    }).world;
  }
  return next;
}

function weightedPick(
  rng: SeededRng,
  rows: readonly LoadedOwnershipOwner[],
): LoadedOwnershipOwner {
  const total = rows.reduce((sum, row) => sum + row.foundingWeight, 0);
  let draw = rng.next() * total;
  for (const row of rows) {
    draw -= row.foundingWeight;
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
  return scheduleFutureDueItem(world, {
    stableKey: `${owner.stableKey}:review:${index}`,
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
 * One owner's review. Each practice is drawn independently, in the row's
 * order, and each decision applies to what the owner holds at that moment.
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
    const rng = new SeededRng(world.seed).fork(
      `${dueItem.stableKey}:${practiceKey}`,
    );
    if (rng.next() >= practice.likelihoodPerReview) continue;
    const decided = carryOutPractice(
      next,
      owner,
      practice,
      `${dueItem.stableKey}:${practiceKey}`,
      rng.fork("effect"),
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

function carryOutPractice(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
  rng: SeededRng,
  registry: OwnershipRegistry,
): { readonly world: World; readonly eventId: EntityId | null } {
  const held = outletsHeldBy(world, owner.id);
  if (!ownerEffectIsSimulated(practice.effect)) {
    if (held.length === 0) return { world, eventId: null };
    return recordBlanketDirective(world, owner, practice, stableKey, held);
  }
  switch (practice.effect) {
    case "reduce-newsroom-staff":
      return reduceNewsroomStaff(world, owner, practice, stableKey, held, rng);
    case "acquire-outlet":
      return acquireOutlet(world, owner, practice, stableKey, rng, registry);
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
  },
): { readonly world: World; readonly eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      input.owner.organizationId,
      ...input.outlets.map((outlet) => outlet.organizationId),
    ].sort(),
    participants: [],
    personFactConstraints: [],
    visibility: input.visibility,
    tags: [
      PRESS_CONTRACT_VERSION,
      `press.owner:${input.owner.id}`,
      `press.practice:${input.practice.key}`,
      ...input.outlets.map((outlet) => `press.outlet:${outlet.id}`),
    ],
    summary: input.summary,
    context: {
      location: null,
      socialContext: input.owner.name,
      pressure: null,
      choice: input.practice.effect,
      motivation: null,
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
    simulated: false,
    outletIds: held.map((outlet) => outlet.id),
    decidedAt: world.currentDate,
    eventId: event.eventId,
    endedWorkRelationshipIds: [],
    ownershipId: null,
  }).world;
  return { world: next, eventId: event.eventId };
}

/**
 * One cost-cutting round across every outlet the owner holds. The cut is a
 * share of the owner's whole newsroom headcount, taken from the outlets with
 * the most staff first, and never below each outlet's kept minimum.
 */
function reduceNewsroomStaff(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
  held: readonly MediaOutletRecord[],
  rng: SeededRng,
): { readonly world: World; readonly eventId: EntityId | null } {
  const share = practice.parameters?.shareOfPositions ?? 0.25;
  const kept = practice.parameters?.minimumPositionsKept ?? 1;
  const staff = new Map<EntityId, ReporterRoleRecord[]>(
    held.map((outlet) => [
      outlet.id,
      reporterRoles(world, outlet.id).filter((role) =>
        reporterIsCurrent(world, role),
      ),
    ]),
  );
  const total = [...staff.values()].reduce((sum, list) => sum + list.length, 0);
  let toCut = Math.floor(total * share);
  const cut: ReporterRoleRecord[] = [];
  while (toCut > 0) {
    const candidates = held
      .map((outlet) => ({ outlet, roles: staff.get(outlet.id)! }))
      .filter(({ roles }) => roles.length > kept)
      .sort(
        (left, right) =>
          right.roles.length - left.roles.length ||
          left.outlet.sequence - right.outlet.sequence,
      );
    const from = candidates[0];
    if (!from) break;
    const index = rng.integer(0, from.roles.length);
    cut.push(from.roles[index]!);
    from.roles.splice(index, 1);
    toCut -= 1;
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
      reason: `Position eliminated when ${owner.name} cut staff across its outlets.`,
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

/** Buys one outlet whose owner sells and which this owner may hold. */
function acquireOutlet(
  world: World,
  owner: MediaOwnerRecord,
  practice: OwnershipPracticeRow,
  stableKey: string,
  rng: SeededRng,
  registry: OwnershipRegistry,
): { readonly world: World; readonly eventId: EntityId | null } {
  const buyer = ownerRowOf(registry, owner);
  if (!buyer) return { world, eventId: null };
  const owners = new Map(mediaOwners(world).map((entry) => [entry.id, entry]));
  const forSale = mediaOutlets(world).flatMap((outlet) => {
    const holding = currentOutletOwnership(world, outlet.id);
    const seller = holding ? owners.get(holding.ownerId) : undefined;
    const sellerRow = seller ? ownerRowOf(registry, seller) : null;
    return holding &&
      seller &&
      seller.id !== owner.id &&
      sellerRow?.sellsOutlets &&
      ownerMayHold(buyer, outlet)
      ? [{ outlet, holding, seller }]
      : [];
  });
  if (forSale.length === 0) return { world, eventId: null };
  const { outlet, holding, seller } = rng.pick(forSale);
  const event = ownerEvent(world, {
    stableKey: `${stableKey}:event`,
    type: "press.owner.acquisition",
    owner,
    outlets: [outlet],
    visibility: "public",
    summary: `${owner.name} bought ${outlet.name} from ${seller.name}.`,
    practice,
  });
  const ownership = appendPressRecord(event.world, "outlet-ownership", {
    stableKey: `${HOLDING_KEY}${outlet.id}:${holding.sequence}`,
    outletId: outlet.id,
    ownerId: owner.id,
    basis: "acquisition",
    effectiveAt: world.currentDate,
    eventId: event.eventId,
    supersedesOwnershipId: holding.id,
  });
  const next = appendPressRecord(ownership.world, "owner-directive", {
    stableKey,
    ownerId: owner.id,
    practiceKey: practice.key,
    effect: practice.effect,
    simulated: true,
    outletIds: [outlet.id],
    decidedAt: world.currentDate,
    eventId: event.eventId,
    endedWorkRelationshipIds: [],
    ownershipId: ownership.record.id,
  }).world;
  return { world: next, eventId: event.eventId };
}
