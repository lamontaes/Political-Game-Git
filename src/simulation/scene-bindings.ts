import { makeIsoDate } from "./dates";
import type { EntityId, HistoricalEvent, IsoDate, World } from "./types";
import { recordWorldEvent } from "./world";

/**
 * The facts a contextual conversation is about, bound once and saved (PROSE B).
 *
 * A scene sentence may only name what the world supplied: who is speaking,
 * what they are to the player, what they are actually asking, where, about
 * which event or promise, and on what date. Those are resolved here, when the
 * situation arises, from records the world already holds — never by the
 * renderer, and never again on the next read. A save carries the binding as a
 * canonical event with one versioned tag, the same shape request terms use.
 *
 * The binding event is bookkeeping about the situation, not the exchange: it
 * gives neither person an agency or presence role, so readers that build the
 * journal from what somebody did do not show it. The exchange itself is the
 * conversation turn that follows.
 */

export const SCENE_BINDING_EVENT = "scene.contextual-bound";
export const SCENE_BINDING_TAG_PREFIX = "scene.binding.v1:";
export const SCENE_BINDING_REF_TAG_PREFIX = "scene.binding:";

export const SCENE_FAMILIES = [
  "home-evening",
  "favor",
  "party-invite",
  "campaign-reaction",
  "staff-followup",
  "reporter-question",
  // CRUNCH47 F47.1: study is its own setting, not a favor with a classroom in
  // it. The education scenes are about people met through shared work.
  "study-peer",
] as const;
export type SceneFamily = (typeof SCENE_FAMILIES)[number];

export interface SceneBinding {
  readonly version: 1;
  readonly family: SceneFamily;
  /** Which situation within the family, e.g. `confirmed-evening`. */
  readonly variant: string;
  readonly playerPersonId: EntityId;
  readonly speakerPersonId: EntityId;
  /** What the speaker is to the player, as the record called it then. */
  readonly relationship: string | null;
  readonly place: string;
  readonly jurisdictionId: EntityId;
  /** The actual request or question, in plain words. */
  readonly request: string;
  /** The records this situation is about: event, activity, promise, contest. */
  readonly sourceEntityIds: readonly EntityId[];
  /** Named slot values drawn from those records. */
  readonly facts: Readonly<Record<string, string>>;
  /** Records that establish what the speaker already knows. */
  readonly knownRecordIds: readonly EntityId[];
  /** The promised or requested action's target, when there is one. */
  readonly target: string | null;
  /** The date the situation concerns, when there is one. */
  readonly date: IsoDate | null;
  /** After this date the situation is past and no longer offered. */
  readonly expiresAt: IsoDate;
}

export interface BoundScene {
  readonly eventId: EntityId;
  readonly boundAt: IsoDate;
  readonly sequence: number;
  readonly binding: SceneBinding;
}

export function sceneBindingOf(event: HistoricalEvent): SceneBinding | null {
  if (event.type !== SCENE_BINDING_EVENT) return null;
  const tag = event.tags.find((entry) =>
    entry.startsWith(SCENE_BINDING_TAG_PREFIX),
  );
  if (!tag) return null;
  try {
    const value = JSON.parse(
      tag.slice(SCENE_BINDING_TAG_PREFIX.length),
    ) as SceneBinding;
    return value.version === 1 &&
      (SCENE_FAMILIES as readonly string[]).includes(value.family)
      ? value
      : null;
  } catch {
    return null;
  }
}

/** Every binding written for this person in this family, oldest first. */
export function sceneBindingsFor(
  world: World,
  playerPersonId: EntityId,
  family?: SceneFamily,
): readonly BoundScene[] {
  return world.history.events.flatMap((event) => {
    if (event.type !== SCENE_BINDING_EVENT) return [];
    if (!event.involvedEntityIds.includes(playerPersonId)) return [];
    const binding = sceneBindingOf(event);
    if (
      !binding ||
      binding.playerPersonId !== playerPersonId ||
      (family !== undefined && binding.family !== family)
    ) {
      return [];
    }
    return [
      {
        eventId: event.id,
        boundAt: event.occurredAt,
        sequence: event.sequence,
        binding,
      },
    ];
  });
}

/** Whether a binding for exactly this situation was already written. */
export function sceneAlreadyBound(
  world: World,
  playerPersonId: EntityId,
  family: SceneFamily,
  variant: string,
  sourceEntityId: EntityId,
): boolean {
  return sceneBindingsFor(world, playerPersonId, family).some(
    (entry) =>
      entry.binding.variant === variant &&
      entry.binding.sourceEntityIds.includes(sourceEntityId),
  );
}

export function recordSceneBinding(
  world: World,
  binding: SceneBinding,
  summary: string,
): World {
  if (!world.people[binding.playerPersonId]) {
    throw new Error("A scene binding needs the player.");
  }
  if (!world.people[binding.speakerPersonId]) {
    throw new Error("A scene binding needs a speaker the world has.");
  }
  if (binding.speakerPersonId === binding.playerPersonId) {
    throw new Error("The player cannot be the other side of their own scene.");
  }
  if (!binding.request.trim() || !binding.place.trim()) {
    throw new Error("A scene binding names its request and place.");
  }
  makeIsoDate(binding.expiresAt);
  const anchor = binding.sourceEntityIds[0] ?? "none";
  const stableKey = `scene-binding:${binding.family}:${binding.variant}:${binding.playerPersonId}:${anchor}`;
  return recordWorldEvent(world, {
    stableKey,
    type: SCENE_BINDING_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: binding.jurisdictionId,
    involvedEntityIds: [binding.playerPersonId, binding.speakerPersonId],
    participants: [
      {
        personId: binding.playerPersonId,
        role: "other:scene-subject",
        detail: null,
      },
      {
        personId: binding.speakerPersonId,
        role: "other:scene-speaker",
        detail: null,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `scene.family.${binding.family}`,
      `${SCENE_BINDING_TAG_PREFIX}${JSON.stringify(binding)}`,
    ],
    summary,
    context: {
      location: {
        jurisdictionId: binding.jurisdictionId,
        label: binding.place,
        setting: null,
      },
      socialContext: "A situation the world has made answerable.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
