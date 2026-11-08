---
id: dev-mode-bills-panel-policy-questions
title: "The dev Bills panel can introduce a yes-or-no policy question, such as the consumer loan cap"
area: play
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** DevMode.introduce takes a policy question as a section of its own kind, and the loan-cap proof used it, but the Government tab's Bills panel (src/bench/ui/dev-bills.mjs) lists law series with a number box only. Add the policy questions to the panel with a yes or no value, and a Repeal control that introduces the opposite answer as a bill.

**Rules.** Replace, never layer: the panel's one introduce route grows to take both kinds, and no second panel is added.

**Done when.** In a drawn place, the loan cap is introduced and passed from the Government tab through the panel and the screenshot names the place and seed.

**Files.** src/bench/ui/dev-bills.mjs, src/bench/dev-api.ts

**Notes.** TODO
