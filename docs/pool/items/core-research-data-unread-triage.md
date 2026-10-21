---
id: core-research-data-unread-triage
title: "370 research data files have no reader: wire each to its engine or list it as raw source"
area: core
kind: wiring
priority: 3
size: M
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:08:01.316Z
---

**What.** `scripts/audit/research-data-unread-baseline.json` names 370 files under `data/research` that no code in `src/` or `scripts/` reads. The research data guard used to count the bare folder name `data/research/` as a read of every file, which hid them; the guard now counts only real reads and holds these 370 on a list that may only shrink. Go through them folder by folder: wire each file to the engine that should read it, list it as raw source with a one-line reason, or move it to the waiting list with its engine and owner. Take each file off the baseline as it is settled.

**Rules.** An effect is a read, not a record: a research file with no reader is an unregistered placeholder until wired or classified. Research before building: real data checks totals and never decides one actor's outcome. One rule, all 56 places: per-place research files are read by one data path, not named in code.

**Done when.** The baseline holds fewer than 370 files; every file removed from it has a named reader (file and line) or an entry in `research-data-allowlist.json` with a reason, and `tests/guards/research-data-has-reader.test.ts` passes.

**Files.** scripts/audit/research-data-unread-baseline.json, scripts/audit/research-data-allowlist.json, tests/guards/research-data-has-reader.test.ts, data/research/

**Notes.** From PR 4681 (tests-research-data-reader-allowlist-red). The largest groups: core-figures/P0-12 declarations (56 files, one per place), roadmap-r* research outputs, business roadmap-r8 tables. Take one folder per session.

Done in part Oct 17 (claude, PR for this item): the baseline is now `scripts/audit/research-data-allowlist.json` (`unreadFound` by folder, `rawSource`, `awaitingReader`). Settled the 24 roadmap research records (`topic`, `researchedAt`, `status: researched-with-gaps`: the sources read, their terms of use and the gaps found) as raw source with a reason each; `unreadFound` falls from 364 to 340 and the ceiling in `tests/guards/research-data-has-reader.test.ts` with it. Found along the way: `data/research/budgets/local-fiscal-end-sample-2024.json` and `data/research/budgets/roadmap-r5-local-fiscal-end-sample-2024.json` are byte-identical (255 KB each) and both unread; many request files and `src/core2/data/budgets/local-fiscal-years.json` name one or the other, so one should become the reader's source and the other be removed with those references updated. Next folders by size: core-figures/P0-12 (109 files, one per place), renewal/moves (54), housing (14), laws/local-starting-law (12).

Second batch Oct 17 (claude): the whole core-figures/P0-12 folder (109 files) is settled as raw source with a reason each: 56 FEMA declaration counts by state (the game reads the compiled OpenFEMA declarations), 51 NOAA Storm Events 2024 annual hazard totals by state, the CDC leading causes of death by age and a health and damage findings file. `unreadFound` falls to 231. The NOAA files matter beyond the guard: each state's row carries deaths, injuries and damage, which is the severity the outcome web's disaster links need (the FEMA records carry no deaths); recorded on `owner-disasters-in-play`.

Third batch Oct 17 (claude): `scripts/core2-year/census-components-check.ts` reads the whole `data/research/renewal/moves` folder (Census Vintage 2025 county components of population change, roadmap R9) and compares a played town's year with its state, so those files have a reader and a use; it found the net-moving shortfall filed as `world-town-net-moving-negative`.

Fourth batch Oct 17 (claude): `scripts/core2-year/opening-tenure-check.ts` reads `data/research/housing/tenure-acs-2024.json` and compares a played town's opening renter share with its Census place's. In eight drawn places the shares match to the percent (Summersville, West Virginia 32 and 32; Murfreesboro, Arkansas 29 and 29; Cherry Creek, New York 11 and 11; Hoosick Falls, New York 36 and 36; Noroton, Connecticut 28 and 28; Welby, Colorado 27 and 28; Weymouth Town, Massachusetts 33 and 33; South Greeley, Wyoming 26 and 26). Households differ where the town opens as a sample of its Census count (Welby 4,335 against 5,894; Weymouth Town 4,664 against 25,759), the known cap that core-census-uncap-opening removes. `unreadFound` falls to 176. The jobs folder (JOLTS tables 1, 2, 4, 5 and 7, unemployment duration, OEWS staffing) is the data `world-hires-below-jolts` and `world-unemployment-opening-jump` need for their targets, and the FHFA price files can check home values the same way; next readers to write.

Sent back 2026-10-17 from PR #4953 (branch claude/business-entry-exit-check-v2): Merging current main (d3d2b3ec1a) conflicts in docs/pool/items/world-business-entry-below-bds.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4926 (branch claude/research-data-roadmap-triage): Merging current main (e99e4a0436) conflicts in docs/pool/items/core-research-data-unread-triage.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4949 (branch claude/research-triage-starting-law): Merging current main (f20f3700e5) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4950 (branch claude/research-triage-evidence): Merging current main (f359364281) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4951 (branch claude/fhfa-growth-check): Merging current main (ca0832d084) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
