---
id: dev-mode-bills-panel-policy-questions
title: "The dev Bills panel can introduce a yes-or-no policy question, such as the consumer loan cap"
area: play
kind: feature
priority: 3
size: S
status: dropped
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

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. `src/bench/ui/dev-bills.mjs` sends a policy question as a yes/no answer (the `questions` set, line 66, and the asked-question branch at line 76) and its Repeal control introduces the opposite answer (line 134: "Repealing a yes-or-no law is a bill that answers it No, voted like any other"). `DevMode.introduce` (`src/bench/dev-mode.ts` line 979) takes both kinds, with `POLICY_QUESTIONS` imported at line 31. Not replayed in a played year.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
