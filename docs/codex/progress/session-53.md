# Session 53 — b29 P1 progress

Date: 2026-10-06

## Current published candidate

- PR #2459 (draft): `b29 P1: targeted two-state calendar proof — not whole-world chronological acceptance.`
- Branch: `session-53-b29-p1`.
- Published producer/opening code head: `d2f97bc10abf4337a5c5d43691d9a54e8d6ed6a7`. Current PR #2459 head: `c26c3d766da620ce80ebeaa49376f9451409cc26`, rebased on `main` `e591ffc637d1f6db84d2ff920e8662ce123202ed`; this candidate is pushed and remains unmerged/draft.
- Prior broad runner remains stopped; PID 773 is `Z`/`[npm run world:a] <defunct>`, not executing. Stop request receipt and terminal verification are preserved in `/tmp/session53-run-evidence.txt`; broad-run OOM log is `/tmp/session53-nationwide-calendar-attempt-oom.txt`.

## Done

- P1 state bill-season scheduler uses the existing member-agenda filer; D.C. Council calendar is seeded for every nationwide opening; Congress's first monthly intake is seeded through `scheduleCongressIntake` and consumed by the existing `congressIntakeHandler`/`fileMemberAgendaBills` path.
- Current opening Congress roster public service now goes through `createWorkRelationships` before canonical life-based principle preparation. The work input uses saved seated terms and chamber organizations; current versioned opening only. No principle rows or bills are authored directly.
- Same Columbus fixture/seed on code head d2f97, sync and async: 535 seated Congress members, 540 canonical `life-principles/v1:` rows among those member IDs, 369 members with at least one, and zero `officeholder-principles/v1:` draw-prefix rows. Exact base f885 sync/async and candidate 3186 sync/async each recorded 342 total principle rows and zero draw-prefix rows. See `docs/codex/evidence/b29-world-keeps-governing/p1-opening-principles.md` and `.json`.
- Single dated Feb. 1 Congress intake on d2f97 filed H.R. 6, 119th Congress, sponsor Emma Mendoza: House filed 1; committee admitted/floor-passed/failed/enacted all 0; Senate all 0. It is nonterminal. This is an intake diagnostic, not chronological acceptance.
- Instrumented all-due Apr. 30 artifact (source 3186): 2,353 rows / 77 batches / 187.857 seconds; 85 state filings / 14 state enactments; D.C. B26-0011 through 15: 5 filed, 10 floor passages, 4 enacted, 1 pending; Congress 0 in that earlier artifact; `sessionAdjournments: []`. These are bounded progress, not per-jurisdiction full-session acceptance.
- Preserved the older `sessionAdjournments: []` artifact separately. A second all-due Apr. 30 bounded run on baseline `1332ee0` plus the candidate completion writer processed 2,303 due rows (not bills), 83 date batches, 207.199 seconds, 0 unresolved in-bound; 86 filed measures, 323 committee actions (109 admissions), 35 floor passages, 76 failed, 10 enacted. It recorded 33 completion events across 33 of 57 coverage rows: 33 `legal-limit` (27 explicitly estimated), 0 `sine-die-vote`, 0 `scope-disposed`. Full data and exact 57-row coverage: `docs/codex/evidence/b29-world-keeps-governing/p1-session-completion-coverage.json`; scope/method and cause distinctions: `p1-session-end-contract.md`. This is bounded progress, not a run at `fef16e58` or full-session acceptance.
- Candidate completion writer: `recordLegislativeSessionCompletion` in `src/simulation/governing/legislative-session-completion.ts`; registered for legal-limit due rows, scheduled through the existing state bill-season calendar, and observed by `sessionClosesOn`. It rejects off-date recording and estimate provenance on non-legal-limit causes. Cause union matches CTO 6015318118 and newer special-session design 6015836831: `legal-limit`, `sine-die-vote`, `scope-disposed`. No `legislative-clock.ts` edits. Contract was sent to Session 35 on #2424 (receipts `6016008781`, correction `6016073585`), initially marked working-tree stub at baseline `1332ee0`; it is now committed at `fef16e58d4b4beb54bb51da646e07c2761062bf2`. Actual vote producer is not yet connected. Session 23 was asked for the canonical saved special-session call shape/IDs on #2424 receipt `6016084915`. At rebased head, focused completion suite: 4 passed. Full `npm run typecheck` exits 2 on only the unrelated `src/simulation/press/press-premise.test.ts:35,125` fixtures missing current-main-required `personalLifeDepiction`; it found no errors in the completion code. `git diff --check`: passed.
- Focused calendar/member-agenda checks: 69 passed. Targeted public-work test: 1 passed. `npm run typecheck`: passed. `git diff --check`: passed.
- Full opening-life test at d2f97: 6 passed, 2 failed. The existing assertion at `opening-life.test.ts:135` expects >3,500 legacy draw-prefix rows and observes 0; a separate age-12 case times out at the existing 10-second limit. The assertion was not changed. Exact-base sync/async diagnostics prove the prefix result predates P1; see report and preserved `/tmp/session53-...` diagnostic files. PR remains draft/not READY.

## Still open

- Full-session acceptance must process all due rows in date order through each jurisdiction's own session end, including D.C. Council and territories. The old `sessionAdjournments` ledger remains empty. Current event artifact has no completion rows for 24 coverage entries (17 states plus D.C., PR, GU, VI, AS, NMI and federal Congress); dates beyond Apr. 30, second sessions, and absent institutional/call contracts remain uncovered. See `p1-session-completion-coverage.json` and cause-specific evidence in `p1-session-end-contract.md`.
- Territory coverage remains incomplete: PR has a generic pack without a territorial seated roster/intake; GU, VI, AS and MP lack canonical legislative packs/rosters. D.C. Council is year-round; federal Congress has no state-style session-end contract in the current coverage table.
- #2052 is full; current board is #2424. CTO ruling `6015318118` authorizes legal-limit and sine-die completion and removes appropriation as a sine-die prerequisite; newer CTO special-session design `6015836831` defines `scope-disposed` when every called subject has been acted on. The exact sine-die API/payload contract and cause correction were delivered to Session 35 in receipts `6016008781` and `6016073585`. Session 23 was asked for the canonical saved special-session call/scope contract in `6016084915`. Do not confuse the `6015682543` due-row intake with actual completion-event count.
- Session5 owns daily-turnover/performance repair; no annual daily loop, heap increase, new tree, build, or merge was run. PR #2459 was rebased from base `f885081` onto refreshed `origin/main` `e591ffc637d1f6db84d2ff920e8662ce123202ed`, pushed with a guarded force-with-lease, and its body distinguishes the bounded run from full-session acceptance. Current PR head is `c26c3d766da620ce80ebeaa49376f9451409cc26`. `npm run typecheck` at the changed code head `fef16e58` exits 2 only on the two current-main `press-premise.test.ts` fixtures lacking `personalLifeDepiction` (35, 125); the changed completion module had no reported type errors.

## Next safe step

Continue the actual sine-die consumer integration against Session 35's vote outcome and prepare to consume Session 23's canonical special-session call record. Keep the legacy empty-adjournment artifact distinct from the new saved completion-event count. Do not claim full-session acceptance or mark the PR READY.

Next command:

```bash
rg -n "recordProceduralMotion|sine-die-vote-carried|special-session-called|session-completed" src/simulation/legislation.ts src/simulation/governing src/simulation/executive-*.ts
```
