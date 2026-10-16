---
id: words-local-ordinance-form
title: "A local ordinance's own form from public-domain municipal forms"
area: words
kind: feature
priority: 2
status: done
claimed-by: claude/words-bill-sections
pr: #4554
blocked-on:
milestone:
source: 'words-and-director "What is open"; docs/coordination/words.md'
claimed-at: 2026-10-16T02:30:17.568Z
---

**What.** A local ordinance has no form of its own: it reads like a state or federal bill. A real ordinance has a number, the body's enacting words ('Be it ordained by the City Council'), sections, and an effective date. Author these forms in data from public-domain municipal codes and have the composer render a local bill in its body's own form. The player would notice his council's ordinance reading like an ordinance, with a number, enacting words, sections and a date, and a county's or town's reading in its own style.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); One rule, all 56 places: forms are data per body type and place, with no place named in code; An effect is a read, not a record: the bill reads the form of the body that passed it at the moment it is shown; Research before building: forms come from public-domain municipal codes with the source recorded; Ask why: the number and date cite the bill record; Replace, never layer: the federal short-title form is not used for a local measure (`legislature.ts` notes this) and any fallback form is deleted.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): an ordinance passed in the year displays its number, enacting words, sections and effective date from `bill-forms.json` (bill id named), for a place whose body type differs from a state's, composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. Tests in `src/core2/legislature-bill-form.test.ts`. The owner plays it: passes an ordinance and reads it in its own form.

**Files.** src/core2/legislature-bill-form.ts, src/core2/data/legislature/bill-forms.json, src/core2/data/legislature/enacting-clauses.json, data/english/parts/legislation.json

**Notes.** Absorbs words-a-local-ordinance-s-own-form (checklist line, dropped as a duplicate as of 2026-10-15).
