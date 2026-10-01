# An empty presidential choice leaves the vice presidency vacant

Before: When the President's appointment decision returned no nominee, the vacancy handler drew another eligible person and recorded a nomination.

After: An empty choice leaves the office vacant. The existing due resolver saves a blocked reason. A selected nominee retains the same saved nomination and world state.

## Why-chain

Measured source finding: the old handler substituted a seeded pick for a null appointment choice (`office-continuity.ts` at main `afd2570df`, line 1575). The nomination appeared because the fallback supplied a person ID to the existing writer. That person came from the seed and eligible pool, without the President selecting them. Bedrock finding: the seeded fallback supplied a nominee despite the empty presidential choice.

Measured source finding: the candidate returns the unchanged world when selection is empty (`office-continuity.ts:1571`). It gives the due resolver the reason `government:vice-president-no-nominee`, rather than an outcome event.

Measured source finding: the survivor reads the President's recorded contacts and colleagues through `chooseAppointee`, but still permits close-choice randomness (`patronage/appointments.ts:455`). This repair removes the fallback, not that inherited decision mechanism. Congressional persuasion, nominee consent and a later explicit player nomination remain missing links.

## Research

Measured primary-source reading: Section 2 of the Twenty-Fifth Amendment says the President “shall nominate a Vice President who shall take office upon confirmation by a majority vote of both Houses of Congress” ([National Archives](https://www.archives.gov/founding-docs/amendments-11-27)). An empty appointment choice supplies neither a nomination nor either chamber's vote. The text supplies no ten-day nomination or seventy-five-day confirmation deadline.

## Revisions

Measured diff finding: the fallback pick is removed, and the actual selected-choice route keeps its existing writers (`office-continuity.ts:1580`). No new nominee, event, retry date, probability, cost or outcome level is added. The existing timing profile and automatic-confirmation placeholder remain outside A96's narrow guard.

## What gets built

1. Require an actual `chooseAppointee` result before writing a nomination.
2. Return the existing blocked-due status and a structured reason when selection is empty.
3. Preserve selected nominee records and passed-over records.
4. Check actual player nonselection, a supplied NPC nonselection, selected-choice parity, and canonical blocked-receipt persistence.

## Simulated, records, world pieces, checks

Measured: the actual player-President chooser returns null, and the guarded handler appends no event or confirmation due item (`vice-president-choice-required.test.ts:122`). The NPC empty-choice case supplies null with a spy; it proves the guard, not a naturally observed NPC refusal.

Measured: the existing due resolver saves one blocked state, and repeating the boundary after canonical Continue saves no second state (`vice-president-choice-required.test.ts:179`). Its context records absence of selection, not a personal motive. The original vacancy and history records remain intact.

Measured source finding: `blocked` is an existing terminal due status (`future-transitions.ts:326`). This repair schedules no automatic retry. An ordinary player command that later selects a nominee is not proven here; the broader player nomination lifecycle remains incomplete.

## Proof run

Measured: the final baseline passed one of four cases and failed both empty-choice cases plus blocked-receipt persistence. It recorded Natalie Brown's selected nomination event_f5c0ca6e276ebedd with serialized-world hash 3c9340639beddee4 (`/tmp/team2-a96-final-paired-before.log:6`).

Measured: the repaired same four cases passed. Natalie Brown's nomination and serialized-world hash matched the baseline receipt (`/tmp/team2-a96-final-paired-after.log:6`).

Measured: the final four cases passed in 23.47 seconds on the composed source, compared with 17.98 seconds for baseline's three failures and one pass (`/tmp/team2-a96-final-paired-after.log`). No assertion was removed or timeout increased. These test durations are not year-speed measurements.

Measured: the seed `A96-vp-choice-required` selected a real starting place from all 56 jurisdiction identities: District of Columbia, District of Columbia (`vice-president-choice-required.test.ts:35`). This proves one federal-office fixture, not 56 populated worlds. The federal callback has no state-specific selection arm.

## Worked example

Measured: on January 15, 2026, actual President Hope Weiss (`person_7bbae65f79073e24`) was player-controlled. Baseline recorded one nomination despite her empty choice; the candidate recorded zero and returned blocked (`/tmp/team2-a96-final-paired-after.log:5`). The office stayed vacant. No money moved: the direct empty-choice result retains the identical world.

Measured: when the actual existing chooser selected Natalie Brown (`person_00f68d4e2ba3dfd6`), both arms wrote the same nomination and confirmation schedule (`/tmp/team2-a96-final-paired-after.log:6`). She remained a nominee, not Vice President; the nomination case does not establish confirmation.

## Method and handoff

Audit gap A96. Runtime-tested source: `10cc84ed08ee4b2f5688a2e4170445c99ceb2d52`, composed with main `c2881beb4`. Owned production change: only the nomination guard and its obsolete fallback comments in `office-continuity.ts`. No shared confirmation, tenure, calendar or appointment-engine edits. This is a draft for CTO review, not merged or whole-docket completion.

Native command: `node scripts/storage/cli.mjs run test -- node node_modules/vitest/vitest.mjs run src/simulation/governing/vice-president-choice-required.test.ts --maxWorkers=1 --fileParallelism=false --disableConsoleIntercept`, with the existing Team 2 storage guard and native configuration. The paired driver restores only the owned nomination source in a finally block. Initial test setup failed before assertions because a historical cutoff was omitted; that setup receipt is retained separately. The final baseline above executed all four cases.

Two strict roots reported zero diagnostics. Changed-source lint, formatting, whitespace and the committed release check passed. Zero-dice found zero new findings and five inherited stale entries, exiting 1. Browser, full suite, ordinary confirmation lifecycle, all-56 populated-world proof and exclusive year-speed comparison were NOT RUN. No duplicate clock or nationwide audit was started. Next: CTO review of the blocked receipt, then the remaining authorized member-vote callers once Audit supplies their actual nonbill subject contract.
