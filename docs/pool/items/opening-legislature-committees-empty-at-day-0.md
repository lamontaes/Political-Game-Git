---
id: opening-legislature-committees-empty-at-day-0
title: "A world opens with no committees; it takes a whole year to fill"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the day-zero check (skill day-one-in-motion), Nov 14, measured on train head 8bb1ff9d"
claimed-at:
after:
lead: governing
model: sonnet
effort: medium
root: day-one-in-motion
---

**What.** At creation the world keeps no rows in `core2-legislature-v1.committees`; they fill after a whole year of play (owner, Nov 14: "The town must be in motion on day one... not just town, but country and state. Remember, it's all one simulation."). A real place has this on an ordinary day before anyone starts watching. Seen: a body's screen on day 0: its committees and their members.

**Cause.** Measured: `node --import tsx scripts/dev-tests/day-zero-year.ts a1 365` and `... b2 365` on train head 8bb1ff9d, Washington, District of Columbia (`drawPlace("a1", "day-zero")`) and Lewiston, Maine (`drawPlace("b2", "day-zero")`), two-level population, opening Jan 20, 2025. Rows at creation / after 1 / 31 / 365 days: `core2-legislature-v1.committees` (creation / day 1 / day 31 / year 1) 0/0/0/16 at Washington, 0/0/0/21 at Lewiston. Not yet traced to the first writer; the first step is to read the function in src/core2/modules/legislature.ts that first writes the table and see what the opening leaves undone.

**Fix.** Give the opening the stock the same engine would hold after a long run: run the engine that writes the table (a warm-up of its own monthly step, or a draw from its own steady state with the place's own figures). Never a hand-filled list and never a second writer. Change the function in src/core2/modules/legislature.ts that first writes the table. The numbers come from the place's rows, never from a place named in code.

**Warm-up result (Nov 14, 31-day warm-up of src/core2/player-warm-up.ts, measured at Washington DC and Lewiston ME on train head b7ed6337).** Still empty after it: `core2-legislature-v1.committees`. This item now covers only those; the engine that owns each writes its stock for the past date inside the warm-up window.

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Day one in motion (`.agents/skills/day-one-in-motion/SKILL.md`): one engine per mechanic; no dice (seeded generation of who exists is allowed, nothing after day 0 is a draw); one rule, all 56 places; estimate, never UNKNOWN; replace, never layer; a year stays under two minutes (`speed:year` before and after, table in the PR body).

**Done when.** A second session, not the builder, builds a world at a drawn place and seed it names (`buildBenchWorld`, two-level) and sees the listed table(s) with rows at creation, by record id; the row for `core2-legislature-v1.committees` in `src/core2/data/opening/day-zero.json` has its `knownRed` mark removed, and `src/core2/day-zero.test.ts` passes at its two pinned places.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts; src/core2/data/opening/day-zero.json
