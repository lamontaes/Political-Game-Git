---
id: words-policy-spoken-names
title: "Each catalog policy has one spoken name, so a stand reads as a sentence, not a question"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Each catalog policy needs one spoken name, so a stand reads as a sentence ('I'm for a higher minimum wage') and not as a question or a record key. Today stance questions and answers show keys or the question form, and `data/english/parts/choice-names.json` names only core actions. Author one spoken name per policy in `src/core2/data/legislature/bill-catalog.json` (or the words data that points to it) and have the stance renderer in the director and the bench use it. The player would notice what a candidate stands for read as a plain sentence in a speech, a conversation and the Politics screen.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); An effect is a read, not a record: the stance renderer reads the catalog policy's spoken name at the moment it words a position; One rule, all 56 places: names are per policy in data and no policy, place or party is named in code; Ask why: a stance sentence cites the policy and the stance record; Replace, never layer: the key-printing fallback in the bench and the director is deleted in the same change; No dice: which stance a speaker voices follows their views, not a roll; Look before you ask: owner rulings on how stances are spoken are in OWNER-DECISIONS.md; read them first.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): every catalog policy has a spoken name (a test in `tests/english-parts-banks.test.ts` or a catalog test walks them all), and a stance in a conversation, a speech and the Politics screen reads as a sentence with the policy and stance record ids named; composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. The owner plays it: asks a candidate where he stands and gets a sentence.

**Files.** src/core2/data/legislature/bill-catalog.json, data/english/parts/choice-names.json, scripts/english-corpus/choice-names-bank.ts, src/director/conversation.ts, src/bench/words.ts

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).
