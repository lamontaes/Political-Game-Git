import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "../src/presentation/new-game";
import { describePersonContext } from "../src/presentation/person-context";
import { personName, peopleInHouseholdAt, householdMembershipsAt, currentLifeCutoff } from "../src/simulation";

for (const [age, gender] of [[10, "female"], [15, "male"], [34, "unstated"]] as const) {
  const game = createNewGameWorld({ ...DEFAULT_NEW_GAME_SETUP, seed: "probe-72", startAge: age, gender: gender as any });
  const w = game.world;
  const me = game.playerPersonId;
  console.log(`\n=== age ${age} gender ${gender}: ${personName(w.people[me]!)} identity=${JSON.stringify(w.people[me]!.identity)}`);
  const cutoff = currentLifeCutoff(w);
  const ids = new Set<string>();
  for (const e of householdMembershipsAt(w, me, cutoff)) for (const p of peopleInHouseholdAt(w, e.membership.householdId, cutoff)) ids.add(p);
  for (const id of Object.keys(w.people)) {
    if (id === me) continue;
    const c = describePersonContext(w, me, id);
    if (!c) continue;
    console.log(`  ${c.name.padEnd(22)} | ${(c.relationship ?? "—").padEnd(24)} | ${c.pronouns.key} | ${c.basis}`);
  }
}
