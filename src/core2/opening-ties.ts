/**
 * Whom a counted person knows when they are filled in (CTO, Nov 8, on #7365):
 * the neighbors their years in one place have given them, and their
 * workgroup at a sampled county employer. Both come from the other counted
 * households of their place; the ones named become husks (met and filled in
 * later) exactly as any tie to a counted person does. Who is chosen is
 * seeded by the pair (generation of who exists), how many by the person's
 * years in place and the estimated neighbors-known curve; the same person
 * returns the same ties every time.
 */
import { ageOn } from "./counted-groups";
import { stableHash } from "./kernel/ids";
import { residentsRuntime } from "./modules/residents";
import { parameter } from "./parameters";
import type { CoreState, HouseholdInput, PersonId, PersonInput } from "./types";

/** How many neighbors a household with this many years in place knows (estimated cap and time constant). */
export function neighborsKnown(years: number, params: Parameters): number {
  return params.cap * (params.one - Math.exp(-years / params.years));
}
type Parameters = { cap: number; years: number; one: number };

export function openingTiesOf(
  core: CoreState,
  person: PersonInput,
  home: HouseholdInput,
): PersonId[] {
  const store = residentsRuntime(core)?.store;
  if (!store || !home.since) return [];
  const p = (key: string) => parameter(key, core.data.parameters);
  const want = Math.round(
    neighborsKnown(ageOn(home.since, core.date), {
      cap: p("neighborsKnownCap"),
      years: p("neighborsKnownYears"),
      one: p("one"),
    }),
  );
  const order = (a: string) =>
    stableHash(`${core.seed}:ties:${person.id}:${a}`);
  const ties = new Set<PersonId>();
  const others = [...store.liveHouseholds()].filter(
    (h) => h.placeId === home.placeId && h.id !== home.id,
  );
  const neighbors = others
    .map((h) => ({ h, key: order(h.id) }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(0, want);
  for (const { h } of neighbors) {
    const head = store.memberIdsOf(h)[0];
    if (head) ties.add(head);
  }
  const mine = home.employment?.find((row) => row.personId === person.id);
  if (mine)
    for (const h of others)
      for (const work of h.employment ?? [])
        if (
          work.employerId === mine.employerId &&
          store.countedMember(work.personId) !== undefined
        )
          ties.add(work.personId);
  return [...ties].sort();
}
