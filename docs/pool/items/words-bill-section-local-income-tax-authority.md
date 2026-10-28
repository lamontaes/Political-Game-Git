---
id: words-bill-section-local-income-tax-authority
title: "Bill words for a state granting or withdrawing its towns' power to levy an income tax"
area: words
lead: words
kind: feature
priority: 2
size: S
status: done
claimed-by: words/local-income-tax-authority
pr: #6432
blocked-on:
source: laws lead, Oct 26
claimed-at: 2026-10-27T22:43:18.223Z
---

**What.** The legislature already reads a state's grant of local income tax authority (`local-income-tax-authority`, a state row valued 1 for granted and 0 for withdrawn) whenever a town's body drafts an income tax (`src/core2/modules/legislature.ts`). No bill can change the grant, because a series a body can draft needs its bill-section row in `data/english/bill-sections.json`, and `src/english/bill-sections.test.ts` checks every series in `series-powers.json` has one. The laws branch wrote that row itself in PR #5649; Merger 2 returned it on October 26, since bill words belong to the Words line. The row needs a subject ("the state's grant of local income tax authority" was the laws draft), a purpose, and words for a grant (1) and a withdrawal (0). It is a switch, not an amount: "raised to 1" reads wrong, so the words say what granting and withdrawing do.

**Rules.** No hand-written player text outside the English engine's banks; every bank piece plays unless the owner's grades reject it (owner, Oct 24).

**Done when.** `data/english/bill-sections.json` has a `local-income-tax-authority` row, and a bill that grants and one that withdraws the power compose in `src/english/bill-sections.test.ts`, with the series added to `src/core2/data/legislature/series-powers.json` (state level) in the same change or by the laws lead right after. **On screen.** A state bill granting or withdrawing towns' income tax power reads in plain words on the bill screen.

**Files.** data/english/bill-sections.json, src/english/bill-sections.test.ts, src/core2/data/legislature/series-powers.json

**Notes.** Laws lead, Oct 26. Once it lands, the laws lead adds the grant back to the bill catalog (`scripts/research/build-bill-catalog.py`) and clears `SG-LAW-local-income-tax-authority-change`.
