# Puerto Rico has a Governor, and this branch had pinned otherwise

Written 2026-09-22, on `claude/nationwide-government-mqcw7p`.

## What was wrong

Three test files asserted that Puerto Rico has no chief executive:

- `src/presentation/nationwide-opening.test.ts` — `stateExecutiveOffice("PR")`
  is null, and a Puerto Rico life opens with no office of its own.
- `src/simulation/nationwide-world/nationwide-chief-executives.test.ts` — a
  case named "has no rule for a jurisdiction that is neither a state nor the
  District".
- `src/simulation/nationwide-world/state-executive-term-rules.test.ts` —
  `stateExecutiveTermRule("PR")` is null, beside the District's.

**Puerto Rico elects a Governor.** So those were not descriptions of a gap in
our data, they were a green assertion of something untrue about a real place,
and a test is the most durable way to state a thing wrongly: it is checked on
every run and read as settled.

## The distinction that matters

A generated pack **saying nothing** about Puerto Rico's chief executive is a
gap. A test **asserting** Puerto Rico has no chief executive is a false
statement. The values are identical and the claims are opposite. An absent
answer is honest; an asserted absence is not.

## What changed

The assertions are kept, because they still pin the invariant that actually
matters and removing them would fail open: **a jurisdiction that is not a
state is never handed a manufactured US-state governorship to fill the hole.**
What changed is what they claim. The case is renamed to
"has not compiled Puerto Rico's Governor, and invents nothing in its place",
and each site now says the office is real and uncompiled rather than absent.

Nothing about behavior moved. Eighteen tests across the two chief-executive
files pass unchanged.

## The other half, not fixed here

Puerto Rico also receives the same **drawn bicameral legislature** every
unread jurisdiction receives on this branch, pinned by
`src/presentation/playtest-candidacy-drawn-minimum-age.test.ts` — its senate
refuses a 29-year-old and admits a 40-year-old. Puerto Rico's real legislature
**is** bicameral, so the shape is right by the draw rather than by anyone
reading Puerto Rico's law, and the pack is disclosed as the game's own rule.

The District is handled the other way and deliberately so: no legislature,
because it is legislated for by one thirteen-member Council, and a Mayor
rather than a governor.

Puerto Rico's factual compilation is parked with scope approved. **When it
lands it replaces the drawn pack outright rather than being reconciled with
it**, and it closes the chief-executive gap above at the same time.
