import type { World } from "./types";
export function assertVoterIdentificationIntegrity(world: World): void {
  const store = world.voterIdentification;
  if (!store) return;
  for (const [id, r] of Object.entries(store.people))
    if (
      id !== r.personId ||
      !world.people[id] ||
      !r.basis.trim() ||
      (r.acquiredOn && r.acquiredOn > world.currentDate)
    )
      throw Error("Invalid voter identification record.");
  const keys = new Set<string>();
  for (const t of store.trips) {
    if (
      keys.has(t.key) ||
      !store.people[t.personId] ||
      t.on > world.currentDate ||
      !Number.isSafeInteger(t.costCents) ||
      t.costCents < 0 ||
      !t.reason.trim() ||
      t.missedWork.some(
        (m) =>
          !Number.isSafeInteger(m.minutes) ||
          m.minutes < 0 ||
          !world.history.workRelationships.some(
            (w) => w.id === m.workRelationshipId && w.personId === t.personId,
          ),
      )
    )
      throw Error("Invalid voter identification trip.");
    keys.add(t.key);
  }
  const ballots = new Set<string>();
  for (const b of store.ballots ?? []) {
    const contest = world.history.electionContests?.find(
      (c) => c.id === b.contestId,
    );
    if (
      ballots.has(b.key) ||
      !world.people[b.personId] ||
      !contest ||
      !contest.candidatePersonIds.includes(b.candidatePersonId) ||
      b.castOn !== contest.electionDate ||
      b.castOn > world.currentDate ||
      !b.eligibilityReason.trim() ||
      !b.choiceReason.trim() ||
      (b.kind === "regular" && (b.cureBy !== null || b.curedOn !== null)) ||
      (b.kind === "provisional" && (!b.cureBy || b.cureBy < b.castOn)) ||
      (b.curedOn &&
        (b.curedOn < b.castOn ||
          b.curedOn > world.currentDate ||
          b.curedOn > b.cureBy!))
    )
      throw Error("Invalid identified voter ballot.");
    ballots.add(b.key);
  }
}
