---
id: opening-meetings-town-halls-empty-after-a-year
title: "core2-meetings-v1.townHalls stays empty after a 31-day warm-up"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the opening warm-up measurement (skill day-one-in-motion), Nov 14, train head b7ed6337"
claimed-at:
after:
lead: gov
model: sonnet
effort: medium
root: day-one-in-motion
---

**What.** After the 31-day opening warm-up (`warmUpDays`, src/core2/player-warm-up.ts) `core2-meetings-v1.townHalls` still has no rows at the two pinned places, and a year of play barely fills it (owner, Nov 14: "The town must be in motion on day one... not just town, but country and state. Remember, it's all one simulation."). A real place has this on an ordinary day: a town has town halls on the calendar. Level: town and county. Seen: the first screens on day 0 read empty where a place already running would show it.

**Cause.** Needs cause. Measured: Washington DC never fills it in a year; Lewiston ME fills it by day 31 (0/0/10/36). The owner of the module `meetings` finds why its writer in src/core2/modules/meetings.ts does not write this table in the window (a calendar date, a condition the opening never meets, or a writer that runs only at a later date) before any fix.

**Fix.** None until the cause is found.

**Time box.** 2 hours to find the cause for one Sonnet session at medium effort; the fix is a separate pass.

**Rules.** Day one in motion (`.agents/skills/day-one-in-motion/SKILL.md`): one engine per mechanic; no dice; one rule, all 56 places; replace, never layer.

**Done when.** A second session, not the builder, builds a world with `warmUpDays: OPENING_WARMUP_DAYS` at a drawn place and seed it names and sees `core2-meetings-v1.townHalls` with rows at creation, by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/meetings.ts; src/core2/player-warm-up.ts
