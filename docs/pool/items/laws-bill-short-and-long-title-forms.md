---
id: laws-bill-short-and-long-title-forms
title: "Bills carry a short title, a long title and a repeal clause in forms that read right locally"
area: laws
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: laws
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at:
---

**What.** Four lines the owner graded good sit in data/english/parts/legislation.json under stopgap SG-WORDS-legislation-no-reader: "This Act may be cited as the {act}.", "This title may be cited as the {act}.", "To provide for {purpose}, and for other purposes." and "{provision} is repealed.". The bill text (src/english/bill-sections.ts) words a bill's title as "An ordinance to ..." or "A bill for an act to ..." and says never the federal short-title form for a local measure, so nothing reads them. Add a short-title, a long-title and a repeal-clause form to the bill-sections schema, taken from these pieces, so a federal bill reads them as written and a local bill reads the local form.

**Time box.** Three hours for one Sonnet session.

**Rules.** Wire to the world: the title and purpose come from the bill-names row of the bill's own policy (billNameOf), never typed. Replace, never layer: the new forms replace the matching form in bill-sections.json and the legislation bank piece is deleted once its words live there. No hand-written player text.

**Done when.** In a drawn place from all 56 (name and seed in the PR body) a federal bill's text opens with a short title and a long title in these words and a repeal bill carries the repeal clause, and a local bill reads the local form; src/english/bill-sections.test.ts names the bill record ids. Then delete SG-WORDS-legislation-no-reader and keep the four graded keys in a bank or the forms the liked-lines test accepts.

**Files.** data/english/parts/legislation.json, data/english/bill-sections.json, src/english/bill-sections.ts, src/english/bill-sections.test.ts

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.
