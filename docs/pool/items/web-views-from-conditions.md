---
id: web-views-from-conditions
title: "Owner question: should stances move when people hear the town's conditions changed?"
area: people
kind: owner-decision
priority: 2
size: S
status: claimed
claimed-by: claude/views-from-conditions
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T10:09:21.273Z
---

**What.** With PR #5637 the town's month becomes news and people hear rent, unemployment and crime changes; the change reaches their vote, but views.ts moves a stance only for events with a policy question and desired change, and conditions have no stance topic. Ask the owner whether hearing that rent rose should shift, for example, a housing-policy stance, and by what rule.

**Rules.** Look before you ask (read DECISION-REGISTER.md and OWNER-DECISIONS.md first); no invented opinion sizes.

**Done when.** The owner's ruling is recorded in OWNER-DECISIONS.md and, if yes, a follow-up wiring item exists.

**Files.** src/core2/modules/views.ts, src/core2/outcome-news.ts

**Notes.** TODO

Oct 20 (claude): read DECISION-REGISTER.md and OWNER-DECISIONS.md first; nothing rules on it, so the question is written under Open in OWNER-DECISIONS.md with a recommended default. When the owner rules, record it there; if yes, add a wiring item (views.ts, outcome-news.ts).
