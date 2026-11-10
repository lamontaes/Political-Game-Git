---
id: turnout-web-voter-without-web-red-by-draw
title: "turnout-web test red on main by draw: a voter's turnout carries no web factor where the test expects one (Rosine, Kentucky, seed 6b7ac4d1e81306af)"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-electorate-one-model
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** src/core2/turnout-web.test.ts ('multiplies each voter's propensity by the links the laws do not already read') fails on clean main (9349010200, Oct 29 14:00 UTC) with WEB_TURNOUT_SEED=6b7ac4d1e81306af, Rosine, Kentucky: 'person_3145fcd0a79db1ab: expected undefined to be defined'. The test shifts the town's web month and expects each voter's turnout decision to carry the web's factor; this voter's decision carries none, so either their decision was made before the shifted row was read (a cached decision for the day), they live outside the town the web keeps, or their age or place gives no link. Other seeds pass. Found by the laws session while gating the civic family.

**Cause.** Needs cause. Looked at: src/core2/modules/voting.ts decideTurnout (line 1747; the decision is cached per date and voter, and the web factor is read from the voter's place and birth date) and src/core2/turnout-web.test.ts, which expects each voter's decision to carry the web factor. Red by draw on clean main with WEB_TURNOUT_SEED=6b7ac4d1e81306af (Rosine, Kentucky: person_3145fcd0a79db1ab, 'expected undefined to be defined') and 88ebfe6449fd8869 (As Rabagau, Northern Mariana Islands, a press outlet owner). Candidate causes, none traced: a decision cached earlier the same day, or a voter with no placeId or birthDate. To find it: run the test on the two seeds and print, for the failing voter, whether the decision came from the cache, and the voter's placeId and birthDate.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session, which finds the cause and rewrites this item with it.

**Rules.** The chain is the acceptance: a voter's turnout decision carries the web factor for their own place, age and ballot on the day they decide, by record id. One rule, all 56 places: the test keeps drawing its place and names the place and seed.

**Done when.** A second session sees the cause written in this item by file and line (run the test on seeds 6b7ac4d1e81306af and 88ebfe6449fd8869 and print, for the failing voter, whether the decision came from the cache and the voter's placeId and birthDate), then runs src/core2/turnout-web.test.ts with WEB_TURNOUT_SEED=6b7ac4d1e81306af and three further seeds it chose, places named; it passes and each voter's turnout decision carries the web factor for their own place, age and ballot.

**Waits on.** Nothing.

**Files.** src/core2/turnout-web.ts, src/core2/turnout-web.test.ts, src/core2/modules/voting.ts

**Notes.** TODO

Oct 29 14:30 UTC (laws session): a second case on main, WEB_TURNOUT_SEED=88ebfe6449fd8869, As Rabagau, Northern Mariana Islands: person:press:outlet:newspaper:0:jurisdiction_3584967e5578b072:owner:0 carries no web factor. The voter is a press outlet owner, a person the press module seats; check whether such people keep a place or birth date the turnout reader needs (decideTurnout reads who.placeId and who.birthDate before it asks the web).

**Notes (Fable, Nov 10, rerun).** Both seeds pass on main 8f2a7f2725: `WEB_TURNOUT_SEED=6b7ac4d1e81306af npx vitest run src/core2/turnout-web.test.ts` (Rosine, Kentucky) and the same with 88ebfe6449fd8869 (As Rabagau, Northern Mariana Islands). The test now plays one more day after it shifts the web's row, with a comment saying why: the engine reads a voter's web factor once a game day and keeps it for the day (`turnoutWeb` in src/core2/turnout-web.ts, the cache at line 34). That was this item's first candidate cause. Nothing is left to build; it is the CTO's to drop as done by main.
