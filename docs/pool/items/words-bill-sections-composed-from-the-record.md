---
id: words-bill-sections-composed-from-the-record
title: "Bill sections composed from the record:"
area: words
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/words.md line 49 (unchecked checklist line)"
---

**What.** A bill's sections are not composed from the law record: the text should say the series, the old value, the new value and the statute cited, with the number, the date and the shape of a term (flat or graduated) as the player's editable terms. Build the section composer in the English engine so each provision of a bill reads from the record (`billTitle` and `provisions` in `legislature.ts`, the catalog `src/core2/data/legislature/bill-catalog.json`, the form `bill-forms.json`). The player would notice a bill reading 'Section 2. The state minimum wage is raised from $9.50 to $11.00 effective July 1' from the numbers he set.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); An effect is a read, not a record: the section reads the bill's provision rows (series, old value, new value, statute) at the moment it is shown; Ask why: each section cites the law row and provision it came from; One rule, all 56 places: forms and statutes are data for all 56 places and no place or body is named in code; No dice: the text follows the numbers; no choice among phrasings by roll, only the engine's stable pick; Estimate, never UNKNOWN: a missing old value shows the estimate with its source, never UNKNOWN; Replace, never layer: any hand-built section string in the bench or the legislature is deleted; The chain is the acceptance: follow one number the player edits to the section text, the vote and the law in force.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a bill the bench player proposes lists sections whose numbers match the provision rows and the old law (bill and provision ids named), editing the number changes the section, and the lines are composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. Tests in `src/core2/legislature-sections.test.ts`. The owner plays it: edits a minimum-wage number and reads the section change.

**Files.** src/core2/legislature-bill-form.ts, src/core2/modules/legislature.ts, src/core2/data/legislature/bill-forms.json, data/english/parts/legislation.json

**Notes.** Checklist line from words.md; verify against main before starting.
