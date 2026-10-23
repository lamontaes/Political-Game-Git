---
id: release-repo-archive-docs
title: "Archive the audit's ~1,980 stale doc files under docs/archive/2026-10-19/ and move the three files code reads"
area: docs
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: "docs/reports/repo-audit-2026-10-19.md sections B4, C and G3"
claimed-at: 
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The audit's archive list (section G3, about 1,980 files, 270 MB) moves under `docs/archive/2026-10-19/`: `docs/packages/` (49), `docs/work-orders/` (5), the 17 ended-session files in `docs/coordination/` (`SESSION-*`, `OPUS-*`, `HANDOFF-2026-10-12`, `CTO-HANDOFF-2026-10-16`, `STALE-POOL-2026-10-15`, `OFFICE-*`, `ASTRA`, the Firefly inventory JSON), `docs/decisions/`, `docs/plans/` (255), `docs/integration/` (70), `docs/handoff/` (50), `docs/findings/` (21), `docs/connectivity/` (28), `docs/playtest/` (38), `docs/audits/` and `ARCHITECTURE-INTEGRITY-AUDIT.md` (12), `docs/ui/` and `docs/mockups/` (130), `docs/roadmap/{PROGRESS.md, later-specs-draft.md}`, and `docs/codex/` (1,292 files, 196 MB). Before `docs/codex` moves, the three files code reads move out: the bench CSS `docs/codex/ui-logo-packet/01_kit12_ui/kit12.css` (loaded by `src/bench/dev-api.ts`) into `src/bench/`, and `audit-verified-2026-10-01.json` and `audit-by-engine-2026-10-01.md` (read by `scripts/audit/autoscan.ts` and `tests/assumption-markers.test.ts`) to a path those two name. Also: the proof scripts `src/bench/*.browser.mjs` write screenshots to `test-results/`, not `docs/`; `public/education/catalog-*.json` (82 MB, no runtime reader, shipped to every player) is dropped and `scripts/source/place-name-corpora.ts` reads it from `data/source/` instead; and the four rulings logs other than `OWNER-DECISIONS.md` (`DECISION-REGISTER.md`, `prior-rulings/`, `docs/decisions/DECISION-LOG.md`, `docs/roadmap/model-log.md`) are folded into `OWNER-DECISIONS.md` or archived. Fix the two references first: `tests/golden-path/played-world.node-test.ts` cites `MEMORY-FLAT.md`, and `AGENTS.md` line 45 says builds come from `docs/packages/`.

**Rules.** Slim the repository like a real game (owner, Oct 15): unneeded files go, the guards stay; `docs/roadmap/features.json` (read by the golden-path runner), `political-process-baseline.md`, `docs/research/` and `docs/pool/` are kept. Replace, never layer: the three read files are moved, not copied, and their readers updated in the same PR. The pool is the only backlog and `OWNER-DECISIONS.md` the only rulings log. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** Every path on the G3 list is under `docs/archive/2026-10-19/` or gone; `grep -rn "docs/codex\|docs/packages\|public/education" src/ scripts/ tests/ .github/ AGENTS.md` returns nothing; `tests/assumption-markers.test.ts`, the audit-scan workflow and the golden-path suite pass; a full-window screenshot of the bench on a drawn place shows the kit12 styles still applied from `src/bench/`; the PR body counts files and MB moved and removed.

**Files.** docs/codex/ui-logo-packet/01_kit12_ui/kit12.css, src/bench/dev-api.ts, src/bench/*.browser.mjs, scripts/audit/autoscan.ts, tests/assumption-markers.test.ts, tests/golden-path/played-world.node-test.ts, AGENTS.md, docs/coordination/OWNER-DECISIONS.md, docs/archive/2026-10-19/, public/education/, scripts/source/place-name-corpora.ts

**Notes.** Covers the audit's pool rows `release-docs-archive-oct19`, `release-one-rulings-log` and `release-browser-shots-out-of-docs`, and the `public/education` part of `release-ship-weight`. The audit notes deletion is equally safe since Git keeps history; archive is the acting CTO's call for Oct 19.

Sent back 2026-10-23 from PR #5844 (branch cto/docs-fresh-2026-10-23): live docs/packages/PW-common.md:7,48 and packages/README.md:12 still direct readers to archived paths, DECISION-REGISTER source pointers need repair, the generated pool index is stale, and a bounded item with a Done-when evidence table is missing; finish on that branch, merge main into it first.
