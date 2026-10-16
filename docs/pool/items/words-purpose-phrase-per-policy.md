---
id: words-purpose-phrase-per-policy
title: "A purpose phrase per policy series as catalog data"
area: words
kind: feature
priority: 2
status: done
claimed-by: claude/words-purpose-phrase-per-policy
pr: #4487
blocked-on:
milestone:
source: 'words-and-director "What is open"; docs/coordination/words.md'
claimed-at: 2026-10-15T23:58:48.677Z
---

**What.** A bill's title reads from the policy it changes, but there is no purpose phrase per policy series, so a title can only repeat a key. Author a purpose phrase for each policy series as catalog data ('to raise the minimum wage', 'to shift highway funds to transit'), in the catalog or the words data pointing to it, so that `billTitle` in `legislature.ts` can compose 'A bill to ..., and for other purposes' from provisions. OPUS-GOV asked for it. The player would notice every bill's title saying what it does.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); An effect is a read, not a record: the title composer reads each provision's series phrase when it words the title; One rule, all 56 places: phrases are per series in data and no place or body is named in code; Research before building: phrasings follow public-domain statutes' title forms, with the source recorded; Ask why: a title cites the bill's provisions and each phrase's catalog row; Replace, never layer: any key-based or placeholder title text is deleted; No dice: the phrase follows the provision, not a roll.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): every bill in the year has a title composed from its provisions' purpose phrases (bill and provision ids named), a catalog test walks every series for a phrase, and the lines are composed through the real engine in a drawn place (named, with seed) and graded by the owner in the next words batch page under `docs/grading/`. The owner plays it: reads the titles of the laws his council passed.

**Files.** src/core2/data/legislature/bill-catalog.json, src/core2/modules/legislature.ts, data/english/parts/legislation.json, scripts/english-corpus/

**Notes.** Absorbs words-a-purpose-phrase-per-policy-as-catalog (checklist line, dropped as a duplicate as of 2026-10-15).
