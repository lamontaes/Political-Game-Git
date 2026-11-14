---
id: opening-jobs-claims-empty-at-day-0
title: "People on unemployment insurance are missing on day 0"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the day-zero check (skill day-one-in-motion), Nov 14, measured on train head 8bb1ff9d; F1 said the first step does not make claims"
claimed-at:
after:
lead: jobs
model: sonnet
effort: medium
root: day-one-in-motion
---

**What.** At creation the world keeps no rows in `jobs.claims`; it fills about a month into play (owner, Nov 14: "The town must be in motion on day one... not just town, but country and state. Remember, it's all one simulation."). A real town has people drawing unemployment insurance on any day. Level: town and county (state pays; federal funds extended benefits). Seen: the jobs screen and the town's jobless count on day 0, where people on unemployment insurance are missing.

**Cause.** Measured: `jobs.claims` (town and county; creation / day 1 / day 31 / year 1) 0/0/4/379 at Washington, 0/0/13/199 at Lewiston. `node --import tsx scripts/dev-tests/day-zero-year.ts a1 365` on train head 8bb1ff9d, Washington, District of Columbia (`drawPlace("a1", "day-zero")`), and `b2`, Lewiston, Maine. Not yet traced to the first writer; read where `src/core2/modules/jobs.ts` first writes a claim and why the first step leaves the jobless spells of the opening without one.

**Fix.** Opening stock comes from the engine that makes the flow: the opening's jobless people who qualify under the place's law hold a claim, written by the same function that writes claims later. Never a hand-filled list and never a second writer. Numbers come from the place's rows.

**Warm-up result (Nov 14, 31-day warm-up of src/core2/player-warm-up.ts, measured at Washington DC and Lewiston ME on train head b7ed6337).** The warm-up fills `jobs.claims` at both places; their known-red marks are gone. Nothing is left for this item once the warm-up folds; a second session confirms it on the running game, then it is done.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Day one in motion (`.agents/skills/day-one-in-motion/SKILL.md`): one engine per mechanic; no dice; one rule, all 56 places; replace, never layer; a year stays under two minutes.

**Done when.** A second session, not the builder, builds a world at a drawn place and seed it names (`buildBenchWorld`, two-level) and sees `jobs.claims` with rows at creation, by record id; its row in `src/core2/data/opening/day-zero.json` has its `knownRed` mark removed, and `src/core2/day-zero.test.ts` passes at its two pinned places.

**Waits on.** `opening-first-step-empty-at-day-0` (the spells it reads).

**Files.** src/core2/modules/jobs.ts; src/core2/data/opening/day-zero.json
