# Puerto Rico is in scope, and it is not a one-line addition

Recorded 2026-09-22 ~13:20Z, from lamontae in project chat: "you can include
Puerto Rico."

That settles it as a jurisdiction the game covers. This note is about what it
costs, so the size is known before someone treats it as a list entry.

## What the game currently enumerates

50 states plus D.C. — 51 jurisdictions. The nationwide coverage report asserts
that shape directly in `tests/source/nationwide-rule-coverage.test.ts`:

```ts
expect(report.totals.states).toBe(50);
expect(report.states).toHaveLength(51);
```

## What D.C. cost, as the precedent

D.C. is the only existing non-state jurisdiction, and it is not a row. It has
its own pair of files — `src/simulation/nationwide-world/district-of-columbia.ts`
and `district-of-columbia-identity.ts` — because a jurisdiction that is not a
state needs its own answers about what its offices are and how identity in it
works, rather than inheriting a state's.

Puerto Rico is the same kind of problem and a larger one: a commonwealth with
its own constitution, its own legislature, and municipios rather than counties.

## The parts that will not be a rename

- **Every 51-length assertion becomes 52**, and `totals.states` stops being the
  same number as "rows minus one".
- **The generated census artifacts move.** `government-units.generated.ts` and
  `national-counties.generated.ts` are derived from Census sources, and the
  catalog currently totals 38,704 units. Puerto Rico's municipios are in those
  sources. That total is asserted in three places in the coverage test alone,
  so the number changes and the regeneration has to be deliberate.
- **Rules will mostly be unresearched at first**, which is the realistic-range
  rule's case rather than a refusal.

That last point matters for sequencing: the range rule is currently measured
broken for Maine, Georgia and Arizona, which refuse outright with "the game has
not read this state's elected offices yet". Bringing Puerto Rico in before that
is fixed adds a jurisdiction to the set that fails, rather than one that plays.
Whatever fixes the three should cover Puerto Rico by construction — and the
other half of that rule has to survive the fix: a range is drawn nationally
from the spread the read states span, never borrowed from one neighbouring
state's rules.

## Not in #283

#283 is 69+ files and is being driven to green. This is its own change, after.
