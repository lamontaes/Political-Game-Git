---
id: core-long-run-controlled-sources-required-forever
title: "A controlled person's payroll and cash-act sources are never released, so the cash journal keeps every one of the player's paydays"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-core-long-run-controlled-sources-required-forever
pr: #8440
after:
blocked-on:
lead: speed
source: speed lead's round-four reader check and the review of speed/fold-cash-receipts, Nov 2
standard: 2
model: sonnet
effort: medium
root: rc5-full-detail-every-day
checked: fable 2026-11-11
claimed-at: 2026-11-11T05:34:04.279Z
branch: claude/pool-core-long-run-controlled-sources-required-forever
---

**What.** prunePriorSource (src/core2/work-cash.ts, line 556) returns early for a source in retainedControlledSources, and the payroll path (src/core2/work-payroll-cash.ts:1916, :2212, :2383) never releases a controlled source at all, so every payroll and cash-act source paid to the person under explicit control (the player on the player clock, or anyone dev mode controls) stays required. Each such receipt keeps `retention.requiredBySource`, core.cashJournal.requiredBySource gains a row every payday, and the monthly fold of itemized receipts (foldOldCashJournalDetail in src/core2/decision-detail.ts) must keep them all and walks them again on every 1st. speed:year cannot show it, because advanceCore refuses to run while a person is controlled (src/core2/life.ts:605). In dev mode, dropOldPayrollSources (src/core2/decision-detail.ts, line 446) also deletes a controlled non-player's payroll source rows after 7 days while requiredBySource still names them, so those receipts can never be released. Guards: the speed rule over a long save, where years 97 to 100 hold at most 1.2 times the records of years 1 to 4.

**Cause.** Found in code: src/core2/work-cash.ts `prunePriorSource` (line 556) returns early for a source in `retainedControlledSources` (line 131), and the payroll path in src/core2/work-payroll-cash.ts (lines 1916, 2212 and 2383) never releases a controlled source. `dropOldPayrollSources` (src/core2/decision-detail.ts line 446) drops payroll source rows while the required-by-source table still names them.

**Fix.** Test first, then the release. (1) Write the proof: drive a controlled person across paydays the way the work-cash and player-control tests do (the player clock cannot run through `advanceCore` while a person is controlled, src/core2/life.ts line 605), for 120 days, and count `core.cashJournal.requiredBySource` rows per commitment after the second payday. It fails on main. (2) Release a controlled source once the next one for the same commitment posts: in `prunePriorSource` (src/core2/work-cash.ts, lines 556 to 574) and at the two places the payroll path adds a controlled source (src/core2/work-payroll-cash.ts, lines 1916 and 2383), which has no release today. (3) Make `dropOldPayrollSources` (src/core2/decision-detail.ts, line 446) skip a row that `requiredBySource` still names. Show in the test that the player's full trace of the open commitment still reads whole after the release. Never fold a receipt that is still required.

**Time box.** 5 hours for one Sonnet session. When it runs out, push the test and what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): years 97 to 100 hold at most 1.2 times the records of years 1 to 4, so a table that gains a row every payday of play must stop growing. The CTO ruling of Nov 1, 21:25 keeps open obligations whole, so the fix releases a controlled source once the next one for the same commitment posts (as prunePriorSource already does for every other source); it never folds a receipt that is still required.

**Done when.** A second session, in a drawn place with a test that plays the player on the player clock for 120 days (place and seed named), sees at most one required journal receipt per payroll or cash-act commitment of the player after the second payday, and the released receipts fold on the first of the month past the journal's detail days. The work-cash, work-payroll-cash and player-control tests pass in drawn places named with their seeds.

**Waits on.** Nothing.

**Files.** src/core2/work-cash.ts, src/core2/work-payroll-cash.ts, src/core2/decision-detail.ts

**Notes.** lead: speed (work and payroll have no lead of their own in CREW.md). Found by the round-four reader check (correction 2) and confirmed by the review of speed/fold-cash-receipts (e017d21aab).

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:46 UTC) on branch claude/pool-core-long-run-controlled-sources-required-forever.

**Notes (Nov 11, 2026, map folded in).** The first builder (#8440) confirmed the cause in both files and stopped because it could not show the player's trace stays whole after a release, and because the 120-day proof cannot run through `advanceCore`. The Fix now puts the test first and says how to drive it. The speed lead (started Nov 11) owns this family and may take it or hand it to a helper.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:25 UTC) on branch claude/pool-core-long-run-controlled-sources-required-forever.

Released (2026-11-11): Read and scoped, not built: controlled sources are retained on purpose (retainedControlledSources, retainFull, control snapshots verified around every plan) so a controlled person's payroll replays; releasing them touches the hardened private-identity paths in work-cash.ts and work-payroll-cash.ts and needs the 120-day controlled-person test written first, which the player clock makes slow to drive; not a bounded first part for this session. Continue on branch claude/pool-core-long-run-controlled-sources-required-forever.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:33 UTC) on branch claude/pool-core-long-run-controlled-sources-required-forever.

Released (2026-11-11): Cause matches, but the payroll path (work-payroll-cash.ts) has no prior-source release for any source and keeps controlled receipts whole on purpose (retainFull), so it needs the speed lead's design first; not built. Continue on branch claude/pool-core-long-run-controlled-sources-required-forever.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:34 UTC) on branch claude/pool-core-long-run-controlled-sources-required-forever.
