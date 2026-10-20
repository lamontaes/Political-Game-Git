---
id: words-mine-empty-cells
title: "Order 3: mine the empty cells of the coverage table"
area: words
kind: research
priority: 2
status: open
claimed-by:
pr: #5187
blocked-on:
milestone:
source: "words-and-director order 3"
claimed-at:
---

**What.** The coverage table (`docs/grading/coverage.md`, built by `npm run words:coverage`) has empty or thin cells in golden-path order, meaning situations the records fire that have no words. For each, add a shape in `scripts/english-corpus/shapes/`, run the mining, write the bank script and its test. First targets: a town body's words to its chair, a chair's hearing questions, what a body says of an official's service, boasts, threats and alarms, a wedding and a pork-barrel ask. The player would notice those moments being spoken instead of silent or generic.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); Research before building: shipping sources must be public domain, with their source recorded; real text only calibrates register; No dice: the director picks the line from the situation and traits, not a roll; Ask why: each part carries its source and move tag; Speed: mining runs offline in scripts; the game reads banks; One rule, all 56 places: no place or person named in parts; Look before you ask: check `coverage.md` and the words rulings before mining.

**Done when.** The coverage table's first named cells are filled (before and after counts in the PR body), and in a drawn place (named, with seed) a whole exchange composed through the real engine uses each new bank, with tests in `tests/english-parts-banks.test.ts` and the bank script's own test. The owner plays it: attends a council meeting and hears the chair and members speak in their own words.

**Files.** scripts/english-corpus/shapes/, scripts/english-corpus/mine-shapes.py, scripts/dialogue-batch/coverage-table.ts, data/english/parts/, docs/grading/coverage.md

**Notes.** Blocked-on words-catalog-coverage is done as of 2026-10-15 (#4398), so the block can clear.
