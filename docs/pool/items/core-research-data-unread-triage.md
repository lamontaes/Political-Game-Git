---
id: core-research-data-unread-triage
title: "370 research data files have no reader: wire each to its engine or list it as raw source"
area: core
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `scripts/audit/research-data-unread-baseline.json` names 370 files under `data/research` that no code in `src/` or `scripts/` reads. The research data guard used to count the bare folder name `data/research/` as a read of every file, which hid them; the guard now counts only real reads and holds these 370 on a list that may only shrink. Go through them folder by folder: wire each file to the engine that should read it, list it as raw source with a one-line reason, or move it to the waiting list with its engine and owner. Take each file off the baseline as it is settled.

**Rules.** An effect is a read, not a record: a research file with no reader is an unregistered placeholder until wired or classified. Research before building: real data checks totals and never decides one actor's outcome. One rule, all 56 places: per-place research files are read by one data path, not named in code.

**Done when.** The baseline holds fewer than 370 files; every file removed from it has a named reader (file and line) or an entry in `research-data-allowlist.json` with a reason, and `tests/guards/research-data-has-reader.test.ts` passes.

**Files.** scripts/audit/research-data-unread-baseline.json, scripts/audit/research-data-allowlist.json, tests/guards/research-data-has-reader.test.ts, data/research/

**Notes.** From PR 4681 (tests-research-data-reader-allowlist-red). The largest groups: core-figures/P0-12 declarations (56 files, one per place), roadmap-r* research outputs, business roadmap-r8 tables. Take one folder per session.

Done in part Oct 17 (claude, PR for this item): the baseline is now `scripts/audit/research-data-allowlist.json` (`unreadFound` by folder, `rawSource`, `awaitingReader`). Settled the 24 roadmap research records (`topic`, `researchedAt`, `status: researched-with-gaps`: the sources read, their terms of use and the gaps found) as raw source with a reason each; `unreadFound` falls from 364 to 340 and the ceiling in `tests/guards/research-data-has-reader.test.ts` with it. Found along the way: `data/research/budgets/local-fiscal-end-sample-2024.json` and `data/research/budgets/roadmap-r5-local-fiscal-end-sample-2024.json` are byte-identical (255 KB each) and both unread; many request files and `src/core2/data/budgets/local-fiscal-years.json` name one or the other, so one should become the reader's source and the other be removed with those references updated. Next folders by size: core-figures/P0-12 (109 files, one per place), renewal/moves (54), housing (14), laws/local-starting-law (12).
