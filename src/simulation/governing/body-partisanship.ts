import type { GovernmentUnitIdentity } from "../government-units";
import { municipalRulePackFor } from "../municipal-election-rule-packs";
import { primaryReading } from "../municipal-government";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";

/**
 * Whether a local governing body's members are elected without party labels,
 * which decides whether a member's party is a cue on its votes
 * (`decideChamberVote`'s `nonpartisan`).
 *
 * A body elected without party labels has no party caucus or party leader to
 * give its members a cue: Wright and Schaffner, "The Influence of Party:
 * Evidence from the State Legislatures" (American Political Science Review
 * 96(2), 2002), found the nonpartisan Nebraska Legislature's roll calls
 * organized far less by party than those of Kansas next door. Members keep
 * their own views and their other cues.
 *
 * Read in order:
 * 1. the town's own compiled government, where its reading states whether
 *    its elections are partisan;
 * 2. the state's rule for municipal ballots (`municipal-election-rule-packs`),
 *    where state law requires or defaults to one or the other;
 * 3. otherwise ESTIMATED FROM AVERAGE: nonpartisan, as about 70 percent of
 *    council ballots nationally are (ICMA municipal surveys as reported in
 *    docs/research/chatgpt-answers/2026-09-22-nationwide-2235/
 *    OCD-LOCAL-OFFICES--NATIONWIDE-DISTRIBUTION-AND-50-STATE-STATUS--2026-09-22.md,
 *    line 105).
 */
export type BallotPartisanshipBasis = "read" | "state-rule" | "estimated";

export interface CouncilBallotPartisanship {
  readonly nonpartisan: boolean;
  readonly basis: BallotPartisanshipBasis;
}

export function councilBallotPartisanship(
  unit: GovernmentUnitIdentity,
): CouncilBallotPartisanship {
  const compiled = municipalGovernmentForUnit(unit);
  const read = compiled ? (primaryReading(compiled)?.partisanship ?? []) : [];
  if (read.includes("NONPARTISAN")) return { nonpartisan: true, basis: "read" };
  if (read.includes("PARTISAN")) return { nonpartisan: false, basis: "read" };
  const rule = municipalRulePackFor(unit.stateUsps)?.electoral.ballotStructure;
  const structure =
    rule?.kind === "known"
      ? rule.value
      : rule?.kind === "locally-selectable"
        ? rule.statutoryDefault
        : null;
  switch (structure) {
    case "nonpartisan-mandatory":
    case "nonpartisan-default-partisan-optional":
      return { nonpartisan: true, basis: "state-rule" };
    case "partisan-mandatory":
    case "partisan-default-nonpartisan-optional":
      return { nonpartisan: false, basis: "state-rule" };
    default:
      return { nonpartisan: true, basis: "estimated" };
  }
}
