---
id: opening-parties-chairs-stay-empty-all-year
title: "Party chairs stay empty after a year at Lewiston, Maine"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the day-zero measurement, Nov 14, train head 8bb1ff9d"
claimed-at:
after:
lead: governing
model: sonnet
effort: medium
root: day-one-in-motion
---

**What.** `core2-parties-v1.chairs` has 0 rows at creation at both places, 1 row after 365 days at Washington and still 0 after 365 days at Lewiston. A party with no chair for a whole year is a flow fault on top of the empty opening (`opening-parties-chairs-empty-at-day-0`). Seen: the party screen: who chairs each party, and the chair's ties.

**Cause.** Measured: `node --import tsx scripts/dev-tests/day-zero-year.ts b2 365` on train head 8bb1ff9d at Lewiston, Maine (`drawPlace("b2", "day-zero")`): the `chairs` table is empty at creation, day 1, day 31 and day 365; at Washington, District of Columbia (`drawPlace("a1", "day-zero")`) (`a1`) it holds 1 row after a year. The only writer found is `chooseChair` in `src/core2/modules/parties.ts`; what stops it from choosing at Lewiston is not yet traced.

**Fix.** Trace why `chooseChair` writes nothing at Lewiston (what condition it waits for), fix that condition in the party engine, and show the table filled within the first month at three drawn places with record ids. No second writer, no typed chair.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice; one rule, all 56 places; a year stays under two minutes.

**Done when.** A second session, not the builder, plays a year at a drawn place and seed it names and sees every party with a chair by month 1, by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/parties.ts
