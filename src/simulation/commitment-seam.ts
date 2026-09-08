import type { AdultAftermathKind } from "./adult-situations";
import { activeLifeCommitmentsAt, currentLifeCutoff } from "./life-queries";
import type {
  EntityId,
  FutureDueItemStatus,
  IsoDate,
  LifeCommitmentRecord,
  World,
} from "./types";

/**
 * The vocabulary a promise needs, in one place, before there are two of them.
 *
 * PR #79 builds a commitment record for the legislature: a holder, a subject, a
 * stance, a firmness said in the register people actually use, a set of typed
 * conditions, an audience, the words as spoken, and — the important part —
 * whether it was kept derived from later canonical events rather than written
 * back over the sentence. That shape is right, and adult life needs the same
 * ideas for an ordinary promise: somebody said they would, it was conditional
 * on something, and whether it held is answered later by what happened.
 *
 * What this file deliberately does *not* do is build a second commitment
 * record. Two commitment stores would be worse than none: the same promise
 * would have two homes, two lifecycles and two answers about whether it was
 * kept, and the second one to be written would be the one nobody trusted.
 *
 * So this is a seam. It names the semantics that both domains share, and it
 * reads them out of records that already exist — `LifeCommitmentRecord` for
 * what was undertaken, and the delayed-transition registry for what became of
 * it. When PR #79 lands, its `LegislativeCommitmentRecord` should be re-homed
 * onto this vocabulary rather than either side being duplicated; the note at
 * the foot of this file says exactly how, and what must not be done.
 */

/**
 * How firmly something was said.
 *
 * Words, not a probability. A player is told what was said and how hedged it
 * sounded; they are never shown a number for how likely a hidden model thinks
 * it is to hold. This is PR #79's `LegislativeCommitmentFirmness`, kept
 * identical on purpose so the two can be one type later without a migration.
 */
export type CommitmentFirmness =
  "explicit" | "qualified" | "provisional" | "noncommittal";

/**
 * What has to become true for a conditional undertaking to be answerable.
 *
 * The legislative side has seven condition shapes, all about measures and
 * provisions. Adult life needs a smaller set about people and circumstances,
 * and the two are the same idea: a condition carries what it is *about*, so the
 * game can say whether it has been met by looking at canonical state rather
 * than by re-reading the sentence somebody spoke.
 */
export type LifeCommitmentCondition = {
  readonly key: string;
  /** The condition in the words it was stated, for a player to read. */
  readonly description: string;
} & (
  | { readonly kind: "person-still-present"; readonly personId: EntityId }
  | { readonly kind: "work-continues"; readonly organizationId: EntityId }
  | {
      readonly kind: "participation-continues";
      readonly organizationId: EntityId;
    }
  | { readonly kind: "before"; readonly deadline: IsoDate }
);

/**
 * Where an undertaking has got to.
 *
 * Derived, never stored. The terminal states of the delayed-transition registry
 * already carry this information with a reason attached, and adding a status
 * field beside them would create a second answer that could disagree with the
 * first.
 */
export type CommitmentStanding =
  /** Still owed, and still answerable. */
  | "outstanding"
  /** It came round and was met. */
  | "met"
  /** It came round and was not. */
  | "broken"
  /** Something later replaced what was undertaken. */
  | "superseded"
  /** The person who was owed it is no longer anywhere it could be paid. */
  | "withdrawn"
  /** The thing it was about stopped existing before it could matter. */
  | "moot";

/**
 * The aftermath kinds an adult choice can leave, in commitment terms.
 *
 * An obligation is a promise. The other three are not promises but they have
 * the same lifecycle — something is owed, or held, or standing, and later the
 * world says whether it still is — which is why they share this vocabulary
 * rather than getting one of their own.
 */
export const AFTERMATH_FIRMNESS: Readonly<
  Record<AdultAftermathKind, CommitmentFirmness>
> = {
  obligation: "explicit",
  grievance: "qualified",
  goodwill: "provisional",
  standing: "qualified",
};

/**
 * How the registry's terminal states read as commitment standings.
 *
 * One mapping, in one place, so "cancelled because attention moved" and
 * "withdrawn" cannot drift into meaning different things in different files.
 */
export function standingFromDueItemState(
  status: FutureDueItemStatus,
  reasonKey: string | null,
): CommitmentStanding {
  if (status === "scheduled") return "outstanding";
  if (status === "resolved") return "met";
  if (status === "blocked") return "withdrawn";
  switch (reasonKey) {
    case "life:issue-overtaken":
      return "superseded";
    case "life:nobody-to-carry-it":
    case "life:attention-moved":
      return "withdrawn";
    case "life:nobody-heard":
      return "moot";
    default:
      return "broken";
  }
}

export interface StandingCommitment {
  readonly record: LifeCommitmentRecord;
  readonly firmness: CommitmentFirmness;
  readonly conditions: readonly LifeCommitmentCondition[];
  readonly standing: CommitmentStanding;
}

/**
 * What this person is currently on the hook for.
 *
 * Read from the records that already exist. A commitment written by a played
 * choice carries the stable key of the choice that made it, which is what lets
 * a later moment ask "is this still true" of the world rather than of a flag.
 */
export function standingCommitmentsFor(
  world: World,
  personId: EntityId,
): readonly StandingCommitment[] {
  const cutoff = currentLifeCutoff(world);
  return activeLifeCommitmentsAt(world, personId, cutoff).map((record) => {
    const due = world.history.futureDueItems.find((item) =>
      item.stableKey.startsWith(record.stableKey.replace(":commitment", "")),
    );
    const state = due
      ? world.history.futureDueItemStates
          .filter((candidate) => candidate.dueItemId === due.id)
          .at(-1)
      : undefined;
    return {
      record,
      // An undertaking made in play was stated plainly; one written into a
      // generated background was never said out loud by anybody, and the
      // difference is exactly what firmness is for.
      firmness: record.stableKey.startsWith("adult-life:")
        ? "explicit"
        : "provisional",
      conditions: conditionsFor(record),
      standing: state
        ? standingFromDueItemState(state.status, state.reasonKey)
        : "outstanding",
    };
  });
}

/**
 * The conditions an undertaking carries.
 *
 * Adult-life commitments are currently unconditional in their authored form —
 * "you said you would" is the whole of it — so this returns the one condition
 * that is always true of them: they hold while the commitment itself does.
 * The shape is here so that authored conditional undertakings, and PR #79's
 * legislative ones, have somewhere to land that is not a second design.
 */
function conditionsFor(
  record: LifeCommitmentRecord,
): readonly LifeCommitmentCondition[] {
  return record.endsAt === null
    ? []
    : [
        {
          key: `${record.stableKey}:until`,
          description: `It holds until ${record.endsAt}.`,
          kind: "before",
          deadline: record.endsAt,
        },
      ];
}

/*
 * RE-HOMING NOTE — for whoever integrates PR #79.
 *
 * PR #79 (head e922c153) adds `LegislativeCommitmentRecord`,
 * `LegislativeCommitmentFirmness`, `LegislativeCommitmentCondition` and
 * `LegislativeNegotiationRecord` to `types.ts`, and three optional arrays to
 * `HistoryStore`. This branch adds none of those and touches none of them, so
 * the two are mergeable as they stand; the collision is in `types.ts` and
 * `index.ts` line positions, not in meaning.
 *
 * After #79 lands, the convergence is small and should be done in one change:
 *
 *   1. `LegislativeCommitmentFirmness` and `CommitmentFirmness` are the same
 *      four words. Delete one and let both domains import the other. Nothing
 *      else has to move for this.
 *
 *   2. `LegislativeCommitmentCondition` and `LifeCommitmentCondition` share the
 *      `{ key, description } & (kind-specific)` shape. Keep them as separate
 *      unions — a life condition is about a person and a legislative one is
 *      about a provision, and merging the payloads would produce a union that
 *      is wrong in both domains — but hoist the common head into one type.
 *
 *   3. Do NOT give adult life a `LifeCommitmentRecord`-beside-the-legislative-one
 *      store. Adult undertakings already live in `history.lifeCommitments`,
 *      which predates both, and whether one was kept is already answerable from
 *      the delayed-transition registry. A third record would be the second
 *      commitment system this seam exists to prevent.
 *
 *   4. `LegislativeNegotiationRecord` has no adult-life counterpart in this
 *      wave and should not be given one speculatively. When adult life needs a
 *      recorded approach between two people, it should reuse that record rather
 *      than define a parallel one.
 *
 * Nothing in this file is imported by the legislative modules, and nothing in
 * it imports them, so rebasing this branch onto #79 — or #79 onto this — moves
 * no behaviour either way.
 */
