/**
 * What a scene in a grading batch is for (owner, Oct 15, evening, batch 11
 * grading): money, a bill or the player's political life. A talk between
 * relatives is a personal scene, unless the household's own money is the
 * occasion. A scene with no endpoint is dropped. The classes and the rules
 * that pick one are data (`scene-endpoints.json`).
 */
import endpointRules from "./scene-endpoints.json" with { type: "json" };

export type EndpointClass = keyof typeof endpointRules.classes;

/** The plain-words description of each class, as the batch page states it. */
export const ENDPOINT_CLASSES: Readonly<Record<EndpointClass, string>> =
  endpointRules.classes;

interface Rules {
  byKind: Record<string, EndpointClass>;
  byTopic: Record<string, EndpointClass>;
  byOccasionPrefix: Record<string, EndpointClass>;
  notices: { contextMatches: string; class: EndpointClass }[];
}

/**
 * The endpoint of a scene, or null when nothing it is about gives it one.
 * `topic` is the id of the subject a talk keeps to, `occasion` the ledger
 * label of the moment that opened it, `kin` whether it is between relatives.
 */
export function endpointOf(
  scene: {
    kind: string;
    context?: string;
    topic?: string;
    occasion?: string;
    kin?: boolean;
  },
  rules: Rules = endpointRules as unknown as Rules,
): EndpointClass | null {
  if (scene.kind === "notices")
    return (
      rules.notices.find((row) =>
        new RegExp(row.contextMatches, "i").test(scene.context ?? ""),
      )?.class ?? null
    );
  if (scene.kind !== "family" && scene.kind !== "conversation")
    return rules.byKind[scene.kind] ?? null;
  const money = Object.entries(rules.byOccasionPrefix).find(([prefix]) =>
    scene.occasion?.startsWith(prefix),
  )?.[1];
  const topic = scene.topic
    ? rules.byTopic[scene.topic.replace(/^[^>]*>/, "").split(":")[0]!]
    : undefined;
  // Between relatives the household's money is money; everything else is personal.
  if (scene.kin) return money ?? (topic === "money" ? "money" : "personal");
  return money ?? topic ?? null;
}
