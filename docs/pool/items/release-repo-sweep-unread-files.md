---
id: release-repo-sweep-unread-files
title: "Delete the 698 files (108 MB) the audit found with no importer or reader"
area: release
kind: cleanup
priority: 1
size: M
status: open
claimed-by:
pr: #5867
after:
blocked-on:
source: "docs/reports/repo-audit-2026-10-19.md section G1"
claimed-at:
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The audit's "Recommended changes, 1. Delete now" list (`docs/reports/repo-audit-2026-10-19.md`, section G1) names 698 files, 108 MB, with no importer, no reader and nothing superseding them: `src/source/` (3, section B1, plus its two `tsconfig.app.json` lines); the five ownership-boundary tests and `tests/support/ownership-boundary.ts` (6, section A, pinned to September PR waves); `scripts/dev-lab/expected-deaths.ts` (1, section A); the twelve one-session proof folders `scripts/{office-day, office-day-federal, office-day-state, office-records, filing-status, turnout-reasons, wide-races, justice, press, gov-wiring, world-proofs, law-audit}/` (33, section B2; `core2-year` and `speed-years` stay); `scripts/art-asset-factory/derive-g-press.ts` and `scripts/dehardwire-census.mjs` (2, sections B2 and F); `.github/workflows/browser.yml` and `scripts/dev-lab/write-e2e-*.ts` (3, section D); `.claude/skills/` (26, section D, replaced by a symlink to `.agents/skills/`); `prose-review/` and `examples/` (90, section C); `test-results/` and `README_pilot_completion.md` (15, sections B4 and C); and the four screenshot dumps under `docs/reports/` (162, 52.6 MB, section B4). After #5078 merges, `scripts/dead-code/reachable.mjs` goes too. The list includes public/data (52 MB, no reader, shipped in every build and the Mac app), one-session proof scripts, screenshot dumps, the ownership-boundary tests, the dead browser.yml workflow and its pinning test, the mirrored .claude/skills copy, and the unused React (Vite react plugin, zero .tsx files) and Playwright packages.

**Rules.** Slim the repository like a real game (owner, Oct 15): unneeded files go, the guards stay (`tests/guards/`, `tests/golden-path/`, `scripts/core2-guard/`, `scripts/zero-dice-guard.mjs`, `scripts/release/`, `scripts/audit/`, `scripts/report-check/` are not on the list and are not touched). Replace, never layer: the `.claude/skills/` copy is replaced by a symlink in the same PR, and the PR body counts what was removed. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** Every path in the audit's G1 list is gone from main; `npm run build`, `npm run typecheck` and the golden-path suite pass on a drawn place from `buildBenchWorld`; `tests/assumption-markers.test.ts` and the release workflow still find what they read; and the PR body counts the files and MB removed.

**Files.** docs/reports/repo-audit-2026-10-19.md, package.json, vite.config.*, .github/workflows/browser.yml, public/data/

**Notes.** The audit's pool row `release-repo-slim-oct19`; this id replaces it, raised to priority 1 by the acting CTO on Oct 19.

Checked Oct 22 against main d3078aca9f (readers searched in code, config, workflows and data/runtime-text). Two G1 entries still have readers and stay: `tooling/root-tsconfig-guard.ts` is compiled by the root `tsconfig.json` (the guard that makes a bare `npx tsc --noEmit` fail), and `@playwright/test` supplies the `playwright` package that the bench's `src/bench/*.browser.mjs` checks import (the browser-visual-acceptance skill runs them). `README_pilot_completion.md` is already gone. Everything else on the list has no importer or reader. The edits that go with the deletions: drop the three `src/source` files from `tsconfig.app.json` "files", its exclude and `tsconfig.node.json` line 72; drop `"src/source/"` from `scripts/english-check/wording.ts`; rewrite the browser-workflow assertions in `tests/release/validate-workflow.test.ts` and the browser.yml comments in `validate.yml`; repoint the comment in `src/core2/housing-homeless.test.ts` that names `scripts/world-proofs/`; drop `@vitejs/plugin-react` from `vite.config.ts` (plugin and the optimizeDeps react list) and `"jsx"` from `tsconfig.app.json`. A cloud session's auto-mode permission refused the bulk `git rm` on Oct 22, so this needs a session where the owner allows it.

Sent back 2026-10-24 from PR #5867 (branch claude/stoic-rubin-6vq560): Current main bb72a66781 conflicts in package-lock.json; merger aborted integration and did not claim a gate pass; finish on that branch, merge main into it first.
