---
id: laws-order-question-rows
title: "Three executive orders get policy questions: contractor minimum wage, ban-the-box, agency climate targets"
area: laws
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Governors issue three orders by order alone that the executive engine cannot carry because the game has no policy question for them: a minimum wage for state contractors (24 states), ban-the-box in public hiring (18) and state-agency climate targets (25), all in data/research/executive/executive-powers-2026.json canOrder. Add one policy question per order, one question at a time, each with its state-level authority, starting law for all 56 places, wording and wiring, then map it in ORDERABLE (src/core2/modules/executive.ts) so a governor the player plays is brought the order and a governor the character plays issues it from their views. Today only restoring voting rights and public-sector collective bargaining recognition are mapped.

**Rules.** One rule, all 56 places; every number sourced; replace never layer; effect is a read; a half-built question fails the wiring guards.

**Done when.** For each of the three questions: a row in every file below with sourced starting law for all 56 places, the wiring guards pass, and in a played governor's year one governor is brought the order and issues or sets it aside, with the law row in force named by record id.

**Files.** data/research/powers-catalog/question-powers.json, data/research/laws/starting-law-2026/question-order.json, data/research/laws/starting-law-2026/ (the family file and its .d.json.ts), data/research/laws/catalog-terms-batch-02.json, data/research/campaigns/issue-axes-2026.json, data/research/campaigns/policy-support-2026.json, data/research/outcome-web/links.json, data/english/question-names.json, data/english/bill-names.json, data/english/bill-sections.json, src/core2/data/laws/reach-group-a.json, src/core2/data/legislature/bill-catalog.json, src/core2/data/legislature/series-powers.json, scripts/law-wiring/declared/*.json, src/core2/modules/executive.ts (ORDERABLE)

**Notes.** From Legislation, Nov 8. The fifteen files are those that name restore-voting-after-sentence, the one existing order question. The research citations for each order (which states, the order and its legal limit) are being gathered by a sub-agent into the Legislation scratchpad and will be added here by Legislation.
