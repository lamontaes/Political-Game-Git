// STOPGAP offices.petition-contact-order: A stable-key FNV offset walks the whole person roster, rather than recorded contact geography.
// stopgapId: "offices.petition-contact-order"
export function circulateCandidatePetition(facts: {
  readonly stableKey: string;
  readonly candidatePersonId: string;
  readonly people: readonly string[];
  readonly previouslyAsked: readonly string[];
  readonly residentPeople: ReadonlySet<string>;
  readonly target: number;
  readonly alreadyCirculated: boolean;
  readonly campaignExists: boolean;
  readonly campaignId: string;
}): readonly string[] {
  if (!facts.campaignExists)
    throw new Error(`Campaign not found: ${facts.campaignId}`);
  if (
    facts.alreadyCirculated ||
    facts.target === 0 ||
    facts.people.length === 0
  )
    return [];
  const {
    stableKey,
    candidatePersonId,
    people,
    previouslyAsked,
    residentPeople,
    target,
  } = facts;
  let hash = 2166136261;
  for (const character of stableKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const start = (hash >>> 0) % people.length;
  const asked = new Set(previouslyAsked);
  const selected: string[] = [];
  let completed = 0;
  for (let step = 0; step < people.length && completed < target; step += 1) {
    const signerPersonId = people[(start + step) % people.length]!;
    if (
      signerPersonId === candidatePersonId ||
      asked.has(signerPersonId) ||
      !residentPeople.has(signerPersonId)
    )
      continue;
    selected.push(signerPersonId);
    asked.add(signerPersonId);
    completed += 1;
  }
  return selected;
}
