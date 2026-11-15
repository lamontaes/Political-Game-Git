---
id: opening-record-votes-empty-at-day-0
title: "A world opens with no voting records; it takes a whole year to fill"
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

**What.** At creation the world keeps no rows in `core2-record-v1.votes`; they fill after a whole year of play (owner, Nov 14: "The town must be in motion on day one... not just town, but country and state. Remember, it's all one simulation."). A real place has this on an ordinary day before anyone starts watching. Seen: an official's card on day 0: how they voted last term.

**Cause.** Measured: `node --import tsx scripts/dev-tests/day-zero-year.ts a1 365` and `... b2 365` on train head 8bb1ff9d, Washington, District of Columbia (`drawPlace("a1", "day-zero")`) and Lewiston, Maine (`drawPlace("b2", "day-zero")`), two-level population, opening Jan 20, 2025. Rows at creation / after 1 / 31 / 365 days: `core2-record-v1.votes` (creation / day 1 / day 31 / year 1) 0/0/0/2169 at Washington, not filled at Lewiston. Not yet traced to the first writer; the first step is to read `recordVote` in `src/core2/modules/record.ts` and see what the opening leaves undone.

**Place note.** At Lewiston the table already holds 9,938 rows at creation (the record is seeded there); only Washington (a district, with its council) opens with none, so the day-zero file marks it known-red at Washington only (`knownRedPlaces`). Find what seeds the record at Lewiston and why it skips Washington before changing anything.

**Fix.** Give the opening the stock the same engine would hold after a long run: run the engine that writes the table (a warm-up of its own monthly step, or a draw from its own steady state with the place's own figures). Never a hand-filled list and never a second writer. Change `recordVote` in `src/core2/modules/record.ts`. The numbers come from the place's rows, never from a place named in code.

**Added Nov 14 (Account lead's call on the unsure tables), levels town, county, state and federal as listed.** The same check also found these empty at creation: `core2-legislature-v1.votes` (town, county, state and federal; creation / day 1 / day 31 / year 1) 0/0/0/2237 at Washington, 0/0/65/3661 at Lewiston. Would a real place have them under way on the start date? Yes. Opening stock comes from the engine that makes the flow, run backward or run ahead (a warm-up of its own step, or a draw from its own steady state with the place's own figures), never a second generator and never a hand-filled list. Measured on train head 8bb1ff9d at Washington, District of Columbia (`drawPlace("a1", "day-zero")`) and Lewiston, Maine (`drawPlace("b2", "day-zero")`).

**Warm-up result (Nov 14, 31-day warm-up of src/core2/player-warm-up.ts, measured at Washington DC and Lewiston ME on train head b7ed6337).** Still empty after it: `core2-legislature-v1.votes (at Washington only)`, `core2-record-v1.votes (at Washington only)`. This item now covers only those; the engine that owns each writes its stock for the past date inside the warm-up window.

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Day one in motion (`.agents/skills/day-one-in-motion/SKILL.md`): one engine per mechanic; no dice (seeded generation of who exists is allowed, nothing after day 0 is a draw); one rule, all 56 places; estimate, never UNKNOWN; replace, never layer; a year stays under two minutes (`speed:year` before and after, table in the PR body).

**Done when.** A second session, not the builder, builds a world at a drawn place and seed it names (`buildBenchWorld`, two-level) and sees the listed table(s) with rows at creation, by record id; the row for `core2-record-v1.votes`, `core2-legislature-v1.votes` in `src/core2/data/opening/day-zero.json` has its `knownRed` mark removed, and `src/core2/day-zero.test.ts` passes at its two pinned places.

**Waits on.** Nothing.

**Files.** src/core2/modules/record.ts; src/core2/data/opening/day-zero.json
