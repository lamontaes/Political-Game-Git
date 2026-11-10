---
id: gov-treasury-diversion
title: "An official can move budget money outside the law, and it is found out through audits, the press or complaints"
area: gov
kind: feature
priority: 3
size: S
status: blocked
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The owner ruled on Nov 10, 2026: "Yes, keep it." An official can move money from one budget line to another outside the law, and it is found out the way bribery is, through audits, the press or complaints. The design is docs/design/treasury-diversion.md: a second kind of act in the corruption engine that exists, with its money on the treasury's books and its discovery through people who learn of it. It is built in four parts and one research item, and this parent is the closing check. Seen: the paper's story and the Journal line when an official's quiet move of budget money is found out (owner, Nov 10: "Yes, keep it").

**Cause.** Design: docs/design/treasury-diversion.md, written from the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md. In code today the corruption engine (src/core2/modules/corruption.ts) records only bribes (`CrimeRecord`, line 62), nothing but a lawful measure moves a line (`amendBudget`, src/core2/modules/budgets.ts line 2105), and no module audits a government's books.

**Fix.** Build the parts in order: gov-treasury-diversion-part-1-the-act-and-its-money, then gov-treasury-diversion-part-2-the-shorted-line-and-the-complaint, then gov-treasury-diversion-part-3-the-yearly-audit, with gov-treasury-diversion-part-4-the-players-seat after part 1, gov-treasury-diversion-part-5-the-justice-path-takes-the-kind after part 2, and research-local-government-audit-rules at any time. This parent's own work is the closing check below, after the parts merge.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** The chain is the acceptance: one diverted dollar is followed from the line it left to where it went, to the person shorted, to who learned of it and how, to the story in the paper and the voter who weighed it, by record id. No dice. Ask why. Follow .agents/skills/seen-in-game/SKILL.md.

**Done when.** A second session, not a builder of any part, plays a drawn place (place and seed named) on main and follows one diversion end to end by record id: the cause, the official's choice with its reasons, the journal entries, the shorted line's smaller payment, the department head or auditor who learned of it, their decision, the scandal in News, the case on the one justice path through to its sentence and the money paid back to the treasury, and one voter's ballot reasons that cite it. It also plays an executive, takes the quiet move in the scene, and sees the same chain start from the player's own choice.

**Waits on.** gov-treasury-diversion-part-1-the-act-and-its-money, gov-treasury-diversion-part-2-the-shorted-line-and-the-complaint, gov-treasury-diversion-part-3-the-yearly-audit, gov-treasury-diversion-part-4-the-players-seat and gov-treasury-diversion-part-5-the-justice-path-takes-the-kind.

**Files.** docs/design/treasury-diversion.md, src/core2/modules/corruption.ts

**Notes.** The send-backs below are from the old branch claude/gov-treasury-diversion (pull request #4587), kept as the record of what went wrong there: a table nobody read, a test that could pass with no diversion, and a positive case funded by hand. Nothing is built on that branch.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): merging main conflicts in src/core2/budgets-treasury.ts, src/core2/data/corruption/parameters.json (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): Merger: not merged. ESLint fails on a file this branch changes: 'governmentsOf' is defined but never used (@typescript-eslint/no-unused-vars, line 14, column 25). Typecheck, Prettier, the changed tests, zero-dice and the release check pass. Please remove the unused import and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): Merging current main into claude/gov-treasury-diversion conflicts in docs/pool/items/people-officials-living-costs.md, src/core2/budgets-treasury.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): The new treasury-diversion.test.ts still calls context.skip when no drawn place has a closed treasury, so the diversion regression can be reported as skipped instead of verifying a real transfer. The merger morning check forbids skipped tests. Draw or construct an applicable treasury fixture and fail clearly if none is reached; retain the assertions that at least one takes money, most decline, and both account balances match the transfer; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4587 (branch claude/gov-treasury-diversion): src/core2/treasury-diversion.test.ts fails on this branch merged with current main: seed 7c3221f14c85aa8c: nobody took any in 8 places; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4587 (branch claude/gov-treasury-diversion): Morning check: the new corruption.diversions table has no non-test reader (the PR explicitly defers its audit/complaint consumer). Wire it to an existing decision, audit, director or journal consumer, or remove the write-only table. The current test substitutes residents with registerGovernmentExecutive and manually funds the treasury; also provide the ordinary generated-world route using the actual officeholder and monthly treasury producer, with seed and record ids. The earlier skipped-test defect is fixed.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4587 (branch claude/gov-treasury-diversion): Morning check and test timeout: treasury-diversion.test.ts timed out, and corruption.diversions table has no non-test reader and no stopgap row; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #4587 (branch claude/gov-treasury-diversion): The body still describes the removed table and lacks its Done-when evidence table; the ordinary-year test can pass with zero diversions, while the positive case substitutes and funds residents by hand; add a positive ordinary generated-world money-chain witness by record id; finish on that branch, merge main into it first.

Deferred Oct 25: nothing on screen reads it yet.
