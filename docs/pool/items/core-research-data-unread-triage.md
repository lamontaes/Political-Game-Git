---
id: core-research-data-unread-triage
title: "370 research data files have no reader: wire each to its engine or list it as raw source"
area: core
kind: wiring
priority: 3
size: M
status: claimed
standard: 2
claimed-by: claude/pool-core-research-data-unread-triage
pr: #5076
after:
blocked-on:
model: sonnet
effort: low
root: none
lead: researcher
source: added with npm run pool -- add
claimed-at: 2026-11-11T04:50:48.751Z
checked: fable 2026-11-10
---

**What.** The 370-file baseline scripts/audit/research-data-unread-baseline.json is gone; the research data guard now counts only real reads, and scripts/audit/research-data-allowlist.json records 38 files under data/research in `unreadFound` with no reader (housing 7, laws/local-starting-law 11, macro/series 7, regional/series 2, renewal 2, and one each in six other folders, 14 folders in all). Go through them folder by folder: wire each file to the engine that should read it, list it as raw source with a one-line reason, or move it to the waiting list with its engine and owner. Take each file off `unreadFound` as it is settled.

**Cause.** Found in code: scripts/audit/research-data-allowlist.json `unreadFound` lists 38 files under data/research with no reader, checked by tests/guards/research-data-has-reader.test.ts.

**Fix.** For each of the 14 folders in `unreadFound`: wire the file to its engine (naming the reader by file and line), or move it to `rawSource` or `awaitingReader` with a reason, and shrink the list.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a research file with no reader is an unregistered placeholder until wired or classified. Research before building: real data checks totals and never decides one actor's outcome. One rule, all 56 places: per-place research files are read by one data path, not named in code.

**Done when.** A second session, not the builder, runs tests/guards/research-data-has-reader.test.ts and it passes with `unreadFound` shorter than 38 files; each file removed from it has a named reader (file and line) or an entry in `rawSource` or `awaitingReader` with a reason. For each file wired to an engine, the second session loads a drawn place in the played world and shows the engine reading it by record id.

**Waits on.** Nothing.

**Files.** scripts/audit/research-data-allowlist.json, tests/guards/research-data-has-reader.test.ts, data/research

**Notes.** From PR 4681 (tests-research-data-reader-allowlist-red). The largest groups: core-figures/P0-12 declarations (56 files, one per place), roadmap-r* research outputs, business roadmap-r8 tables. Take one folder per session.

Sent back 2026-10-17 from PR #4953 (branch claude/business-entry-exit-check-v2): Merging current main (d3d2b3ec1a) conflicts in docs/pool/items/world-business-entry-below-bds.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4926 (branch claude/research-data-roadmap-triage): Merging current main (e99e4a0436) conflicts in docs/pool/items/core-research-data-unread-triage.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4949 (branch claude/research-triage-starting-law): Merging current main (f20f3700e5) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4950 (branch claude/research-triage-evidence): Merging current main (f359364281) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-18 from PR #4951 (branch claude/fhfa-growth-check): Merging current main (ca0832d084) conflicts in docs/pool/items/core-research-data-unread-triage.md, docs/pool/items/world-town-net-moving-negative.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #4926 (branch claude/research-data-roadmap-triage): rawSource bypass additions clear a red reader guard despite missing consumers; preserve awaiting-reader ownership or add real readers, and supply the missing Done-when evidence table; finish on that branch, merge main into it first.
