# Order: the delete (weekend of Oct 24, 2026)

Current as of 2026-10-24 (written by the acting CTO from main and the Oct 19 repository audit)

The owner ruled on Oct 24: stale docs are deleted, not archived; Git history keeps them. Anything holding a ruling is folded into `docs/coordination/OWNER-DECISIONS.md` first. The repository is about 3 GB, and every session's clone carries all of it.

## Who

- **One Sonnet session,** medium effort, no helpers. It owns the three items below and nothing else.
- **Channel:** the "Delete" section of `docs/coordination/LEADS-2026-10-24.md`, every two hours.
- **The owner approved the deletions** (OWNER-DECISIONS.md, Oct 24). A cloud permission prompt that refuses a bulk `git rm` is answered by that ruling; say so in the PR body.

## The three items, in this order

1. **`release-repo-delete-stale-docs`** (p1, M). The audit's archive list (`docs/reports/repo-audit-2026-10-19.md`, section G3, about 1,980 files): delete each folder after checking it against main today. First fold rulings: read `docs/coordination/DECISION-REGISTER.md`, `docs/coordination/prior-rulings/`, `docs/decisions/DECISION-LOG.md`, `docs/roadmap/model-log.md` and any handoff, and add to OWNER-DECISIONS only the rulings not already there, each with its date and source. Move the three files code reads out of `docs/codex/` with their readers in the same change. Include whatever the Oct 23 freshness work moved under `docs/archive/2026-10-23/`. Never delete the Oct 24 orders in `docs/work-orders/`, `docs/pool/`, `docs/research/`, `docs/roadmap/features.json`, `political-process-baseline.md`, `OWNER-DECISIONS.md` or the leads' channel. Done when the files are gone and `node scripts/docs/freshness.mjs --report` flags fewer than 10 docs. That script arrives with the doc-freshness PR (#5844); if it is not on main yet, do item 2 first.
2. **`release-repo-sweep-unread-files`** (p1, M). The audit's G1 list (698 files, 108 MB, no importer or reader), minus what the Oct 22 note says still has readers (`tooling/root-tsconfig-guard.ts`, `@playwright/test`). Keep `.claude/skills/` as copies: `scripts/skill-ops/skill-ops.test.ts` requires the mirrors byte for byte. Make the config edits the item's Notes list in the same change.
3. **`release-repo-large-files`** (p1, M), last. Art intermediates and large raw data to Git LFS, the unread raw publisher captures deleted, readers and hashes preserved. Done when a fresh clone without LFS objects is under 500 MB and the build and golden-path suite pass.

## How

- **One PR per item,** on its own branch. Line 1 `Pool item: <id>`, the gate line, `Lead: delete`, the Done-when table, and the count of files and MB removed.
- **Before each delete,** grep the live tree for the path (`src/`, `scripts/`, `tests/`, `.github/`, `AGENTS.md`, `.agents/`, `docs/` outside what goes). A live reader means the path stays or moves with its reader.
- **Docs that named a deleted path** are updated in the same PR (`doc-freshness`, once on main).
- **Gate:** the local gate on changed files, the release check, `npm run test:skill-ops`, `tests/assumption-markers.test.ts` and the golden-path suite. Never force-push. Mergers merge; never merge your own.
- **Never ask in chat.** File what you find as pool items.

## Rules that bind this

Replace, never layer: what moves is moved with its readers, never copied. Look before you ask: rulings are folded before their files go. The pool is the only backlog and OWNER-DECISIONS the only rulings log. One run, one number.

**How the owner will see it:** a fresh clone is a few hundred MB instead of 3 GB, and `docs/` holds only what sessions read.
