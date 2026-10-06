import { addDays } from "../dates";
import { candidacyPackById } from "../candidacy-packs";
import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "../future-transitions";
import { createFutureTransitionHandlerRegistry } from "../future-transition-registry";
import {
  hasStableKey,
  indexFollowingAppends,
  recordsByKey,
  recordsWithFieldValue,
} from "../history-index";
import type {
  EntityId,
  IsoDate,
  FutureDueItem,
  FutureTransitionHandler,
  World,
} from "../types";
import { withWorldIntegrityDeferred, assertWorldIntegrity } from "../world";
import {
  STATE_LEGISLATURE_KEYS,
  STATE_LEGISLATURE_OPENING_VERSION,
} from "./state-legislature-opening";
import {
  dispatchStateLegislatureWake,
  stateLegislatureWakePlan,
  applyStateLegislatureTurnover,
  type StateLegislatureWake,
} from "./state-legislature-turnover";

export const STATE_LEGISLATURE_WAKE_TRANSITION =
  "state-legislature:dated-wake-v1" as const;
const VERSION = "state-legislature-queue/v1";
interface SavedWake extends StateLegislatureWake {
  readonly version: typeof VERSION;
  readonly revision: string;
  readonly throughYear: number;
}

// Append-aware fingerprints retain only a digest, not duplicated source histories.
interface SourceRow {
  readonly id: EntityId;
  readonly sequence: number;
}
const revisionMemo = new Map<
  string,
  { eventRevision: string; sources: readonly unknown[]; revision: string }
>();
const planMemo = new Map<
  string,
  {
    revision: string;
    throughYear: number;
    plans: readonly StateLegislatureWake[];
    plannedOn: string;
  }
>();
const signatures = new Map<
  string,
  { cache: WeakMap<object, string>; recent: (readonly unknown[])[] }
>();
function signature(
  key: string,
  rows: readonly SourceRow[],
  relevant: (row: SourceRow) => boolean,
): string {
  let memo = signatures.get(key);
  if (!memo) {
    memo = { cache: new WeakMap(), recent: [] };
    signatures.set(key, memo);
  }
  const extend = (previous: string, from: number) => {
    let digest = previous;
    for (let i = from; i < rows.length; i++) {
      const row = rows[i]!;
      if (relevant(row))
        digest = createStableId("event", `${digest}|${JSON.stringify(row)}`);
    }
    return digest;
  };
  return indexFollowingAppends(
    memo.cache,
    memo.recent,
    rows,
    () => extend(key, 0),
    extend,
  );
}

/** A source append unrelated to this pack does not change its calendar revision. */
export function stateLegislatureQueueRevision(
  world: World,
  packId: string,
): string {
  const pack = candidacyPackById(packId);
  if (!pack) throw new Error(`Missing state candidacy pack: ${packId}`);
  const body = createStableId(
    "organization",
    `${world.id}:${STATE_LEGISLATURE_KEYS.body(packId)}`,
  );
  const history = world.history;
  const eventRevision = signature(
    `${world.id}:${packId}:events`,
    history.events,
    (r) => {
      const event = r as (typeof history.events)[number];
      return (
        event.involvedEntityIds.includes(body) ||
        event.tags.some(
          (t) => t === `pack:${packId}` || t.startsWith(`seat:${packId}|`),
        ) ||
        /law|rule|binding|district/.test(event.type)
      );
    },
  );
  const sources = [
    history.workRelationships,
    history.workStatuses,
    history.workRoles,
    history.electionContests,
    history.electionContestResults,
    history.campaigns,
    history.campaignStates,
    history.legislativeEnactments,
    history.legislativeProvisions,
    history.ruleChangeProvisions,
    history.ruleChangeConsequenceBindings,
    history.constitutionalMeasures,
    history.constitutionalActions,
    history.constitutionalRuleVersions,
  ];
  const memoKey = `${world.id}:${packId}`;
  const memo = revisionMemo.get(memoKey);
  if (
    memo &&
    memo.eventRevision === eventRevision &&
    sources.every((v, i) => v === memo.sources[i])
  )
    return memo.revision;
  const works = recordsWithFieldValue(
    history.workRelationships,
    "organizationId",
    body,
  );
  const workIds = new Set(works.map((r) => r.id));
  const officeKeys = new Set(pack.offices.map((o) => o.officeKey));
  const contests = (history.electionContests ?? []).filter((r) =>
    officeKeys.has(r.office.officeKey),
  );
  const contestIds = new Set(contests.map((r) => r.id));
  const campaigns = recordsWithFieldValue(
    history.campaigns ?? [],
    "candidacyPackId",
    packId,
  );
  const campaignIds = new Set(campaigns.map((r) => r.id));
  const fragments = [eventRevision];
  const add = (
    family: string,
    rows: readonly SourceRow[],
    relevant: (r: SourceRow) => boolean = () => true,
  ) =>
    fragments.push(
      signature(`${world.id}:${packId}:${family}`, rows, relevant),
    );
  add(
    "works",
    history.workRelationships,
    (r) =>
      (r as (typeof history.workRelationships)[number]).organizationId === body,
  );
  add("contests", history.electionContests ?? [], (r) =>
    officeKeys.has(
      (r as NonNullable<typeof history.electionContests>[number]).office
        .officeKey,
    ),
  );
  add(
    "campaigns",
    history.campaigns ?? [],
    (r) =>
      (r as NonNullable<typeof history.campaigns>[number]).candidacyPackId ===
      packId,
  );
  add(`workStatuses:${[...workIds].join("|")}`, history.workStatuses, (r) =>
    workIds.has(
      (r as (typeof history.workStatuses)[number]).workRelationshipId,
    ),
  );
  add(`workRoles:${[...workIds].join("|")}`, history.workRoles, (r) =>
    workIds.has((r as (typeof history.workRoles)[number]).workRelationshipId),
  );
  add(
    `contestResults:${[...contestIds].join("|")}`,
    history.electionContestResults ?? [],
    (r) =>
      contestIds.has(
        (r as NonNullable<typeof history.electionContestResults>[number])
          .contestId,
      ),
  );
  add(
    `campaignStates:${[...campaignIds].join("|")}`,
    history.campaignStates ?? [],
    (r) =>
      campaignIds.has(
        (r as NonNullable<typeof history.campaignStates>[number]).campaignId,
      ),
  );
  for (const family of [
    "legislativeEnactments",
    "legislativeProvisions",
    "ruleChangeProvisions",
    "ruleChangeConsequenceBindings",
    "constitutionalMeasures",
    "constitutionalActions",
    "constitutionalRuleVersions",
  ] as const)
    add(family, history[family] ?? []);
  const revision = createStableId("event", `${VERSION}|${fragments.join("|")}`);
  revisionMemo.set(memoKey, { eventRevision, sources, revision });
  return revision;
}

const savedWakeMemo = new WeakMap<
  FutureDueItem,
  {
    note: string;
    stableKey: string;
    dueAt: IsoDate;
    jurisdictionId: EntityId | null;
    saved: SavedWake;
  }
>();
export function readStateLegislatureSavedWake(item: FutureDueItem): SavedWake {
  if (
    item.transitionKey !== STATE_LEGISLATURE_WAKE_TRANSITION ||
    item.provenance.kind !== "authored"
  )
    throw new Error("Not a state legislature queue wake.");
  const cached = savedWakeMemo.get(item);
  if (
    cached &&
    cached.note === item.provenance.note &&
    cached.stableKey === item.stableKey &&
    cached.dueAt === item.dueAt &&
    cached.jurisdictionId === item.jurisdictionId
  )
    return cached.saved;
  const saved = JSON.parse(item.provenance.note) as SavedWake;
  if (
    saved.version !== VERSION ||
    !candidacyPackById(saved.packId) ||
    saved.dueAt !== item.dueAt ||
    !Number.isInteger(saved.throughYear) ||
    !saved.revision ||
    !["intake", "nomination", "ballot", "election", "term"].includes(
      saved.stage,
    )
  )
    throw new Error("Invalid saved state legislature queue wake.");
  const pack = candidacyPackById(saved.packId)!;
  const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  const base = `${VERSION}:${saved.packId}:${saved.electionDay}:${saved.stage}:${saved.dueAt}:${saved.revision}`;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(saved.electionDay) ||
    Number(saved.electionDay.slice(0, 4)) > saved.throughYear ||
    item.jurisdictionId !== jurisdiction?.id ||
    !(
      item.stableKey === base ||
      item.stableKey.startsWith(`${base}:reschedule:`)
    )
  )
    throw new Error(
      "Saved state legislature identity does not match its payload.",
    );
  savedWakeMemo.set(item, {
    note: item.provenance.note,
    stableKey: item.stableKey,
    dueAt: item.dueAt,
    jurisdictionId: item.jurisdictionId,
    saved: Object.freeze(saved),
  });
  return saved;
}

// Index only queue rows, in original history order. A reload/replacement builds
// from its own array; an append extends the existing immutable-row projection.
function wakeIndexKeys(item: FutureDueItem): readonly string[] {
  if (item.transitionKey !== STATE_LEGISLATURE_WAKE_TRANSITION) return [];
  const saved = readStateLegislatureSavedWake(item);
  return [
    JSON.stringify([saved.packId]),
    ...item.entityIds.flatMap((source) => [
      JSON.stringify([saved.packId, saved.revision, source]),
      JSON.stringify([saved.packId, saved.revision, source, saved.throughYear]),
      JSON.stringify([
        saved.packId,
        saved.revision,
        source,
        saved.throughYear,
        saved.dueAt,
      ]),
    ]),
  ];
}
function indexedWakes(
  world: World,
  key: readonly unknown[],
): readonly FutureDueItem[] {
  return recordsByKey(
    world.history.futureDueItems,
    "state-legislature:clock-wakes-by-source:v1",
    wakeIndexKeys,
    JSON.stringify(key),
  );
}

const wakeDatesMemo = new WeakMap<
  readonly FutureDueItem[],
  readonly IsoDate[]
>();
function futureWakeDates(
  items: readonly FutureDueItem[],
  date: IsoDate,
): readonly IsoDate[] {
  let dates = wakeDatesMemo.get(items);
  if (!dates) {
    dates = [...new Set(items.map((item) => item.dueAt))].sort();
    wakeDatesMemo.set(items, dates);
  }
  let low = 0,
    high = dates.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (dates[middle]! <= date) low = middle + 1;
    else high = middle;
  }
  return dates.slice(low);
}

/**
 * Prepare only the next boundary of one already-opened pack. Call after legacy
 * opening/catch-up and after relevant source writes, before the canonical clock.
 * No current/past due date is scheduled or backdated by this API.
 */
export function reconcileStateLegislatureQueue(
  world: World,
  packId: string,
  throughYear: number,
): World {
  if (
    !Number.isInteger(throughYear) ||
    throughYear < Number(world.currentDate.slice(0, 4))
  )
    throw new Error("Invalid state queue horizon.");
  throughYear = Math.max(
    throughYear,
    Number(world.currentDate.slice(0, 4)) + 4,
  );
  const pack = candidacyPackById(packId);
  const opening = recordsWithFieldValue(
    world.history.events,
    "type",
    "world.state-legislature-opening",
  ).find(
    (e) =>
      e.tags.includes(`pack:${packId}`) &&
      e.tags.includes(STATE_LEGISLATURE_OPENING_VERSION),
  );
  if (!pack || !opening) return world;
  const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
  if (!jurisdiction) return world;
  const revision = stateLegislatureQueueRevision(world, packId);
  const planKey = `${world.id}:${packId}`;
  const cached = planMemo.get(planKey);
  const plans =
    cached &&
    cached.revision === revision &&
    cached.throughYear === throughYear &&
    cached.plannedOn <= world.currentDate &&
    (!cached.plans[0] || world.currentDate < cached.plans[0].dueAt)
      ? cached.plans
      : stateLegislatureWakePlan(world, packId, throughYear);
  planMemo.set(planKey, {
    revision,
    throughYear,
    plans,
    plannedOn: world.currentDate,
  });
  const nextDate = plans[0]?.dueAt;
  const nextPlans = plans.filter((p) => p.dueAt === nextDate);
  const saved: SavedWake[] = nextPlans.map((p) => ({
    ...p,
    version: VERSION,
    revision,
    throughYear,
  }));
  const key = (p: SavedWake) =>
    `${VERSION}:${p.packId}:${p.electionDay}:${p.stage}:${p.dueAt}:${p.revision}`;
  const desired = new Set(saved.map(key));
  const next = withWorldIntegrityDeferred(() => {
    let working = world;
    for (const item of indexedWakes(world, [packId])) {
      if (
        item.transitionKey !== STATE_LEGISLATURE_WAKE_TRANSITION ||
        item.dueAt <= world.currentDate
      )
        continue;
      const old = readStateLegislatureSavedWake(item);
      if (
        old.packId !== packId ||
        [...desired].some(
          (k) =>
            item.stableKey === k ||
            item.stableKey.startsWith(`${k}:reschedule:`),
        ) ||
        futureDueItemStateAt(working, item.id, {
          asOfDate: working.currentDate,
          historySequenceExclusive: working.history.nextSequence,
        })?.status !== "scheduled"
      )
        continue;
      working = cancelFutureDueItem(working, {
        stableKey: `${item.stableKey}:cancel:${revision}:${world.currentDate}`,
        dueItemId: item.id,
        effectiveAt: world.currentDate,
        reasonKey: "state-legislature:source-revised",
        context: "Replaced by the pack's next exact dated boundary.",
      });
    }
    for (const p of saved) {
      let stableKey = key(p);
      const prior = indexedWakes(working, [packId])
        .filter(
          (i) =>
            i.transitionKey === STATE_LEGISLATURE_WAKE_TRANSITION &&
            (i.stableKey === stableKey ||
              i.stableKey.startsWith(`${stableKey}:reschedule:`)),
        )
        .at(-1);
      if (prior) {
        const state = futureDueItemStateAt(working, prior.id, {
          asOfDate: working.currentDate,
          historySequenceExclusive: working.history.nextSequence,
        });
        if (state?.status !== "cancelled") continue;
        stableKey = `${stableKey}:reschedule:${state.sequence}`;
      }
      if (hasStableKey(working.history.futureDueItems, stableKey)) continue;
      working = scheduleFutureDueItem(working, {
        stableKey,
        dueAt: p.dueAt,
        transitionKey: STATE_LEGISLATURE_WAKE_TRANSITION,
        entityIds: [opening.id],
        jurisdictionId: jurisdiction.id,
        provenance: { kind: "authored", note: JSON.stringify(p) },
      });
    }
    return working;
  });
  if (next !== world) assertWorldIntegrity(next);
  return next;
}

/** Registry is exported for owner composition; no consumer registry is edited. */
export const stateLegislatureWakeHandler: FutureTransitionHandler = (
  world,
  item,
) => {
  const wake = readStateLegislatureSavedWake(item);
  if (world.currentDate !== wake.dueAt)
    throw new Error("State queue handler requires its due date.");
  // Consumers reconcile source changes before advancing. A stale wake must not
  // execute an obsolete date; it terminates and replaces only future work.
  if (
    stateLegislatureQueueRevision(world, wake.packId) !== wake.revision &&
    !stateLegislatureWakePlan(world, wake.packId, wake.throughYear, true).some(
      (p) =>
        p.stage === wake.stage &&
        p.electionDay === wake.electionDay &&
        p.dueAt === wake.dueAt,
    )
  )
    return {
      world: reconcileStateLegislatureQueue(
        world,
        wake.packId,
        Math.max(wake.throughYear, Number(world.currentDate.slice(0, 4)) + 1),
      ),
      status: "cancelled",
      reasonKey: "state-legislature:source-revised",
      context: "The recorded source no longer calls for this dated boundary.",
      outcomeEventId: null,
    };
  const opening = world.history.events.find(
    (e) =>
      item.entityIds.includes(e.id) &&
      e.type === "world.state-legislature-opening" &&
      e.tags.includes(`pack:${wake.packId}`) &&
      e.tags.includes(STATE_LEGISLATURE_OPENING_VERSION),
  );
  if (!opening)
    throw new Error("State wake is missing its canonical opening source.");
  const next = dispatchStateLegislatureWake(world, wake);
  return {
    world: reconcileStateLegislatureQueue(
      next,
      wake.packId,
      Math.max(wake.throughYear, Number(world.currentDate.slice(0, 4)) + 1),
    ),
    status: "resolved",
    reasonKey: null,
    context: null,
    outcomeEventId: null,
  };
};
export const STATE_LEGISLATURE_QUEUE_HANDLERS =
  createFutureTransitionHandlerRegistry([
    [STATE_LEGISLATURE_WAKE_TRANSITION, stateLegislatureWakeHandler],
  ]);

/** Preserve the existing opening/late-field catch-up once, then register wakes. */
export function prepareStateLegislatureQueue(
  world: World,
  before: IsoDate,
  throughYear: number,
): World {
  let next = applyStateLegislatureTurnover(before, world);
  const packs = new Set(
    recordsWithFieldValue(
      next.history.events,
      "type",
      "world.state-legislature-opening",
    )
      .filter((e) => e.tags.includes(STATE_LEGISLATURE_OPENING_VERSION))
      .flatMap((e) =>
        e.tags.filter((t) => t.startsWith("pack:")).map((t) => t.slice(5)),
      ),
  );
  for (const packId of packs)
    next = reconcileStateLegislatureQueue(next, packId, throughYear);
  return next;
}

/** Prepare the canonical clock once, then revise only recorded pack calendars.
 * The durable wake is the bootstrap marker, so reload does not repeat intake.
 */
export function prepareStateLegislatureClock(world: World): World {
  const openings = recordsWithFieldValue(
    world.history.events,
    "type",
    "world.state-legislature-opening",
  ).filter((e) => e.tags.includes(STATE_LEGISLATURE_OPENING_VERSION));
  if (openings.length === 0) return world;
  const packs = new Set(
    openings.flatMap((e) =>
      e.tags.filter((t) => t.startsWith("pack:")).map((t) => t.slice(5)),
    ),
  );
  const horizon = Number(world.currentDate.slice(0, 4)) + 4;
  let next = world;
  const checkpoints = [...packs].map((packId) => {
    const opening = openings.find((e) => e.tags.includes(`pack:${packId}`))!;
    const revision = stateLegislatureQueueRevision(world, packId);
    const saved = indexedWakes(world, [packId, revision, opening.id]);
    return { packId, opening, revision, saved };
  });
  const needsCatchUp = checkpoints.some(({ saved }) => saved.length === 0);
  // A changed recorded source can create a late intake obligation. Catch it up
  // once through the original writer; an unchanged date does no intake work.
  if (needsCatchUp)
    next = prepareStateLegislatureQueue(
      next,
      addDays(next.currentDate, -1),
      horizon,
    );
  for (const { packId, opening, revision } of checkpoints) {
    // The saved revision is the authoritative source key. On an unchanged
    // quiet date, retain the queue without reparsing/walking its full history.
    // Status checks keep explicit cancellation and old snapshots authoritative.
    const horizonWakes = indexedWakes(next, [
      packId,
      revision,
      opening.id,
      horizon,
    ]);
    const dates = futureWakeDates(horizonWakes, next.currentDate);
    // Imported/revised queues may contain several dates in append order.
    // Only a single future boundary can bypass authoritative reconciliation.
    if (!needsCatchUp && dates.length === 1) {
      const due = indexedWakes(next, [
        packId,
        revision,
        opening.id,
        horizon,
        dates[0]!,
      ]);
      if (
        due.length > 0 &&
        due.every(
          (item) =>
            futureDueItemStateAt(next, item.id, {
              asOfDate: next.currentDate,
              historySequenceExclusive: next.history.nextSequence,
            })?.status === "scheduled",
        )
      )
        continue;
    }
    next = reconcileStateLegislatureQueue(next, packId, horizon);
  }
  return next;
}
