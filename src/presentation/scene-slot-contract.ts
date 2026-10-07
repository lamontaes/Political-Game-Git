/** Geometry and participant eligibility are separate contracts. Neither establishes attendance. */
export const SCENE_SLOT_KINDS = ["stand", "sit", "lean", "podium"] as const;
export type SceneSlotKind = (typeof SCENE_SLOT_KINDS)[number];
export const SCENE_SLOT_ROLES = [
  "general",
  "staff-behind-counter",
  "customer",
  "member-at-dais",
  "witness",
  "audience",
  "speaker",
  "doorway",
  "judge",
  "jury",
  "counsel",
  "presiding",
] as const;
export type SceneSlotRole = (typeof SCENE_SLOT_ROLES)[number];

/** An unclassified attendee can use neutral/visitor places, never an authority seat. */
export function slotAcceptsRole(
  role: SceneSlotRole,
  participantRole?: SceneSlotRole,
): boolean {
  if (role === "general") return true;
  if (!participantRole)
    return role === "audience" || role === "customer" || role === "doorway";
  return role === participantRole;
}
