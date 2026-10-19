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

**What.** The repository is 3.13 GB with no large-file storage, so every session's clone carries all of it. The owner ruled Oct 19: move art intermediates (`art/`, about 1.4 GB) and large raw data to Git LFS, and delete the roughly 520 MB of raw publisher captures in `data/source/*/raw/` that nothing reads. A clone should be a few hundred MB, and every session's clone gets smaller and faster.

**Rules.** "Slim the repository like a real game (owner, Oct 15): unneeded files go, the guards stay." Applied: the captures go, while tests, guards, golden-path suite and checksums stay. "Preserve asset originals, hashes and source-to-derivative lineage: originals move to LFS, never deleted." Applied: art originals and derivatives move to LFS at their current paths. The owner's Oct 19 ruling deletes the captures, so their SHAs and source URLs stay recorded in `data/source` manifests before removal, keeping lineage intact.

**Done when.** `.gitattributes` tracks the named art and raw-data patterns in LFS; a fresh clone without LFS objects is under 500 MB; the `data/source/*/raw/` folders are gone from main; `npm run build` and the golden-path suite pass; the PR body lists the MB moved to LFS and the MB deleted.

**Files.** `.gitattributes`, `art/`, `data/source/*/raw/`

**Notes.** The audit's pool row `release-ship-weight`; `public/education` is handled by release-repo-archive-docs instead.
