---
id: gov-treasury-diversion
title: "An official can divert a budget line's money, recorded on the treasury's books"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr: #4587
after:
blocked-on:
lead: governing
model: opus
effort: high
root: none
source: added with npm run pool -- add
claimed-at:
---

**What.** An official can divert a budget line's money, recorded on the treasury's books. The work was built on branch claude/gov-treasury-diversion and sent back eight times between Oct 16 and Oct 23; it never merged, and its table has no reader on main. No design in the repository asks for it. Decide whether it is wanted before anyone builds on the old branch.

**Cause.** Needs cause. Looked at docs/design/, docs/roadmap/political-process-baseline.md and the item's eight send-backs: nothing there describes an official diverting a budget line, nothing on the golden path reads a diversion, and the test file that proved it (src/core2/treasury-diversion.test.ts) exists only on the old branch. The corruption parameters it changed are in src/core2/data/corruption/parameters.json and the treasury close in src/core2/budgets-treasury.ts.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Look before you ask: read OWNER-DECISIONS, the decision register, prior-rulings, LAW and the docs search before asking the owner whether diversion is wanted, and end the question with the reading line. An effect is a read, not a record: a diversion table that nothing reads is an unregistered placeholder. Replace, never layer: the old branch's table is removed if the feature is dropped.

**Done when.** A second session, not the builder, either records the ruling that diversion is wanted or not wanted, citing the file that holds it, or, if wanted, sees an official's diversion in a drawn place of the played world (`buildBenchWorld`, place and seed named) move money from a named treasury line to the official by journal record id, read by an audit, news story or complaint by record id, with a test that does not skip.

**Waits on.** A ruling that diversion is wanted.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/corruption/parameters.json, src/core2/modules/corruption.ts

**Notes.** TODO

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): merging main conflicts in src/core2/budgets-treasury.ts, src/core2/data/corruption/parameters.json (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): Merger: not merged. ESLint fails on a file this branch changes: 'governmentsOf' is defined but never used (@typescript-eslint/no-unused-vars, line 14, column 25). Typecheck, Prettier, the changed tests, zero-dice and the release check pass. Please remove the unused import and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): Merging current main into claude/gov-treasury-diversion conflicts in docs/pool/items/people-officials-living-costs.md, src/core2/budgets-treasury.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): The new treasury-diversion.test.ts still calls context.skip when no drawn place has a closed treasury, so the diversion regression can be reported as skipped instead of verifying a real transfer. The merger morning check forbids skipped tests. Draw or construct an applicable treasury fixture and fail clearly if none is reached; retain the assertions that at least one takes money, most decline, and both account balances match the transfer; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): src/core2/treasury-diversion.test.ts fails on this branch merged with current main: seed 7c3221f14c85aa8c: nobody took any in 8 places; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4587 (branch claude/gov-treasury-diversion): Morning check: the new corruption.diversions table has no non-test reader (the PR explicitly defers its audit/complaint consumer). Wire it to an existing decision, audit, director or journal consumer, or remove the write-only table. The current test substitutes residents with registerGovernmentExecutive and manually funds the treasury; also provide the ordinary generated-world route using the actual officeholder and monthly treasury producer, with seed and record ids. The earlier skipped-test defect is fixed.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4587 (branch claude/gov-treasury-diversion): Morning check and test timeout: treasury-diversion.test.ts timed out, and corruption.diversions table has no non-test reader and no stopgap row; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #4587 (branch claude/gov-treasury-diversion): The body still describes the removed table and lacks its Done-when evidence table; the ordinary-year test can pass with zero diversions, while the positive case substitutes and funds residents by hand; add a positive ordinary generated-world money-chain witness by record id; finish on that branch, merge main into it first.

Deferred Oct 25: nothing on screen reads it yet.
