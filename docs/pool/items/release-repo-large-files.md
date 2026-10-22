---
id: release-repo-large-files
title: "Large files: move art and raw data to Git LFS, delete raw publisher captures"
area: release
kind: cleanup
priority: 1
size: M
status: open
claimed-by:
pr:
after:
source: "docs/reports/repo-audit-2026-10-19.md sections B4 and E"
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The repository is 3.13 GB with no large-file storage, so every session's clone carries all of it. The owner ruled Oct 19: move art intermediates (`art/`, about 1.4 GB) and large raw data to Git LFS, and delete the roughly 520 MB of raw publisher captures in `data/source/*/raw/` that nothing reads. A clone should be a few hundred MB, and every session's clone gets smaller and faster.

**Rules.** Replace, never layer: move originals into LFS and update their readers in the same change, preserving hashes and source-to-derivative lineage. Verify current readers before any proposed capture removal, and retain the recorded source URLs and checksums. Existing guards and tests remain required.

**Done when.** `.gitattributes` tracks the named art and raw-data patterns in LFS; a fresh clone without LFS objects is under 500 MB; the `data/source/*/raw/` folders are gone from main; `npm run build` and the golden-path suite pass; the PR body lists the MB moved to LFS and the MB deleted.

A drawn-place buildBenchWorld run retains the current game behavior and the original golden-path acceptance after the storage changes.

**Files.** `.gitattributes`, `art/`, `data/source/*/raw/`

**Notes.** The audit's pool row `release-ship-weight`; `public/education` is handled by release-repo-archive-docs instead.
