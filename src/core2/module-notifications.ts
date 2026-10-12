import type { EventAppraisal } from "./emotion";
import type {
  CoreAPI,
  CoreEventAppraisalListener,
  CoreEventInput,
  CoreModule,
  CoreRelationshipListener,
  CoreState,
  PersonId,
  RelationshipChangeNotice,
  Source,
} from "./types";

interface EventDispatchFrame {
  event: CoreEventInput;
  learnedBy: ReadonlySet<PersonId>;
  published: Set<PersonId>;
  snapshot?: Readonly<CoreEventInput>;
}

/** Only in-progress synchronous dispatches exist here; no event history is kept. */
const dispatchFrames = new WeakMap<
  CoreState,
  Map<string, EventDispatchFrame>
>();

function validateSubscription<Listener>(
  listeners: ReadonlyMap<string, Listener>,
  id: string,
  kinds: readonly string[],
  listener: Listener,
  label: string,
): void {
  if (
    !id.trim() ||
    id !== id.trim() ||
    typeof listener !== "function" ||
    !kinds.length ||
    kinds.some((kind) => !kind.trim() || kind !== kind.trim())
  )
    throw new Error(`Invalid ${label} subscription.`);
  if (listeners.has(id))
    throw new Error(`Duplicate ${label} subscriber: ${id}`);
}

function subscribe<Listener>(
  listeners: Map<string, Listener>,
  byKind: Map<string, Set<string>>,
  id: string,
  kinds: readonly string[],
  listener: Listener,
  label: string,
): () => void {
  validateSubscription(listeners, id, kinds, listener, label);
  const uniqueKinds = new Set(kinds);
  let active = true;
  listeners.set(id, listener);
  for (const kind of uniqueKinds) {
    let ids = byKind.get(kind);
    if (!ids) byKind.set(kind, (ids = new Set()));
    ids.add(id);
  }
  return () => {
    if (!active) return;
    active = false;
    if (listeners.get(id) !== listener) return;
    listeners.delete(id);
    for (const kind of uniqueKinds) {
      const ids = byKind.get(kind);
      ids?.delete(id);
      if (!ids?.size) byKind.delete(kind);
    }
  };
}

/** Preflight both new subscriptions before registerModule writes any registry. */
export function preflightModuleNotifications(
  core: CoreState,
  module: CoreModule,
): void {
  if (module.onEventAppraisal && !module.appraisalEventKinds)
    throw new Error(
      "Appraisal handlers require explicit event-kind subscriptions.",
    );
  if (module.appraisalEventKinds && !module.onEventAppraisal)
    throw new Error("Appraisal event-kind subscriptions require a handler.");
  if (module.onRelationshipChange && !module.relationshipKinds)
    throw new Error(
      "Relationship handlers require explicit kind subscriptions.",
    );
  if (module.relationshipKinds && !module.onRelationshipChange)
    throw new Error("Relationship-kind subscriptions require a handler.");
  if (module.onEventAppraisal)
    validateSubscription(
      core.eventAppraisalSubscribers,
      `module:${module.id}`,
      module.appraisalEventKinds!,
      module.onEventAppraisal,
      "event appraisal",
    );
  if (module.onRelationshipChange)
    validateSubscription(
      core.relationshipSubscribers,
      `module:${module.id}`,
      module.relationshipKinds!,
      module.onRelationshipChange,
      "relationship",
    );
}

export function registerModuleNotifications(
  core: CoreState,
  module: CoreModule,
): void {
  if (module.onEventAppraisal)
    subscribeEventAppraisals(
      core,
      `module:${module.id}`,
      module.appraisalEventKinds!,
      module.onEventAppraisal,
    );
  if (module.onRelationshipChange)
    subscribeRelationshipChanges(
      core,
      `module:${module.id}`,
      module.relationshipKinds!,
      module.onRelationshipChange,
    );
}

export function subscribeEventAppraisals(
  core: CoreState,
  id: string,
  kinds: readonly string[],
  listener: CoreEventAppraisalListener,
): () => void {
  return subscribe(
    core.eventAppraisalSubscribers,
    core.eventAppraisalSubscribersByKind,
    id,
    kinds,
    listener,
    "event appraisal",
  );
}

export function subscribeRelationshipChanges(
  core: CoreState,
  id: string,
  kinds: readonly string[],
  listener: CoreRelationshipListener,
): () => void {
  return subscribe(
    core.relationshipSubscribers,
    core.relationshipSubscribersByKind,
    id,
    kinds,
    listener,
    "relationship",
  );
}

export function beginEventNotifications(
  core: CoreState,
  event: CoreEventInput,
  learnedBy: readonly PersonId[],
): () => void {
  let frames = dispatchFrames.get(core);
  if (!frames) dispatchFrames.set(core, (frames = new Map()));
  const activeFrames = frames;
  if (activeFrames.has(event.id))
    throw new Error("Duplicate active event dispatch.");
  const frame: EventDispatchFrame = {
    event,
    learnedBy: new Set(learnedBy),
    published: new Set(),
  };
  activeFrames.set(event.id, frame);
  return () => {
    if (activeFrames.get(event.id) !== frame) return;
    activeFrames.delete(event.id);
    if (!activeFrames.size) dispatchFrames.delete(core);
  };
}

function sameSource(a: Source, b: Source): boolean {
  return (
    a.tag === b.tag &&
    a.citation === b.citation &&
    a.asOf === b.asOf &&
    a.estimatedFrom === b.estimatedFrom &&
    a.generationPriorVintage === b.generationPriorVintage
  );
}

function snapshotEvent(event: CoreEventInput): Readonly<CoreEventInput> {
  return Object.freeze({
    ...event,
    personIds: Object.freeze([...event.personIds]),
    ...(event.witnessIds
      ? { witnessIds: Object.freeze([...event.witnessIds]) }
      : {}),
    ...(event.facts ? { facts: Object.freeze({ ...event.facts }) } : {}),
    source: Object.freeze({ ...event.source }),
  });
}

function snapshotAppraisal(
  appraisal: Readonly<EventAppraisal>,
): Readonly<EventAppraisal> {
  return Object.freeze({
    ...appraisal,
    source: Object.freeze({ ...appraisal.source }),
    affect: Object.freeze({ ...appraisal.affect }),
    traitContributions: Object.freeze(
      appraisal.traitContributions.map((row) =>
        Object.freeze({
          ...row,
          source: Object.freeze({ ...row.source }),
        }),
      ),
    ),
  });
}

/** Notify the already-applied appraisal; this writer never recomputes or applies affect. */
export function publishEventAppraisal(
  core: CoreState,
  api: CoreAPI,
  appraisal: Readonly<EventAppraisal>,
): void {
  const frame = dispatchFrames.get(core)?.get(appraisal.sourceEventId);
  const actor = core.people.get(appraisal.actorId);
  if (
    !frame ||
    !actor ||
    !frame.learnedBy.has(actor.id) ||
    frame.event.date !== core.date ||
    appraisal.affect.at !== core.date ||
    api.knows(actor.id, `event:${frame.event.id}:experienced`)?.sourceId !==
      frame.event.id ||
    !sameSource(appraisal.source, frame.event.source) ||
    !appraisal.modelStopgapId.trim() ||
    [
      appraisal.moodImpulse,
      appraisal.stressImpulse,
      appraisal.relationshipStrength,
      appraisal.affect.mood,
      appraisal.affect.stress,
      appraisal.affect.moodBaseline,
      appraisal.affect.stressBaseline,
    ].some((value) => !Number.isFinite(value)) ||
    appraisal.traitContributions.some(
      (row) =>
        !row.traitId.trim() ||
        [row.recordedValue, row.normalizedValue, row.multiplierDelta].some(
          (value) => !Number.isFinite(value),
        ),
    ) ||
    appraisal.affect.at !== actor.affect.at ||
    appraisal.affect.mood !== actor.affect.mood ||
    appraisal.affect.stress !== actor.affect.stress ||
    appraisal.affect.moodBaseline !== actor.affect.moodBaseline ||
    appraisal.affect.stressBaseline !== actor.affect.stressBaseline
  )
    throw new Error(
      "Appraisal notice requires the current learned event and its applied affect.",
    );
  if (frame.published.has(actor.id))
    throw new Error("Duplicate event appraisal notice.");
  frame.published.add(actor.id);
  const subscribers = new Set([
    ...(core.eventAppraisalSubscribersByKind.get(frame.event.kind) ?? []),
    ...(core.eventAppraisalSubscribersByKind.get("*") ?? []),
  ]);
  if (!subscribers.size) return;
  frame.snapshot ??= snapshotEvent(frame.event);
  const notice = snapshotAppraisal(appraisal);
  for (const id of subscribers)
    core.eventAppraisalSubscribers.get(id)?.(api, frame.snapshot, notice);
}

/** Called only after the relationship row, endpoint indexes and player focus commit. */
export function notifyRelationshipChange(
  core: CoreState,
  api: CoreAPI,
  notice: RelationshipChangeNotice,
): void {
  if (!notice.changes.length) return;
  const subscribers = new Set([
    ...(core.relationshipSubscribersByKind.get(notice.kind) ?? []),
    ...(core.relationshipSubscribersByKind.get("*") ?? []),
  ]);
  if (!subscribers.size) return;
  const snapshot = Object.freeze({
    ...notice,
    changes: Object.freeze(
      notice.changes.map((change) => Object.freeze({ ...change })),
    ),
  });
  for (const id of subscribers)
    core.relationshipSubscribers.get(id)?.(api, snapshot);
}
