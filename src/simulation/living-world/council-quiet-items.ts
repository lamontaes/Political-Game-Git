import { councilFloorQuestion } from "../governing/council-lawmaking";
import {
  memberBallotOn,
  recordMemberBallot,
  type MemberBallot,
} from "../governing/member-ballots";
import type { GovernmentUnitIdentity } from "../government-units";
import { measurePosition } from "../legislation";
import {
  currentOfficeVoteInstruction,
  currentOfficeWorkflowPreference,
  measureTextVersion,
} from "../office-workflow";
import { personName } from "../people";
import type {
  EntityId,
  LegislativeMeasureRecord,
  OfficeVotingWorkflowMode,
  World,
} from "../types";
import {
  sittingLocalOfficers,
  type SeatedLocalOffice,
} from "./local-government-seats";

/**
 * How a council member's quiet agenda items get their ballots (b05 part 4).
 *
 * A quiet item is one nothing in the member's life makes matter
 * (`meetingItemsThatMatter` gives it no reason). The member never sits through
 * it as a scene, and the office's voting workflow they chose says what becomes
 * of their ballot, using the same workflow records every other office uses:
 *
 * - `prior-instructions-with-exceptions`: a standing instruction that still
 *   matches the bill's current text casts it. With none, or after the text
 *   changed, the item waits for the member's own decision.
 * - `review-batch`: nothing is cast. The quiet items wait in one list.
 * - `handle-individually`: nothing is cast; every item is the member's own.
 *
 * Nothing here ever decides for the member. An item that waits for review is
 * recorded absent at its roll call unless the member decided it first, which
 * is what the council vote already did for a player who did not vote.
 */

export type QuietItemHandling =
  | "cast-by-standing-instruction"
  | "waits-for-review"
  | "plays-individually"
  | "no-workflow";

export interface QuietCouncilItem {
  readonly measure: LegislativeMeasureRecord;
  readonly seatParticipationId: EntityId;
  readonly mode: OfficeVotingWorkflowMode | null;
  readonly handling: QuietItemHandling;
  /** The ballot already saved on this item, by hand or by instruction. */
  readonly ballot: MemberBallot | null;
}

/** The player's own seat on this body, if they hold one. A mayor casts none. */
export function playerCouncilSeat(
  world: World,
  unit: GovernmentUnitIdentity,
  playerId: EntityId,
): (SeatedLocalOffice & { readonly participationId: EntityId }) | null {
  const seat = sittingLocalOfficers(world, unit).find(
    (entry) => entry.personId === playerId && !entry.mayor,
  );
  return seat?.participationId
    ? { ...seat, participationId: seat.participationId }
    : null;
}

/** Whether the ordinance has reached the floor and is waiting for its roll call. */
function onTheFloor(world: World, measure: LegislativeMeasureRecord): boolean {
  return measurePosition(world, measure.id).phase === "on-floor";
}

function standingInstruction(
  world: World,
  playerId: EntityId,
  seatParticipationId: EntityId,
  measure: LegislativeMeasureRecord,
) {
  const instruction = currentOfficeVoteInstruction(
    world,
    playerId,
    seatParticipationId,
    measure.id,
  );
  return instruction &&
    instruction.measureTextVersion === measureTextVersion(world, measure.id)
    ? instruction
    : null;
}

/**
 * Each quiet item that is on the floor, with what the member's workflow does
 * with it. Read only.
 */
export function quietCouncilItems(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly playerId: EntityId;
    readonly quiet: readonly LegislativeMeasureRecord[];
  },
): readonly QuietCouncilItem[] {
  const seat = playerCouncilSeat(world, input.unit, input.playerId);
  if (!seat) return [];
  const mode =
    currentOfficeWorkflowPreference(world, input.playerId, seat.participationId)
      ?.votingMode ?? null;
  return input.quiet
    .filter((measure) => onTheFloor(world, measure))
    .map((measure) => {
      const ballot = memberBallotOn(
        world,
        input.playerId,
        councilFloorQuestion(measure.id),
      );
      const handling: QuietItemHandling =
        mode === null
          ? "no-workflow"
          : mode === "handle-individually"
            ? "plays-individually"
            : mode === "prior-instructions-with-exceptions" &&
                standingInstruction(
                  world,
                  input.playerId,
                  seat.participationId,
                  measure,
                )
              ? "cast-by-standing-instruction"
              : "waits-for-review";
      return {
        measure,
        seatParticipationId: seat.participationId,
        mode,
        handling,
        ballot,
      };
    });
}

/**
 * Before a meeting's roll call: every quiet item with a standing instruction
 * that still matches its text is cast, once, through the member ballot record.
 * An item the member already decided is left as they decided it.
 */
export function settleQuietCouncilItems(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly town: EntityId;
    readonly playerId: EntityId;
    readonly quiet: readonly LegislativeMeasureRecord[];
  },
): World {
  let next = world;
  for (const item of quietCouncilItems(world, input)) {
    if (item.handling !== "cast-by-standing-instruction" || item.ballot)
      continue;
    const instruction = standingInstruction(
      next,
      input.playerId,
      item.seatParticipationId,
      item.measure,
    )!;
    next = recordMemberBallot(next, {
      personId: input.playerId,
      jurisdictionId: input.town,
      question: councilFloorQuestion(item.measure.id),
      ballot: instruction.disposition,
      summary: `${personName(next.people[input.playerId]!)} left a standing instruction on ${item.measure.designation}, and it still matches the ordinance's text.`,
    });
  }
  return next;
}

/**
 * The one plain list after the council meets or before it does: quiet items
 * on the floor that the member has not decided and that their workflow leaves
 * to them. Read only.
 */
export function quietItemsToReview(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly playerId: EntityId;
    readonly quiet: readonly LegislativeMeasureRecord[];
  },
): readonly QuietCouncilItem[] {
  return quietCouncilItems(world, input).filter(
    (item) => item.handling === "waits-for-review" && item.ballot === null,
  );
}

/**
 * The member decides one item from the review list. Refused (World
 * unchanged) unless they hold a seat on this body and the ordinance is on its
 * floor. Deciding again replaces the earlier ballot; the earlier one stays in
 * the record.
 */
export function decideQuietCouncilItem(
  world: World,
  input: {
    readonly unit: GovernmentUnitIdentity;
    readonly town: EntityId;
    readonly playerId: EntityId;
    readonly measure: LegislativeMeasureRecord;
    readonly ballot: MemberBallot;
  },
): World {
  if (!playerCouncilSeat(world, input.unit, input.playerId)) return world;
  if (!onTheFloor(world, input.measure)) return world;
  return recordMemberBallot(world, {
    personId: input.playerId,
    jurisdictionId: input.town,
    question: councilFloorQuestion(input.measure.id),
    ballot: input.ballot,
    summary: `${personName(world.people[input.playerId]!)} decided ${input.measure.designation} from the review list.`,
  });
}
