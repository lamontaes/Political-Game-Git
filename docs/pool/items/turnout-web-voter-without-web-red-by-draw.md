---
id: turnout-web-voter-without-web-red-by-draw
title: "turnout-web test red on main by draw: a voter's turnout carries no web factor where the test expects one (Rosine, Kentucky, seed 6b7ac4d1e81306af)"
area: elections
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: haiku
effort: low
root: design-electorate-one-model
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** src/core2/turnout-web.test.ts ('multiplies each voter's propensity by the links the laws do not already read') fails on clean main (9349010200, Oct 29 14:00 UTC) with WEB_TURNOUT_SEED=6b7ac4d1e81306af, Rosine, Kentucky: 'person_3145fcd0a79db1ab: expected undefined to be defined'. The test shifts the town's web month and expects each voter's turnout decision to carry the web's factor; this voter's decision carries none, so either their decision was made before the shifted row was read (a cached decision for the day), they live outside the town the web keeps, or their age or place gives no link. Other seeds pass. Found by the laws session while gating the civic family.

**Cause.** Found in code: (Fable, Nov 10) the engine reads a voter's web factor once a game day and keeps it for the day (`turnoutWeb`, src/core2/turnout-web.ts, the cache at line 34), so a row shifted mid-day was read the next day. The test now plays one more day after it shifts the row. Measured: on main 97b13d43 (Nov 11), `WEB_TURNOUT_SEED=6b7ac4d1e81306af npx vitest run src/core2/turnout-web.test.ts` (Rosine, Kentucky) and `WEB_TURNOUT_SEED=88ebfe6449fd8869` (As Rabagau, Northern Mariana Islands) both pass, as did a fresh draw this morning (1f9a70aa1a9c8e50).

**Fix.** Nothing to build. The CTO drops the item as done by main.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** The chain is the acceptance: a voter's turnout decision carries the web factor for their own place, age and ballot on the day they decide, by record id. One rule, all 56 places: the test keeps drawing its place and names the place and seed.

**Done when.** A second session runs the test src/core2/turnout-web.test.ts on both seeds above and one fresh drawn place, named with its seed, and it passes; the item is then dropped.

**Waits on.** Nothing.

**Files.** src/core2/turnout-web.ts, src/core2/turnout-web.test.ts, src/core2/modules/voting.ts

**Notes.** TODO

Oct 29 14:30 UTC (laws session): a second case on main, WEB_TURNOUT_SEED=88ebfe6449fd8869, As Rabagau, Northern Mariana Islands: person:press:outlet:newspaper:0:jurisdiction_3584967e5578b072:owner:0 carries no web factor. The voter is a press outlet owner, a person the press module seats; check whether such people keep a place or birth date the turnout reader needs (decideTurnout reads who.placeId and who.birthDate before it asks the web).

**Notes (Fable, Nov 10, rerun).** Both seeds pass on main 8f2a7f2725: `WEB_TURNOUT_SEED=6b7ac4d1e81306af npx vitest run src/core2/turnout-web.test.ts` (Rosine, Kentucky) and the same with 88ebfe6449fd8869 (As Rabagau, Northern Mariana Islands). The test now plays one more day after it shifts the web's row, with a comment saying why: the engine reads a voter's web factor once a game day and keeps it for the day (`turnoutWeb` in src/core2/turnout-web.ts, the cache at line 34). That was this item's first candidate cause. Nothing is left to build; it is the CTO's to drop as done by main.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `WEB_TURNOUT_SEED=6b7ac4d1e81306af npx vitest run src/core2/turnout-web.test.ts` (Rosine, Kentucky): green. `WEB_TURNOUT_SEED=88ebfe6449fd8869` (As Rabagau, Northern Mariana Islands): green. Fresh draw `WEB_TURNOUT_SEED=1f9a70aa1a9c8e50`: green. Proposed for the CTO: drop as fixed on main.

Nov 11 (cause finder for Fable B): both of the item's seeds pass on main. The cause, the day's cached web factor, was named by Fable on Nov 10 and the test already plays the day after the shift. Drop as done.

Dropped Nov 13, 2026 (Account lead T33, CTO's Nov 12 drop rule): its own Fix section says "Nothing to build. The CTO drops the item as done by main." and its Cause says the fault does not reproduce on main. The reproduce-again advice in that Fix stays the way back: file a new item from the place and seed if it returns.
