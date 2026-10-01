import { PARTY_QUESTIONS } from "./party-questions-data";
import type { EntityId, PrivateBeliefRecord, World } from "./types";

export interface PartyOpinionSubject {
  readonly kind: "party-question";
  readonly key: string;
}

export function partyOpinionSubject(key: string): PartyOpinionSubject {
  requirePartyQuestion(key);
  return { kind: "party-question", key };
}

export function requirePartyQuestion(key: string) {
  const question = PARTY_QUESTIONS.find((item) => item.key === key);
  if (!question) throw new Error(`Unknown party question: ${key}`);
  return question;
}

export function privateBeliefSubjectId(
  belief: Pick<PrivateBeliefRecord, "propositionId" | "subject">,
): EntityId {
  if (belief.subject) {
    if (
      belief.subject.kind !== "party-question" ||
      belief.propositionId !== null
    )
      throw new Error("Party opinions cannot reference policy propositions.");
    requirePartyQuestion(belief.subject.key);
    return `party-question:${belief.subject.key}` as EntityId;
  }
  if (belief.propositionId === null)
    throw new Error("Missing political opinion subject.");
  return belief.propositionId;
}

export function validatePrivateBeliefSubject(
  world: World,
  belief: Pick<
    PrivateBeliefRecord,
    "propositionId" | "subject" | "optionKey" | "position"
  >,
): void {
  privateBeliefSubjectId(belief);
  if (belief.subject) {
    if (
      belief.position !== "support" ||
      !requirePartyQuestion(belief.subject.key).options.some(
        (option) => option.key === belief.optionKey,
      )
    )
      throw new Error("Party opinion requires a canonical selected option.");
  } else if (
    !world.policyCatalog.propositions[belief.propositionId!] ||
    belief.optionKey !== undefined
  ) {
    throw new Error(
      "Private belief references a missing proposition or invalid option.",
    );
  }
}
