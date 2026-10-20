---
id: core-m7-03-zero-placeholders
title: "M7-03 Zero placeholders"
area: core
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone: M7
source: "docs/roadmap/later-specs-draft.md M7-03"
---

**What.** Every registered shortcut replaced, or turned into a sourced or marked estimate. (Owner: Every session, in its own area.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** The release build passes with zero open stopgaps.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Measured Oct 20 (claude, claude/political-game-pool-76ksvw), not built: 260 of the 401 registered stopgaps are open, and the release build refuses while any are. By prefix: GOV 88, P8 56, WORLD 34, CORE 23, P15 21, P10 12, PEOPLE 7, OFFICE 6, M1 2, PW8 2, PLAY 2, STATE 2, WEB 1, OFFICIALS 1, LOC 1, POOL 1, LAWS 1. The biggest kinds: missing-mechanic 40, uncalibrated-tunable 28, faked-mechanic 24, missing-engine 22, missing-data 18, assumed-data 17. Two are owner-decision rows (SG-WORLD-housing-fill-in-arrears, SG-GOV-committee-day-hooks). 7 rows have no status field at all (SG-WORLD-jobs-agreement-pinned, SG-WORLD-housing-mortgage-history, SG-WORLD-housing-price-index, SG-WORLD-credit-island-deposits, SG-WORLD-housing-island-areas, SG-WORLD-business-union-members...); the release gate should say whether those count. Each open row already has a pool item (`*-stopgap-*`); this umbrella closes when they all do, so there is nothing to build here that those items do not. The other two clauses (no player-facing surface shows an estimate label, a source, "unknown" or a hard-coded value; the old core is deleted) are not measured here: `tests/player-wording.test.ts` guards some of the wording, and the old engine folders are `src/simulation` and `src/rules` until `core-delete-old-engine` lands.

Both owner-decision rows are already ruled and have a PR: SG-GOV-committee-day-hooks (acting CTO ruling Oct 19 in OWNER-DECISIONS.md, built by `gov-committee-day-reads-records`, in a PR) and SG-WORLD-housing-fill-in-arrears (ruling Oct 19, `world-fill-in-arrears-from-household`, #5142). So no question is waiting for the owner there; the rows close when those PRs merge and mark them resolved.
