---
id: people-opening-stance-needs-views-module
title: "Opening stance reads the views table in worlds without the views module"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/opening-stance-views
pr: #5752
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T20:31:10.546Z
---

**What.** On main, src/core2/modules/views.ts openingStance calls viewOf, which reads the views module's table; a core built without the views module (src/core2/campaigns.test.ts M2-05/M2-06, src/core2/press.test.ts campaign interviews and state and federal interviews, src/core2/voting.test.ts M2-07) throws 'Module has no registered state.' from campaigns reach -> agreementWith -> viewOn -> openingStance -> viewOf. Four tests are red on clean main at 53e6a040ce.

**Rules.** Fix at the root in views.ts: the faith and degree loadings apply only when the views module holds the person's view; never skip or narrow the four tests.

**Done when.** The four named tests pass on main, and a played world's opening stances still carry the faith and degree loadings.

**Files.** src/core2/modules/views.ts

**Notes.** TODO
