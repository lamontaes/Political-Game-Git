---
id: words-local-enacting-clause-by-state
title: "A town's ordinance opens with the enacting clause its state's law gives"
area: words
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Every local ordinance opens with one national clause, 'Be it ordained by the {body}', from the local row of src/core2/data/legislature/bill-forms.json, rendered through the legislation bank piece legislation.local-section-first.be-it-ordained. State law prescribes the clause for the towns and counties that follow its general law: data/research/gov/local-ordinance-style-2026.json records it for each of the 56 places, with the statute, the class of city it covers and blanks for the place's name, its body and its kind (some read 'do ordain', some 'ordains:', one form says 'Be it enacted' and names the local government). Author bank pieces for each clause pattern the research records, keyed so the composer picks the drawn place's pattern from its row and falls back to the national clause for ESTIMATED rows, and send them to grading.

**Rules.** No hand-written player text: the clause wording comes from the English engine's banks, authored to each statute's pattern with its source recorded and shippable false until graded. One rule, all 56 places: the composer reads the drawn place's row by postal code, never a state named in code. Replace, never layer: the national piece stays only as the fallback for places whose row is ESTIMATED.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body), an ordinance drafted in a place whose research row is SOURCED reads its state's clause through the English engine (bill record id and bank key named), a place with an ESTIMATED row keeps the national clause, and the pieces appear on the next grading page under docs/grading/.

**Files.** data/english/parts/legislation.json, src/english/bill-sections.ts, data/research/gov/local-ordinance-style-2026.json

**Notes.** TODO
