---
id: words-local-enacting-clause-by-state
title: "A town's ordinance opens with the enacting clause its state's law gives"
area: words
kind: feature
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: words
checked: fable 2026-11-10
---

**What.** Every local ordinance opens with one national clause, 'Be it ordained by the {body}', from the local row of src/core2/data/legislature/bill-forms.json, rendered through the legislation bank piece legislation.local-section-first.be-it-ordained. State law prescribes the clause for the towns and counties that follow its general law: data/research/gov/local-ordinance-style-2026.json records it for each of the 56 places, with the statute, the class of city it covers and blanks for the place's name, its body and its kind (some read 'do ordain', some 'ordains:', one form says 'Be it enacted' and names the local government). Author bank pieces for each clause pattern the research records, keyed so the composer picks the drawn place's pattern from its row and falls back to the national clause for ESTIMATED rows, and send them to grading.

**Cause.** Found in code: bodyNumbering in src/core2/legislature-bill-form.ts (the local branch near line 101) returns the one national clause from the local row of src/core2/data/legislature/bill-forms.json ("Be it ordained by the {body}", line 22), while the state legislatures in the same function pick a clause by jurisdiction; data/research/gov/local-ordinance-style-2026.json records each of the 56 places' clause pattern with its statute.

**Fix.** Author one clause piece per researched pattern, let the local branch of bodyNumbering pick the drawn place's pattern from its row (by postal code), and keep the national clause only for places whose research row is ESTIMATED; mark the new pieces shippable false until graded.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the clause wording comes from the English engine's banks, authored to each statute's pattern with its source recorded and shippable false until graded. One rule, all 56 places: the composer reads the drawn place's row by postal code, never a state named in code. Replace, never layer: the national piece stays only as the fallback for places whose row is ESTIMATED.

**Done when.** A second session, not the builder, drafts an ordinance in a drawn place from all 56 whose research row is SOURCED in a one-year run of the played world (buildBenchWorld, place and seed named) and reads the state's clause on the bill, with the bill record id and the bank key named; in a place whose row is ESTIMATED it reads the national clause. The new pieces appear on the next grading page under docs/grading/.

**Waits on.** Nothing.

**Files.** data/english/parts/legislation.json, src/core2/legislature-bill-form.ts, src/core2/data/legislature/bill-forms.json, src/english/bill-sections.ts, data/research/gov/local-ordinance-style-2026.json

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: drop the graded hold.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A town's ordinance opening with the clause its state's statute gives would add only exact wording of the opening line of a bill; no player compares it to a statute, and the one national clause already reads fine.
