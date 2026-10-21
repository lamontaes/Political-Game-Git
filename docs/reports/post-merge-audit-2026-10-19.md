# Post-merge audit, Oct 19 evening (acting CTO)

The merger lanes merged 64 PRs on the evening of October 19, the later 48 of them on GitHub's badges alone, without merging main in or running checks.

## What happened

- **Phase 1, early evening:** 16 PRs. Merge-main commits present, send-backs posted, rulings applied (checked).
- **Phase 2, around midnight:** 48 PRs. 40 of them merged in 3 min 43 s (one every 5.6 s). No merge-main on 24 of 28 code PRs. No comments, no send-backs. The merges rode on GitHub's badges.
- Every Release run on main in the window was canceled by the flood. Main's gate state is unknown until a run finishes.

**Result:** 51 clean, 13 questions, 0 reverts. No new rolls, no deleted stopgap rows, no loosened tests, no named places in logic.

## Fix-forward list

The next merger lands these first, in order.

1. **#5235** (words-archive-law-budget-ledes) was merged into its parent branch `claude/words-past-archive-news`, not main. Its pool item was set done anyway. Set the item back to `in-pr`, open a PR from that branch tip to main, and merge it.
2. **#5147 and #5264** merged with no release declaration. If the next finished Release run is red, add both declarations in one PR, as #5126 did for #5123.
3. **#5200** (pretrial bail): "posted" never moves the cash. Either move the dollars on the journal or register a stopgap row for it. One PR.
4. **#5059:** the CTO ruled to set the item dropped in the PR. No commit followed. Set `play-councils-legislatures-and-congress-acting-on-their` to dropped, with the reason.
5. **#5104:** `src/core2/trait-packs.ts` and `src/core2/mind-catalog.ts` now import from `../simulation/types`. Pool item `core-no-imports-from-old-core` (core, bug, p1, S). core2 never imports from `src/simulation`. Move the types into core2. The old-core line (`core-old-engine-*`) depends on it.
6. **#5109:** the journal's structural checks are skipped in play under "bookkeeping is a debug switch." Add a visible marker and a line in the bench so a disputed result can turn them on. Pool item `core-journal-checks-marker` (core, cleanup, p2, S).
7. **#5166** (contract awards decided by four cited TUNABLE weights with spreads) and **#5170** (community-project inclusion = same side or on committee, no stopgap row): leave both as they are. Pool items `gov-contract-award-weights-review` (p2) and `gov-community-project-inclusion-rule` (p2) ask the area builder to replace the fixed inclusion rule with the officials' reads, and to confirm the weights are calibrated bands, not deciders.
8. **#5242 and #5235** ship `origin: authored` text lines. There are 15 prior precedents. The Words session decides. Noted only.

## Rulings

- **The merger that rubber-stamped is off.** The merger runs on Sonnet and follows `.agents/skills/merger/SKILL.md` one PR at a time: merge main in, run the changed-file checks in its own environment, apply the morning check, then flip the item. GitHub's badges are never the gate.
- **Two mergers may run,** split by PR number parity.
