import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type { SeatedBody } from "../../simulation/legislation-scenarios";
import type {
  LegislativeSubjectClass,
  LegislativeVoteDisposition,
} from "../../simulation/types";
import { resolveRequiredVotes } from "./votes";
export interface OverrideChamber {
  readonly body: SeatedBody;
  readonly seats: number;
}
/** KEEP count only; predictions supplied by caller, no decision evaluator or World. */
export function overrideCount(
  pack: LegislativeRulePack,
  chambers: readonly (OverrideChamber | null)[],
  subjectClass: LegislativeSubjectClass,
  dispositionsFor: (
    forumKey: string,
    members: SeatedBody["members"],
  ) => readonly LegislativeVoteDisposition[],
) {
  const override = pack.executive.override;
  if (override.kind === "not-applicable") return null;
  if (chambers.some((chamber) => !chamber)) return null;
  const count = (
    forumKey: string,
    members: SeatedBody["members"],
    seats: number,
  ) => {
    const rows = dispositionsFor(forumKey, members);
    const yea = rows.filter((row) => row.disposition === "yea").length;
    const nay = rows.filter((row) => row.disposition === "nay").length;
    const present = rows.filter(
      (row) => row.disposition !== "absent" && row.disposition !== "excused",
    ).length;
    const threshold =
      override.kind === "joint-session" &&
      subjectClass !== "general-policy" &&
      override.appropriationsThreshold.kind === "known"
        ? override.appropriationsThreshold.value
        : override.threshold;
    const denominator =
      threshold.countedAgainst === "members-present"
        ? present
        : threshold.countedAgainst === "members-voting"
          ? yea + nay
          : seats;
    return {
      forumKey,
      yea,
      required: resolveRequiredVotes(threshold, denominator).requiredVotes,
    };
  };
  const seated = chambers.map((chamber) => chamber!);
  const forums =
    override.kind === "joint-session"
      ? [
          count(
            "joint",
            seated.flatMap((chamber) => chamber.body.members),
            override.combinedSeats,
          ),
        ]
      : seated.map((chamber) =>
          count(chamber.body.chamberKey, chamber.body.members, chamber.seats),
        );
  return {
    overridden: forums.every((forum) => forum.yea >= forum.required),
    forums,
  };
}
