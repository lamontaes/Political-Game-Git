---
id: words-authored-pieces-gate
title: "Let the bank checks accept authored parts (origin: authored)"
area: words
kind: cleanup
priority: 1
status: in-pr
claimed-by: words/grading-bench
pr: "#4407"
blocked-on:
milestone:
source: "text rule, OWNER-DECISIONS.md, Oct 15 evening"
---

**What.** Checks that reject a part with no source document or public-domain URL must accept parts tagged `origin: authored` with the author and date: `tests/english-parts-banks.test.ts` (source.document, source.date, source.url https, PUBLIC_DOMAIN_SOURCES match), `tests/english-exchanges.test.ts` and `tests/english-counts.test.ts` (counts-only pattern files: source, license, url; keep for pattern files), the `source` types and public-domain wording in `scripts/english-corpus/*-bank.ts` (address, choice-names, counter) and `scripts/english-corpus/mine-shapes.py`, and `tests/credits-list.test.ts` if it lists part sources.

**Rules.** Source fields become optional notes; an authored part needs `origin: authored`, author, date, move tags. No code change to runtime text origin (`src/english/runtime-text-origin.ts` checks engine origin only).

**Done when.** A bank part with no source document passes the checks when tagged authored.

**Files.** see What

**Notes.** Do not weaken counts-only pattern-file checks.
