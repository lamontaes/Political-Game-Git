export interface ShortfallOrderFacts {
  readonly governorPersonId: string | null;
  readonly reservePrincipleScore: number;
  readonly recordIds: readonly string[];
}

export interface ShortfallOrderDecision {
  readonly cutFirst: boolean;
  readonly personId: string | null;
  readonly recordIds: readonly string[];
}

/** Select whether program cuts precede reserve use from the read principle. */
export function shortfallOrderFromFacts(
  facts: ShortfallOrderFacts,
): ShortfallOrderDecision {
  if (facts.governorPersonId === null)
    return { cutFirst: false, personId: null, recordIds: [] };
  return {
    cutFirst: facts.reservePrincipleScore > 0,
    personId: facts.governorPersonId,
    recordIds: facts.recordIds,
  };
}
