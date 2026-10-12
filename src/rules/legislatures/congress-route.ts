import type { EntityId, IsoDate } from "../../simulation/types";
import type { Voter } from "../../simulation/governing/article-v";
import type { ConstitutionalActionRecord } from "../../simulation/constitutional-types";
import type { proposeAndVoteAmendment } from "../../simulation/governing/constitutional-amendments";
import type { ChamberConstitutionalVoteInput } from "../../simulation/governing/chamber-votes";
import {
  constitutionalPolicyProvisions,
  type ConstitutionalPolicyFacts,
} from "./constitutional-policy";
import { constitutionalPosition } from "./constitutional-position";
import { leanShare, type ArticleVLeaningFacts } from "./article-v-leaning";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
import { makeIsoDate } from "../elections/calendar";
import type { InstitutionStepPlan } from "./institution-context";
export const ARTICLE_V_VERSION = "article-v/v1";
export const ARTICLE_V_PROFILE = {
  ratificationYears: 7,
  stateActionWindowDays: 730,
} as const;
export interface CongressRouteFacts
  extends ConstitutionalPolicyFacts, ArticleVLeaningFacts {
  readonly federalJurisdictionId: EntityId;
  readonly actions: readonly ConstitutionalActionRecord[];
  readonly house: readonly Voter[];
  readonly senate: readonly Voter[];
  readonly ballots: ReadonlyMap<
    string,
    {
      readonly facts: ChamberDecisionFacts;
      readonly input: ChamberConstitutionalVoteInput;
    }
  >;
}
function federalQuestions(facts: CongressRouteFacts): readonly EntityId[] {
  const catalog = facts.policyCatalog;
  return catalog.propositionOrder.filter((id) => {
    const proposition = catalog.propositions[id];
    return (
      proposition !== undefined &&
      (catalog.issues[proposition.issueId]?.levels ?? []).includes("federal")
    );
  });
}

function settledOrPending(
  facts: CongressRouteFacts,
  propositionId: EntityId,
): boolean {
  if (
    constitutionalPolicyProvisions(facts, "US").some(
      (row) => row.propositionId === propositionId && row.stance === "adopt",
    )
  )
    return true;
  return (facts.measures ?? []).some(
    (measure) =>
      measure.jurisdictionKey === "US" &&
      measure.ruleDelta.kind === "policy-provision" &&
      measure.ruleDelta.propositionId === propositionId &&
      ["consideration", "ratification"].includes(
        constitutionalPosition(facts.positions.get(measure.id)!, measure.id)
          .phase,
      ),
  );
}

function proposalText(
  facts: CongressRouteFacts,
  propositionId: EntityId,
): string {
  const name = facts.policyCatalog.propositions[propositionId]?.name ?? "";
  return `The policy "${name}" shall be the law of the United States.`;
}

function yearsLater(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) + years;
  const monthDay = date.slice(5) === "02-29" ? "02-28" : date.slice(5);
  return makeIsoDate(`${year}-${monthDay}`) as IsoDate;
}

function proposal(
  facts: CongressRouteFacts,
  input: {
    readonly measureKey: string;
    readonly propositionId: EntityId;
    readonly byConvention: boolean;
  },
): Parameters<typeof proposeAndVoteAmendment>[1]["proposal"] {
  const name =
    facts.policyCatalog.propositions[input.propositionId]?.name ?? "";
  const year = facts.onDate.slice(0, 4);
  return {
    stableKey: input.measureKey,
    jurisdictionId: facts.federalJurisdictionId,
    jurisdictionKey: "US",
    processKind: "federal-amendment",
    designation: `Proposed Amendment to the Constitution (${year}): ${name}`,
    shortTitle: name,
    text: proposalText(facts, input.propositionId),
    sponsoringAuthority: input.byConvention
      ? "A convention called on the applications of two-thirds of the states"
      : "The Congress of the United States",
    ratificationMode: "state-legislatures",
    deadlineAt: yearsLater(facts.onDate, ARTICLE_V_PROFILE.ratificationYears),
    ruleDelta: {
      kind: "policy-provision",
      propositionId: input.propositionId,
      stance: "adopt",
    },
    ...(input.byConvention ? { proposedBy: "convention" as const } : {}),
  };
}

export function repeatsLastRejection(
  facts: CongressRouteFacts,
  propositionId: EntityId,
  voters: {
    readonly house: readonly Voter[];
    readonly senate: readonly Voter[];
  },
): boolean {
  const last = (facts.measures ?? [])
    .filter(
      (measure) =>
        measure.jurisdictionKey === "US" &&
        measure.proposedBy !== "convention" &&
        measure.ruleDelta.kind === "policy-provision" &&
        measure.ruleDelta.propositionId === propositionId,
    )
    .at(-1);
  if (
    !last ||
    constitutionalPosition(facts.positions.get(last.id)!, last.id).phase !==
      "rejected"
  )
    return false;
  for (const action of facts.actions
    .filter((row) => row.measureId === last.id)
    .sort((a, b) => a.sequence - b.sequence)) {
    if (action.detail.kind !== "proposal-vote") continue;
    const bodyKey = action.detail.bodyKey;
    if (bodyKey !== "house" && bodyKey !== "senate") return false;
    const now = bodyKey === "house" ? voters.house : voters.senate;
    const then = new Map(
      action.detail.vote.dispositions.map((row) => [
        row.personId,
        row.disposition,
      ]),
    );
    if (then.size !== now.length) return false;
    const currentVotes = new Map(
      decideChamberVote(
        facts.ballots.get(`${last.id}:${bodyKey}`)!.facts,
        facts.ballots.get(`${last.id}:${bodyKey}`)!.input,
      ).map((vote) => [vote.personId, vote.disposition]),
    );
    for (const voter of now) {
      const before = then.get(voter.personId);
      if (before === undefined) return false;
      const ballot = currentVotes.get(voter.personId);
      if (ballot !== before) return false;
    }
  }
  return true;
}
/** Preparation and native recording reread returned facts; ranking and rejection comparison stay here. */
export function congressRoute(
  facts: CongressRouteFacts,
  year: number,
): InstitutionStepPlan {
  const { house, senate } = facts;
  if (house.length === 0 || senate.length === 0) return { kind: "idle" };
  const measureKey = `${ARTICLE_V_VERSION}:US:${year}:congress`,
    ranked: { id: EntityId; share: number }[] = [];
  for (const id of federalQuestions(facts)) {
    if (settledOrPending(facts, id)) continue;
    const share = Math.min(
      leanShare(facts, house, id),
      leanShare(facts, senate, id),
    );
    if (share * 3 < 2) continue;
    ranked.push({ id, share });
  }
  ranked.sort((a, b) => b.share - a.share);
  const best =
    ranked.find(
      (row) => !repeatsLastRejection(facts, row.id, { house, senate }),
    ) ?? null;
  if (!best) return { kind: "idle" };
  return {
    kind: "applied",
    commands: [
      {
        command: "proposeAndVoteAmendment",
        input: {
          proposal: proposal(facts, {
            measureKey,
            propositionId: best.id,
            byConvention: false,
          }),
          proposalBodies: [
            { bodyKey: "house", voters: house },
            { bodyKey: "senate", voters: senate },
          ],
          stateSchedule: {
            transitionKey: "governing:article-v-state-action",
            jurisdictionId: facts.federalJurisdictionId,
            minimumDays: 1,
            maximumDays: ARTICLE_V_PROFILE.stateActionWindowDays + 1,
            provenanceNote:
              "A state legislature takes up a proposed amendment (its day is a placeholder spread).",
          },
        },
      },
    ],
  };
}

// stopgapId: "SG-P14-legislatures-article-v-action-window"
