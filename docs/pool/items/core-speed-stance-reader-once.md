---
id: core-speed-stance-reader-once
title: "The press works out each candidate's stance from scratch for every interview question, and a stance write deep-copies its row (Ringgold, Louisiana 2028: about 18 s)"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In an election year the press asks every candidate where they stand on dozens of questions (interviewQuestions in src/core2/modules/press.ts), and each answer runs candidateStance in src/core2/campaign-stances.ts from scratch: the official row, the person's lean, their votes, the party lean and party firmness. A 2028 profile of one Ringgold, Louisiana save (seed long-1) put interviewQuestions at 17.9 s and candidateStance at 17.6 s inclusive. The views engine also deep-copies every stance row it writes (moduleData plainCopy, 2.4 s), and three callers find a stance by scanning a person's whole stance list.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** candidateStance reads its inputs once per person through a lazy stance reader the interview keeps for the call, stance rows are looked up by id, and a stance write freezes the fresh row in place in play; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process each, keeps dev mode's records proof identical in every table of the played world at year 4, with the times in the PR body.

**Files.** src/core2/campaign-stances.ts, src/core2/modules/press.ts, src/core2/modules/views.ts, src/core2/module-data.ts, src/core2/module-state.ts, src/core2/trait-decisions.ts

**Notes.** TODO
