---
id: law-levels-congress-wage-question
title: "Expose the shared minimum-wage question to Congress under the FLSA"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: astra/congress-wage-question
pr: #7334
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T22:31:46.044Z
---

**What.** The common raise-minimum-wage question is state-only in question-powers even though the shared wage engine is parameterized by level and Congress enacts the federal floor. Add Congress to that question with primary statutory evidence.

**Rules.** 29 USC 206(a) supplies the federal floor; 29 USC 218(a) preserves higher state and municipal floors. Use the existing wage and law resolver, no blanket federal preemption and no edits to State Sessions wage bars or wage engine. Preserve current state scope. Existing federal-specific question remains a compatibility entry, not a new engine.

**Done when.** An unchosen generated-world test finds an authorized Congress draft for the shared question, follows its existing producer into a federal wage floor, reverses it and verifies higher state/local floors remain effective. Primary sources cited; break-it, ten fresh draws, new-game check.

**Files.** data/research/powers-catalog/question-powers.json,src/core2/data/legislature/bill-catalog.json,src/core2/congress-wage-question.test.ts

**Notes.** Astra bounded federal reach item. Two-hour unit, no helpers. Does not claim remaining policy questions are sourced or enabled.

Astra finding, Nov 7: no implementation pushed. The shared wage handler explicitly filters out federal rows, and the legacy federal question has its own held-wage record. Enabling only catalog data would silently do nothing; removing only the filter risks two controls restoring over each other. A correct next step must unify those aliases through the existing wage engine while preserving State Sessions bars. Returned open while fixing the fresh strict-audit failure in Mill Plain CT (replay ab5328363fd3c139): a statistical property-tax estimate is stored as county law with no county body. Branch astra/congress-wage-question has no implementation.

Astra follow-up: a data mapping from the shared question at federal level to the existing federal question avoids independent competing rules. The shared law reader and the existing enactment writer use that same canonical series; the wage engine and state/local bars stay unchanged. Talofofo GU replay 6dedd331cb067714 passes enactment/restoration through staged passage and production signatures, with a controlled higher territorial floor preserved. Necessary additional files: policy-answers.ts and the existing laws/legislature modules. Sources 29 USC 206 and 218 fetched from Cornell.
