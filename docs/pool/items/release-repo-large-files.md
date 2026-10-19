---
id: release-repo-large-files
title: "Large files: Git LFS yes or no, and what happens to raw publisher captures"
area: release
kind: owner-decision
priority: 2
size: S
status: blocked
claimed-by:
pr:
after:
blocked-on: "owner: Git LFS yes/no; raw publisher captures keep/move/delete"
source: "docs/reports/repo-audit-2026-10-19.md sections B4 and E"
---

**What.** The repository is 3.13 GB with no Git LFS. The audit found 147 files over 2 MB (1,321 MB): 53 in `data/source` (757 MB, of which 371 `raw/` publisher captures are 520 MB, the largest a 92 MB ACS geography file), 31 in `art/references` (262 MB), and `art/generated`, `art/references` and `art/qa` together 560 MB of pipeline intermediates. These are pinned publisher bytes and art intermediates, not game code, and every clone carries them. The owner decides: Git LFS yes or no, and whether the raw captures are kept in place, moved to a release asset, or deleted (the checksums in `data/source` stay either way).

**Rules.** Slim the repository like a real game (owner, Oct 15): unneeded files go, the guards stay. Every number has a source: the publisher captures are the sources behind `data/source`, so their SHAs stay recorded whatever the owner picks.

**Done when.** The owner's answer is recorded in `docs/coordination/OWNER-DECISIONS.md`, this item is reopened as a build item with the chosen move, and a fresh clone of main after that build is under 1 GB with the release workflow, the golden-path suite and the research-data-reader guard still passing.

**Files.** data/source/*/raw/, art/generated/, art/references/, art/qa/, .gitattributes

**Notes.** The audit's pool row `release-ship-weight`; `public/education` is handled by release-repo-archive-docs instead.
