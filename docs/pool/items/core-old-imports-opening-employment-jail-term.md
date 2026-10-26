---
id: core-old-imports-opening-employment-jail-term
title: "The opening's employment allocation reads who is in jail from the core's own records, not the old jail-terms module"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/old-imports-jail-term
pr: #5073
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:12:30.665Z
---

**What.** The opening's employment allocation asked the old engine whether a resident was serving a jail term (`jailTermOn` in src/simulation/justice/jail-terms.ts) before marking them employable. No one is serving a sentence when the opening is built, because sentences are written by play, so the core opening drops that read instead of porting it.

**Rules.** Replace, never layer: the jail-terms import is deleted from opening-employment.ts in the same change. One rule, all 56 places: the change names no state, city or GEOID.

**Done when.** src/core2/opening-employment.ts no longer imports src/simulation/justice/jail-terms, buildBenchWorld in a drawn place and seed named in the PR body opens with the same employment records as before, and the opening employment tests in src/core2 pass.

**Files.** src/core2/opening-employment.ts, src/simulation/justice/jail-terms.ts

**Notes.** Split Oct 19 from core-old-imports-opening-employment, which is L in practice.

Reconciled Oct 23: delivered by PR #5073. The old jailTermOn import is gone from src/core2/opening-employment.ts, which records that no one is serving a sentence when the opening is built; the What and Done when above now say what was delivered.
