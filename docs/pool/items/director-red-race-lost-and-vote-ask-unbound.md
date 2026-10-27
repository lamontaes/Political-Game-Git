---
id: director-red-race-lost-and-vote-ask-unbound
title: "Two director tests fail on clean main on some draws: a lost race stages no race-lost scene (Kittery, Maine) and a vote trade stages no vote ask (Aunu'u, American Samoa)"
area: director
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6277
blocked-on:
lead: director
source: added with npm run pool -- add
---

**What.** Found by the director lead on Oct 27 while running the director folder for director-scenes-from-circumstance; both reproduce on clean main at 04a54b1b0d with the same seeds. src/director/electoral-scenes.test.ts with GOLDEN_PATH_SEED=a65cf6256d99775a68975d378feeb510ffc37fc2 (Kittery, Maine): the candidate's night of the count has no bindings, so expected [] to include race-lost. src/director/bargain-scenes.test.ts with GOLDEN_PATH_SEED=08f37cd761b975d2d5c06cea32845bc8ee22ee44 (Aunu'u, American Samoa): the trade amendment bill-amendment:bill:office:US-AS:legislature-lower:2025-01-30:...:committee:1 stages no vote ask for the holdout. Find the binding that fails in each (the coverage row on the moment's schedule entry says which role or place) and fix it at the root.

**Time box.** 2 hours, Opus (director lead) or a Sonnet fixer.

**Rules.** The chain is the acceptance. No dice. One rule, all 56 places: a fix that works only in the named places is not one.

**Done when.** Both tests pass with the seeds above and with three fresh seeds each, on the PR head; the PR names the role or place that failed to bind and why.

**Files.** src/director/scheduling.ts, src/director/civic-roles.ts, src/director/electoral-scenes.test.ts, src/director/bargain-scenes.test.ts

**Notes.** TODO
