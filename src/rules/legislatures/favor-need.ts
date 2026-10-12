import type { EntityId, IsoDate } from "../../simulation/types";
import type { FavorNeed } from "../../simulation/favor-collection";
import { ageOnDate } from "../offices/calendar";
export interface FavorNeedFacts {
  readonly onDate: IsoDate;
  readonly people: ReadonlyMap<EntityId, { readonly birthDate: IsoDate }>;
  readonly campaign: {
    readonly id: EntityId;
    readonly contestId: EntityId;
  } | null;
  readonly campaignStatus: string | null;
  readonly contestStatus: string | null;
  readonly electionDate: IsoDate | null;
  readonly activeWorkRelationships: readonly unknown[];
}
export function favorNeed(
  facts: FavorNeedFacts,
  personId: EntityId,
): FavorNeed | null {
  const person = facts.people.get(personId);
  if (!person) return null;
  const campaign = facts.campaign;
  if (
    campaign &&
    facts.campaignStatus === "active" &&
    facts.contestStatus === "pending"
  ) {
    return {
      kind: "campaign",
      campaignId: campaign.id,
      electionDate: facts.electionDate!,
      words: "their campaign",
    };
  }
  const age = ageOnDate(person.birthDate, facts.onDate);
  if (age >= 22 && age < 65 && facts.activeWorkRelationships.length === 0) {
    return { kind: "work", words: "finding work" };
  }
  return null;
}
