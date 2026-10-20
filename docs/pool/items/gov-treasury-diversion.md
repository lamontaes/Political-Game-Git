---
id: gov-treasury-diversion
title: "An official can divert a budget line's money, recorded on the treasury's books"
area: gov
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #4587
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:02:54.270Z
---

**What.** An official can divert a budget line's money, recorded on the treasury's books. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/core2/budgets-treasury.ts, src/core2/data/corruption/parameters.json (code or data, left for the author); resolve and push. Finish it on the existing branch claude/gov-treasury-diversion, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-treasury-diversion.md and the files that pull request #4587 changes on claude/gov-treasury-diversion

**Notes.** TODO

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): merging main conflicts in src/core2/budgets-treasury.ts, src/core2/data/corruption/parameters.json (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): Merger: not merged. ESLint fails on a file this branch changes: 'governmentsOf' is defined but never used (@typescript-eslint/no-unused-vars, line 14, column 25). Typecheck, Prettier, the changed tests, zero-dice and the release check pass. Please remove the unused import and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): Merging current main into claude/gov-treasury-diversion conflicts in docs/pool/items/people-officials-living-costs.md, src/core2/budgets-treasury.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): The new treasury-diversion.test.ts still calls context.skip when no drawn place has a closed treasury, so the diversion regression can be reported as skipped instead of verifying a real transfer. The merger morning check forbids skipped tests. Draw or construct an applicable treasury fixture and fail clearly if none is reached; retain the assertions that at least one takes money, most decline, and both account balances match the transfer; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): src/core2/treasury-diversion.test.ts fails on this branch merged with current main: seed 7c3221f14c85aa8c: nobody took any in 8 places; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4587 (branch claude/gov-treasury-diversion): Morning check: the new corruption.diversions table has no non-test reader (the PR explicitly defers its audit/complaint consumer). Wire it to an existing decision, audit, director or journal consumer, or remove the write-only table. The current test substitutes residents with registerGovernmentExecutive and manually funds the treasury; also provide the ordinary generated-world route using the actual officeholder and monthly treasury producer, with seed and record ids. The earlier skipped-test defect is fixed.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4587 (branch claude/gov-treasury-diversion): Morning check and test timeout: treasury-diversion.test.ts timed out, and corruption.diversions table has no non-test reader and no stopgap row; finish on that branch, merge main into it first.

**Measured Oct 20 (probe, not committed).** Three played years drawn at random (seed f03e5dbf7b287a85: North Star, Delaware; Goldstream, Alaska; East Amana, Iowa), 36 treasury months closed in each, and no treasury.diverted event in any: the honest case is the rule, as the strained-resident test expects. The probe did not separate "every chief executive declined" from "the hook found no executive", so a played year still has not shown one diversion by record id. The unit test with strained stand-in officials is the proof a diversion moves real money; a played-year proof of one needs a seed where a strained executive exists.
