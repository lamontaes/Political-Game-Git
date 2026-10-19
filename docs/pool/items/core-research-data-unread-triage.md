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

Sent back 2026-10-17 from PR #4953 (branch claude/business-entry-exit-check-v2): Merging current main (d3d2b3ec1a) conflicts in docs/pool/items/world-business-entry-below-bds.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4926 (branch claude/research-data-roadmap-triage): Merging current main (e99e4a0436) conflicts in docs/pool/items/core-research-data-unread-triage.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4949 (branch claude/research-triage-starting-law): Merging current main (f20f3700e5) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4950 (branch claude/research-triage-evidence): Merging current main (f359364281) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4951 (branch claude/fhfa-growth-check): Merging current main (ca0832d084) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
