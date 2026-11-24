---
id: law-levels-federal-income-tax-adoption
title: "Congress can repeal and restore its own income-tax adoption law"
area: laws
kind: wiring
priority: 2
size: M
status: done
claimed-by: astra/federal-income-adoption
pr: #7352
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-08T01:48:46.519Z
---

**What.** The shared adopt-income-tax question is state-only although 26 USC 1 imposes the federal income tax and federal-answers.json already records yes. Load that sourced federal answer through the normal law rows, enable the Congress route, and preserve the real federal tax schedule on repeal and restoration. Check the zero-amount then policy-adoption route too, so Congress cannot silently get the local default flat rate.

**Rules.** Primary source https://www.law.cornell.edu/uscode/text/26/1, including subsection j. Federal and state taxes are concurrent; no generic federal override of state income-tax answers. Preserve the existing resolver treatment of territory taxes; do not claim this certifies territory mirror-law powers. One shared bill and tax engine, level as data.

**Done when.** In a randomly drawn buildBenchWorld with printed place and replay, Congress drafts, signs and gives effect to repeal and restoration of the shared federal adoption question. Its real original income-tax terms and operative withholding return; state and local income tax remain unchanged, and excluded federal income taxes remain excluded. Prove the old route fails, ten fresh draws and a new game pass.

**Files.** data/research/powers-catalog/question-powers.json,data/research/laws/starting-law-2026/fiscal.json,src/core2/data/legislature/bill-catalog.json,scripts/research/build-bill-catalog.py,src/core2/law-reach/group-b-money.ts,src/core2/federal-income-tax-adoption.test.ts

**Notes.** Astra Nov 8 read 26 USC1 current subsections a and j (cached income-tax-26-1.txt). Existing numeric law:income-tax already admits Congress; this is the missing shared policy question. incomeTaxAct currently picks local defaults for every non-state level, so do not merely add federal to the catalog. Reuse retained actual tax terms/history for restoration.

Astra implementation: sourced US yes and federal catalog level; the shared incomeTaxAct restores actual same-jurisdiction tax history after an independent zero-rate act. Its lifecycle row records the policy law so an old standing review cannot reverse that rate act. Walloon Lake MI replay 645cac745d50392b restores 1,361,400 minor units of federal annual withholding and exact terms; other levels stay unchanged. Old handler fails at zero instead of 37. Ten unrestricted draws pass; additional data-conditioned exclusion draw Frederiksted VI replay 214c4a0c7dd2f993 preserves federal zero and territorial withholding. Ukiah CA b539adbf83aa71ca opens and plays four weeks. Staged passed desks and equal-gross withholding calculations, not played votes or paid wages.
