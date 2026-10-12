import type {
  EntityId,
  IsoDate,
  FutureDueItem,
  PrivateBeliefRecord,
  PersonDeathRecord,
} from "../../simulation/types";
import type {
  ConstitutionalMeasureRecord,
  ConstitutionalRuleDelta,
} from "../../simulation/constitutional-types";
import type { Voter } from "../../simulation/governing/article-v";
import {
  constitutionalPolicyProvisions,
  stateDecidedPropositions,
  type ConstitutionalPolicyFacts,
} from "./constitutional-policy";
import { constitutionalPosition } from "./constitutional-position";
import {
  principledLeaning,
  type PrincipledLeaningFacts,
} from "./principled-leaning";
import {
  continuousResidenceSince,
  type ResidenceFacts,
} from "../offices/continuous-residence";
import { ageOnDate } from "../offices/calendar";
import { addDays } from "../elections/calendar";
import { nextGeneralElectionDay } from "./review-calendar";
import type { InstitutionCommand } from "./institution-context";
export interface ReformBallotFacts
  extends ConstitutionalPolicyFacts, PrincipledLeaningFacts {
  readonly playerPersonId: EntityId | null;
  readonly beliefs: readonly PrivateBeliefRecord[];
  readonly stateNames: ReadonlyMap<string, string>;
  readonly people: ReadonlyMap<EntityId, { readonly birthDate: IsoDate }>;
  readonly deaths: readonly PersonDeathRecord[];
  readonly nextSequence: number;
  readonly residence: ReadonlyMap<string, ResidenceFacts>;
  readonly jurisdictionIds: ReadonlySet<EntityId>;
}
interface AmendmentSpec {
  readonly key: string;
  readonly shortTitle: string;
  readonly text: string;
  readonly ruleDelta: ConstitutionalRuleDelta;
}
function principlesMeasureKey(stateUsps: string, year: number): string {
  return `constitutional-reform/v1:${stateUsps}:${year}:principles`;
}
function isEligibleVoterIn(
  facts: ReformBallotFacts,
  personId: EntityId,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): boolean {
  const person = facts.people.get(personId);
  if (!person || ageOnDate(person.birthDate, asOf) < 18) return false;
  if (
    asOf < person.birthDate ||
    facts.deaths.some(
      (record) =>
        record.personId === personId &&
        record.diedAt <= asOf &&
        record.sequence < facts.nextSequence,
    )
  )
    return false;
  if (!facts.jurisdictionIds.has(jurisdictionId)) return false;
  const residence = facts.residence.get(`${personId}:${jurisdictionId}`);
  return (
    residence !== undefined &&
    continuousResidenceSince(residence, asOf) !== null
  );
}
export function sameRuleChanged(
  a: ConstitutionalMeasureRecord["ruleDelta"],
  b: ConstitutionalMeasureRecord["ruleDelta"],
): boolean {
  if (a.kind === "proposal-threshold" && b.kind === "proposal-threshold")
    return true;
  if (a.kind === "policy-provision" && b.kind === "policy-provision")
    return a.propositionId === b.propositionId;
  return (
    a.kind === "rule-field" &&
    b.kind === "rule-field" &&
    a.field === b.field &&
    a.officeKey === b.officeKey
  );
}
export function principlesAmendment(
  facts: ReformBallotFacts,
  stateUsps: string,
  year: number,
  voters: readonly Voter[],
): AmendmentSpec | null {
  const player = facts.playerPersonId;
  const counted = voters.filter((voter) => voter.personId !== player);
  if (counted.length === 0) return null;
  const inForce = constitutionalPolicyProvisions(facts, stateUsps);
  let best: {
    readonly propositionId: EntityId;
    readonly answer: "yes" | "no";
    readonly leaning: number;
  } | null = null;
  for (const proposition of stateDecidedPropositions(facts)) {
    const answer =
      inForce.find((row) => row.propositionId === proposition.id)?.stance ===
      "adopt"
        ? "no"
        : "yes";
    const leaning = counted.filter((voter) => {
      const score = principledLeaning(
        facts,
        voter.personId,
        proposition.id,
      ).score;
      return answer === "yes" ? score > 0 : score < 0;
    }).length;
    if (leaning * 2 <= counted.length) continue;
    if (!best || leaning > best.leaning)
      best = { propositionId: proposition.id, answer, leaning };
  }
  if (!best) return null;
  const proposition = facts.policyCatalog.propositions[best.propositionId]!;
  const stateName = facts.stateNames.get(stateUsps) ?? stateUsps;
  const stance = best.answer === "yes" ? "adopt" : "repeal";
  const spec: AmendmentSpec = {
    key: principlesMeasureKey(stateUsps, year),
    shortTitle: proposition.name,
    text:
      stance === "adopt"
        ? `"${proposition.name}" becomes part of the Constitution of ${stateName}.`
        : `The provision "${proposition.name}" is removed from the Constitution of ${stateName}.`,
    ruleDelta: {
      kind: "policy-provision",
      propositionId: proposition.id,
      stance,
    },
  };
  return spec;
}

function stateForDue(due: FutureDueItem) {
  const match = /^constitutional-reform\/v1:([A-Z]{2}):(\d{4})(?::|$)/.exec(
    due.stableKey,
  );
  return match ? { stateUsps: match[1]!, year: Number(match[2]) } : null;
}

export function recordedBallotTally(
  facts: ReformBallotFacts,
  measure: ConstitutionalMeasureRecord,
): {
  readonly yes: number;
  readonly no: number;
  readonly beliefIds: readonly EntityId[];
} | null {
  const delta = measure.ruleDelta;
  if (delta.kind !== "policy-provision") return null;
  const player = facts.playerPersonId;
  const latest = new Map<EntityId, PrivateBeliefRecord>();
  for (const belief of facts.beliefs) {
    if (
      belief.propositionId !== delta.propositionId ||
      belief.personId === player ||
      belief.formedAt > facts.onDate
    )
      continue;
    const prior = latest.get(belief.personId);
    if (!prior || prior.sequence < belief.sequence)
      latest.set(belief.personId, belief);
  }
  let yes = 0;
  let no = 0;
  const beliefIds: EntityId[] = [];
  for (const [personId, belief] of [...latest].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (belief.position !== "support" && belief.position !== "oppose") continue;
    if (
      !isEligibleVoterIn(facts, personId, measure.jurisdictionId, facts.onDate)
    )
      continue;
    const favors =
      (belief.position === "support") === (delta.stance === "adopt");
    if (favors) yes += 1;
    else no += 1;
    beliefIds.push(belief.id);
  }
  return yes + no === 0 ? null : { yes, no, beliefIds };
}
export function constitutionalReformBallotHandler(
  facts: ReformBallotFacts,
  due: FutureDueItem,
): {
  readonly commands: readonly InstitutionCommand[];
  readonly status: "resolved";
  readonly reason: string;
} {
  const found = stateForDue(due);
  const measure = facts.measures.find((candidate) =>
    due.stableKey.startsWith(`${candidate.stableKey}:ballot:`),
  );
  const done = (
    reason: string,
    commands: readonly InstitutionCommand[] = [],
  ) => ({ status: "resolved" as const, reason, commands });
  if (!found || !measure) return done("No amendment matches this ballot.");
  if (
    constitutionalPosition(facts.positions.get(measure.id)!, measure.id)
      .phase !== "ratification"
  )
    return done("The amendment is no longer before the voters.");
  const delta = measure.ruleDelta,
    tally = recordedBallotTally(facts, measure);
  if (!tally)
    return done(
      `Unsupported: no eligible voter holds a recorded view on ${measure.designation}, so no result is recorded.`,
    );
  const yes = Math.round((tally.yes * 10_000) / (tally.yes + tally.no));
  const conflicting = facts.measures.some(
    (other) =>
      other.id !== measure.id &&
      other.jurisdictionKey === measure.jurisdictionKey &&
      sameRuleChanged(other.ruleDelta, delta) &&
      facts.positions
        .get(other.id)!
        .actions.filter((action) => action.measureId === other.id)
        .some(
          (action) =>
            action.detail.kind === "statewide-vote" &&
            action.detail.electionAt === facts.onDate &&
            action.detail.yes > action.detail.no,
        ),
  );
  if (conflicting && yes > 5_000) {
    const nextDay = nextGeneralElectionDay(addDays(facts.onDate, 1));
    return done(
      `${measure.designation} moved to the next general election; another measure on the same rule passed today.`,
      [
        {
          command: "scheduleFutureDueItem",
          input: {
            stableKey: `${measure.stableKey}:ballot:${nextDay.slice(0, 4)}`,
            dueAt: nextDay,
            transitionKey: "governing:constitutional-reform-ballot",
            entityIds: due.entityIds,
            jurisdictionId: due.jurisdictionId,
            provenance: {
              kind: "authored",
              note: "ocd-constitutional-reform-placeholder/v1: a placeholder pending research (governor-term-limit-amendment-causes), not any state's record.",
            },
          },
        },
      ],
    );
  }
  return done(
    yes > 5_000
      ? `The voters ratified ${measure.designation}.`
      : `The voters rejected ${measure.designation}.`,
    [
      {
        command: "recordStatewideRatification",
        input: {
          measureId: measure.id,
          detail: {
            kind: "statewide-vote",
            yes,
            no: 10_000 - yes,
            electionAt: facts.onDate,
            statementFiledAt: facts.onDate,
          },
        },
      },
    ],
  );
}
