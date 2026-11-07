---
id: law-levels-congress-wage-question
title: "Expose the shared minimum-wage question to Congress under the FLSA"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The common raise-minimum-wage question is state-only in question-powers even though the shared wage engine is parameterized by level and Congress enacts the federal floor. Add Congress to that question with primary statutory evidence.

**Rules.** 29 USC 206(a) supplies the federal floor; 29 USC 218(a) preserves higher state and municipal floors. Use the existing wage and law resolver, no blanket federal preemption and no edits to State Sessions wage bars or wage engine. Preserve current state scope. Existing federal-specific question remains a compatibility entry, not a new engine.

**Done when.** An unchosen generated-world test finds an authorized Congress draft for the shared question, follows its existing producer into a federal wage floor, reverses it and verifies higher state/local floors remain effective. Primary sources cited; break-it, ten fresh draws, new-game check.

**Files.** data/research/powers-catalog/question-powers.json,src/core2/data/legislature/bill-catalog.json,src/core2/congress-wage-question.test.ts

**Notes.** Astra bounded federal reach item. Two-hour unit, no helpers. Does not claim remaining policy questions are sourced or enabled.
