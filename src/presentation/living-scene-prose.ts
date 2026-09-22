import { lifePlaceByKey } from "../simulation/life-places";
import type { EntityId, IsoDate, World } from "../simulation/types";

/** Authored visual staging; these packets are never simulation events. */
export type LivingSceneFamily =
  | "executive-briefing"
  | "office-document-review"
  | "public-office-work"
  | "congressional-corridor"
  | "seated-civic-meeting"
  | "ordinary-errand"
  | "home-conversation"
  | "regional-leisure";
export type LivingSceneVisibleAction =
  | "review-papers"
  | "listen-to-briefing"
  | "corridor-conversation"
  | "listen-seated"
  | "read-store-sign"
  | "talk-at-home"
  | "fish-at-water";
export interface LivingSceneStagePacket {
  readonly family: LivingSceneFamily;
  readonly roles: readonly {
    readonly slotKey: string;
    readonly personId: EntityId;
    readonly name: string;
  }[];
  readonly publicFacts: readonly string[];
  readonly asOf: IsoDate;
  readonly regionKey: string | null;
  /** A requested action, not a claim that a compatible pose has been rendered. */
  readonly visibleAction: LivingSceneVisibleAction;
  readonly requirements: {
    readonly minimumActors: number;
    readonly bodyContacts: readonly string[];
    readonly props: readonly string[];
    readonly sceneContext: string;
  };
  readonly fallback: string;
  /** Saved-person leisure is withheld unless an existing fact supports it. */
  readonly leisureContextRecordIds: readonly EntityId[];
}
export const LIVING_SCENE_FAMILIES = {
  "executive-briefing": {
    visibleAction: "review-papers",
    minimumActors: 2,
    bodyContacts: [
      "standing-floor-or-compatible-desk-seat",
      "document-hand-contact",
    ],
    props: ["papers"],
    sceneContext: "executive working composition",
    fallback: "The President and Vice President.",
  },
  "office-document-review": {
    visibleAction: "review-papers",
    minimumActors: 1,
    bodyContacts: [
      "compatible-desk-seat-or-standing-floor",
      "document-hand-contact",
    ],
    props: ["papers"],
    sceneContext: "working office",
    fallback: "At the office.",
  },
  "public-office-work": {
    visibleAction: "listen-to-briefing",
    minimumActors: 1,
    bodyContacts: ["standing-floor-or-compatible-seat"],
    props: [],
    sceneContext: "public institution; regional imagery is illustrative",
    fallback: "Public life in the region.",
  },
  "congressional-corridor": {
    visibleAction: "corridor-conversation",
    minimumActors: 2,
    bodyContacts: ["standing-floor", "mutually-compatible-facing"],
    props: [],
    sceneContext:
      "verified congressional corridor; not a named hall unless source supports it",
    fallback: "Members of Congress.",
  },
  "seated-civic-meeting": {
    visibleAction: "listen-seated",
    minimumActors: 1,
    bodyContacts: ["pelvis-seat", "feet-floor", "chair-occlusion"],
    props: ["chair"],
    sceneContext: "actual reached civic meeting room",
    fallback: "The public meeting.",
  },
  "ordinary-errand": {
    visibleAction: "read-store-sign",
    minimumActors: 1,
    bodyContacts: ["standing-floor"],
    props: ["venue-sign"],
    sceneContext: "actual reached everyday venue",
    fallback: "An ordinary errand.",
  },
  "home-conversation": {
    visibleAction: "talk-at-home",
    minimumActors: 1,
    bodyContacts: ["standing-floor-or-compatible-domestic-seat"],
    props: [],
    sceneContext:
      "known household; current room still requires actual presence",
    fallback: "At home.",
  },
  "regional-leisure": {
    visibleAction: "fish-at-water",
    minimumActors: 1,
    bodyContacts: ["compatible-shore-or-seat", "rod-hand-contact"],
    props: ["fishing-rod"],
    sceneContext:
      "compatible water/season; generic title cast or supported saved-person context only",
    fallback: "A quiet moment outside.",
  },
} as const satisfies Record<
  LivingSceneFamily,
  {
    visibleAction: LivingSceneVisibleAction;
    minimumActors: number;
    bodyContacts: readonly string[];
    props: readonly string[];
    sceneContext: string;
    fallback: string;
  }
>;

export function livingSceneStagePacket(
  input: Omit<
    LivingSceneStagePacket,
    "visibleAction" | "requirements" | "fallback" | "leisureContextRecordIds"
  > & {
    readonly fallback?: string;
    readonly leisureContextRecordIds?: readonly EntityId[];
  },
): LivingSceneStagePacket {
  const family = LIVING_SCENE_FAMILIES[input.family];
  return {
    ...input,
    visibleAction: family.visibleAction,
    requirements: {
      minimumActors: family.minimumActors,
      bodyContacts: family.bodyContacts,
      props: family.props,
      sceneContext: family.sceneContext,
    },
    fallback: input.fallback ?? family.fallback,
    leisureContextRecordIds: input.leisureContextRecordIds ?? [],
  };
}

/** U supplies this only after choosing an admitted compatible V composition.
 * Missing pose/prop support returns factual orientation, never a fictional act.
 */
export function livingSceneCaption(
  packet: LivingSceneStagePacket,
  visible: {
    readonly action: LivingSceneVisibleAction | null;
    readonly personIds: readonly EntityId[];
    readonly props: readonly string[];
    readonly contactsVerified: boolean;
    readonly regionalContextCompatible: boolean;
  },
  context?: { readonly world: World; readonly viewerPersonId: EntityId },
): string {
  const shown = [
    ...new Map(
      packet.roles
        .filter((role) => visible.personIds.includes(role.personId))
        .map((role) => [role.personId, role]),
    ).values(),
  ];
  if (
    visible.action !== packet.visibleAction ||
    !visible.contactsVerified ||
    !visible.regionalContextCompatible ||
    shown.length < packet.requirements.minimumActors ||
    !packet.requirements.props.every((prop) => visible.props.includes(prop)) ||
    (packet.family === "regional-leisure" &&
      !validatedLeisureContext(
        packet,
        shown.map((role) => role.personId),
        context,
      ))
  )
    return packet.fallback;
  const names = shown.map((role) => role.name);
  const who =
    names.length === 1
      ? names[0]!
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
  switch (packet.visibleAction) {
    case "review-papers":
      return `${who} ${names.length === 1 ? "reviews" : "review"} papers.`;
    case "listen-to-briefing":
      return `${who} ${names.length === 1 ? "listens" : "listen"} to a briefing.`;
    case "corridor-conversation":
      return `${who} talk in the corridor.`;
    case "listen-seated":
      return `${who} ${names.length === 1 ? "sits" : "sit"} listening to the meeting.`;
    case "read-store-sign":
      return `${who} ${names.length === 1 ? "looks" : "look"} at the store sign.`;
    case "talk-at-home":
      return `${who} ${names.length === 1 ? "speaks" : "talk"} at home.`;
    case "fish-at-water":
      return `${who} ${names.length === 1 ? "fishes" : "fish"} by the water.`;
  }
}

/** No World or simulated identity is needed for the title's decorative cast. */
export function genericTitleStage(family: LivingSceneFamily) {
  return {
    family,
    ...LIVING_SCENE_FAMILIES[family],
    identityBasis: "presentation-only" as const,
    records: [] as readonly EntityId[],
  };
}

/** Reserved explicit event/knowledge vocabulary; no current opening invents it.
 * A past hobby mention, unrelated ID or unknown private event is not support
 * for a dated scene. Generic title vignettes use no saved-person packet.
 */
function validatedLeisureContext(
  packet: LivingSceneStagePacket,
  people: readonly EntityId[],
  context?: { readonly world: World; readonly viewerPersonId: EntityId },
): boolean {
  if (
    !context ||
    context.world.currentDate !== packet.asOf ||
    !context.world.people[context.viewerPersonId] ||
    !packet.regionKey
  )
    return false;
  const world = context.world;
  const place = lifePlaceByKey(packet.regionKey);
  if (!place) return false;
  return people.every((personId) =>
    packet.leisureContextRecordIds.some((id) => {
      const event = world.history.events.find((entry) => entry.id === id);
      return (
        event?.type === "life.regional-leisure" &&
        event.tags.includes("activity:fishing") &&
        event.tags.includes(`place:${packet.regionKey}`) &&
        event.jurisdictionId === place.context.jurisdiction.id &&
        event.occurredAt === packet.asOf &&
        event.recordedAt <= packet.asOf &&
        event.participants.some(
          (actor) =>
            actor.personId === personId &&
            actor.role === "presence:participant",
        ) &&
        (event.visibility === "public" ||
          world.history.knowledge.some(
            (knowledge) =>
              knowledge.eventId === id &&
              knowledge.personId === context.viewerPersonId &&
              knowledge.learnedAt <= packet.asOf &&
              knowledge.source.kind === "direct" &&
              knowledge.accuracy === "accurate",
          ))
      );
    }),
  );
}

/** Anonymous title cast stays outside the simulation and cannot acquire a
 * public office, biography, event, or relationship by being displayed. */
export function genericTitleCaption(
  family: LivingSceneFamily,
  visible: {
    readonly castKeys: readonly string[];
    readonly action: LivingSceneVisibleAction | null;
    readonly props: readonly string[];
    readonly contactsVerified: boolean;
    readonly regionalContextCompatible: boolean;
  },
): string {
  const stage = LIVING_SCENE_FAMILIES[family];
  if (
    !visible.contactsVerified ||
    !visible.regionalContextCompatible ||
    visible.action !== stage.visibleAction ||
    new Set(visible.castKeys.filter((key) => key.trim())).size <
      stage.minimumActors ||
    !stage.props.every((prop) => visible.props.includes(prop))
  )
    return "";
  switch (family) {
    case "executive-briefing":
      return "Two people review papers.";
    case "office-document-review":
      return "Someone reviews papers.";
    case "public-office-work":
      return "A briefing at a public office.";
    case "congressional-corridor":
      return "Two people talk in the corridor.";
    case "seated-civic-meeting":
      return "Someone sits listening to a meeting.";
    case "ordinary-errand":
      return "Someone looks at a store sign.";
    case "home-conversation":
      return "Someone speaks at home.";
    case "regional-leisure":
      return "Someone fishes by the water.";
  }
}
