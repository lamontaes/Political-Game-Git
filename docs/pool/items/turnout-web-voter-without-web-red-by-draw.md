---
id: turnout-web-voter-without-web-red-by-draw
title: "turnout-web test red on main by draw: a voter's turnout carries no web factor where the test expects one (Rosine, Kentucky, seed 6b7ac4d1e81306af)"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/turnout-web.test.ts ('multiplies each voter's propensity by the links the laws do not already read') fails on clean main (9349010200, Oct 29 14:00 UTC) with WEB_TURNOUT_SEED=6b7ac4d1e81306af, Rosine, Kentucky: 'person_3145fcd0a79db1ab: expected undefined to be defined'. The test shifts the town's web month and expects each voter's turnout decision to carry the web's factor; this voter's decision carries none, so either their decision was made before the shifted row was read (a cached decision for the day), they live outside the town the web keeps, or their age or place gives no link. Other seeds pass. Found by the laws session while gating the civic family.

**Rules.** The chain is the acceptance: a voter's turnout decision carries the web factor for their own place, age and ballot on the day they decide, by record id. One rule, all 56 places: the test keeps drawing its place and names the place and seed.

**Done when.** turnout-web.test.ts passes with WEB_TURNOUT_SEED=6b7ac4d1e81306af and three further random seeds, named in the PR body, and the PR body says why person_3145fcd0a79db1ab carried no factor (the record or rule, by file and line) and what changed.

**Files.** src/core2/turnout-web.ts; src/core2/turnout-web.test.ts; src/core2/modules/voting.ts

**Notes.** TODO

Oct 29 14:30 UTC (laws session): a second case on main, WEB_TURNOUT_SEED=88ebfe6449fd8869, As Rabagau, Northern Mariana Islands: person:press:outlet:newspaper:0:jurisdiction_3584967e5578b072:owner:0 carries no web factor. The voter is a press outlet owner, a person the press module seats; check whether such people keep a place or birth date the turnout reader needs (decideTurnout reads who.placeId and who.birthDate before it asks the web).
