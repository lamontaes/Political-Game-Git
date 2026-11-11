---
id: release-repo-large-files
title: "Large files: move art and raw data to Git LFS, delete raw publisher captures"
area: release
kind: cleanup
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-release-repo-large-files
pr: #8385
after:
source: "docs/reports/repo-audit-2026-10-19.md sections B4 and E"
standard: 2
model: sonnet
effort: high
root: none
lead: cto
blocked-on:
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:24:35.103Z
branch: claude/pool-release-repo-large-files
---

**What.** The repository is large and has no large-file storage, so every session's clone carries all of it. The owner ruled on Oct 19 to move art intermediates and large raw data to Git LFS, and to delete the raw publisher captures in data/source/*/raw/ that nothing reads. A clone should be a few hundred MB, so every session's clone gets smaller and faster. The Oct 19 audit snapshot (commit 0104686) said 3.13 GB, with art about 1.4 GB and about 520 MB of captures; recount every path and size before implementing.

**Cause.** Found in code: .gitattributes (lines 1 to 15) holds no filter=lfs rule, only the immutable-capture whitespace note; `du -sh art data/source` in a full checkout shows 541M and 476M, and `git ls-files data/source | grep -c /raw/` gives 115 tracked raw files.

**Fix.** Move the art intermediates to Git LFS with .gitattributes patterns and update their readers in the same change. Delete the data/source/*/raw/ captures that nothing reads, keeping the source URLs and checksums in each artifact-lock.json. First check which raw captures current code reads, and keep those.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: move originals into LFS and update their readers in the same change, preserving hashes and source-to-derivative lineage. Verify current readers before any capture removal, and retain the recorded source URLs and checksums. Existing guards and tests remain required.

**Done when.** A second session sees .gitattributes track the named art and raw-data patterns in LFS, a fresh clone without LFS objects under 500 MB, the data/source/*/raw/ folders gone from main, and `npm run build` and the golden-path suite passing. A buildBenchWorld run in a drawn place gives the same results as before the move. The PR body lists the MB moved to LFS and the MB deleted.

**Waits on.** Nothing. The check of which raw captures current code reads is the first step of this item (owner ruling Oct 19; docs/reports/repo-audit-2026-10-19.md sections B4 and E).

**Files.** .gitattributes, art, data/source, docs/reports/repo-audit-2026-10-19.md

**Notes.** The audit's pool row `release-ship-weight`; `public/education` is handled by release-repo-archive-docs instead.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:24 UTC) on branch claude/pool-release-repo-large-files.
