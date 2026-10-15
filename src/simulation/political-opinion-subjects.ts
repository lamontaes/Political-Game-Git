import { PARTY_QUESTIONS } from "./party-questions-data";
import type { EntityId, PrivateBeliefRecord, World } from "./types";

export interface PartyOpinionSubject {
  readonly kind: "party-question";
  readonly key: string;
}

/** What a person thinks of one official: credit, blame, or both at once. */
export interface OfficialOpinionSubject {
  readonly kind: "official";
  readonly personId: EntityId;
}

export function partyOpinionSubject(key: string): PartyOpinionSubject {
  requirePartyQuestion(key);
  return { kind: "party-question", key };
}

export function officialOpinionSubject(
  personId: EntityId,
): OfficialOpinionSubject {
  return { kind: "official", personId };
}

export function requirePartyQuestion(key: string) {
  const question = PARTY_QUESTIONS.find((item) => item.key === key);
  if (!question) throw new Error(`Unrecognized party question: ${key}`);
  return question;
}

export function privateBeliefSubjectId(
  belief: Pick<PrivateBeliefRecord, "propositionId" | "subject">,
): EntityId {
  if (belief.subject) {
    if (belief.propositionId !== null)
      throw new Error(
        "Party and official opinions cannot reference policy propositions.",
      );
    if (belief.subject.kind === "official")
      return `official:${belief.subject.personId}` as EntityId;
    if (belief.subject.kind !== "party-question")
      throw new Error("Invalid political opinion subject kind.");
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
    "propositionId" | "subject" | "optionKey" | "position" | "personId"
  >,
): void {
  privateBeliefSubjectId(belief);
  if (belief.subject?.kind === "official") {
    if (
      !world.people[belief.subject.personId] ||
      belief.subject.personId === belief.personId ||
      belief.optionKey !== undefined ||
      belief.position === "uncertain"
    )
      throw new Error(
        "A view of an official names another person in the world and takes a side.",
      );
  } else if (belief.subject) {
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
