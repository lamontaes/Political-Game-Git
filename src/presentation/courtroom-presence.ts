import { courtroomSittingToday } from "../simulation/justice/courtroom-sitting";
import type { EntityId, World } from "../simulation/types";
import type { SceneSlotRole } from "./scene-slot-contract";

/** The location key of the case the court sat on today, or null on any other day. */
export function courtroomLocationKey(
  world: World,
  personId: EntityId,
): string | null {
  const sitting = courtroomSittingToday(world, personId);
  return sitting ? `court-case:${sitting.referralId}` : null;
}

/**
 * The people the saved records place in today's courtroom, for the room's
 * marked spots: the judge at the bench and the jurors in the box. The defendant
 * is the player and is never placed. The prosecutor who reviewed the referral
 * takes a counsel spot. Defense counsel are not recorded, so no second counsel
 * spot is filled. Read-only.
 */
export function courtroomPresentPeople(
  world: World,
  personId: EntityId,
): readonly {
  readonly personId: EntityId;
  readonly title: string;
  readonly role: SceneSlotRole;
}[] {
  const sitting = courtroomSittingToday(world, personId);
  if (!sitting) return [];
  return [
    ...(sitting.judgeId
      ? [{ personId: sitting.judgeId, title: "Judge", role: "judge" as const }]
      : []),
    ...(sitting.prosecutorId
      ? [
          {
            personId: sitting.prosecutorId,
            title: "Prosecutor",
            role: "counsel" as const,
          },
        ]
      : []),
    ...sitting.jurorIds.map((juror) => ({
      personId: juror,
      title: "Juror",
      role: "jury" as const,
    })),
  ];
}
