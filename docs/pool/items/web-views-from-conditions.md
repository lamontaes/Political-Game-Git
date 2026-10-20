---
id: web-views-from-conditions
title: "Owner question: should stances move when people hear the town's conditions changed?"
area: people
kind: owner-decision
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With PR #5637 the town's month becomes news and people hear rent, unemployment and crime changes; the change reaches their vote, but views.ts moves a stance only for events with a policy question and desired change, and conditions have no stance topic. Ask the owner whether hearing that rent rose should shift, for example, a housing-policy stance, and by what rule.

**Rules.** Look before you ask (read DECISION-REGISTER.md and OWNER-DECISIONS.md first); no invented opinion sizes.

**Done when.** The owner's ruling is recorded in OWNER-DECISIONS.md and, if yes, a follow-up wiring item exists.

**Files.** src/core2/modules/views.ts, src/core2/outcome-news.ts

**Notes.** TODO
