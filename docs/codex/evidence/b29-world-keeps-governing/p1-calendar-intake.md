# b29 P1: dated state intake candidate evidence

## Candidate source

- Exact base `HEAD`: `f88508186b78f526ecf89a420b5fb584171e039a` (branch `session-53-b29-p1`).
- Candidate has uncommitted edits in `src/presentation/opening-life.ts`, `src/simulation/governing/governing-calendar.ts`, `src/simulation/governing/member-agenda-state-intake.test.ts`, and `src/simulation/legislative-session-calendar.test.ts`.
- Focused verification: 2 Vitest files passed, 68 tests; `git diff --check` passed.
- Change: opening setup seeds the same rolling state bill-season due rows used by `scheduleGoverningSeasons`, one next eligible session date per state executive jurisdiction. The existing `governingSeasonHandler` calls the canonical `fileMemberAgendaBill` path. It creates no measure by itself and adds no per-state or fixed-count quota.
- Session5-owned daily-turnover code is untouched.

## Preserved empty result

An earlier minimal Mississippi calendar traversal on exact code head `0494b12330d2ee44f4d11a4a44671c27ffb1755f` visited 15 bill-calendar rows across 2026–2030 and filed 0 bills. The current-main rerun on base `f88508186b78f526ecf89a420b5fb584171e039a` also found 0 in the minimal generated-condition setup. In that setup the fresh state roster had no saved member principles. This remains an empty-intake result, not a bill-throughput result.

Prior watched world-run stop/verification and logs remain at `/tmp/session53-run-evidence.txt`; no annual world run was restarted.

## Normal opening-life single-date proof

Run from the candidate working tree with `node --import tsx /tmp/session53-one-session-calendar-resolve.mts` (bounded calendar resolver, not `advanceObservedWorld`). Seed `session53-one-date-ms`; opening world used 9,389 people and no manually supplied member principles or authored measures. The exact base HEAD was `f88508186b78f526ecf89a420b5fb584171e039a`; the four candidate worktree edits above were active during the run.

The dated Feb. 15, 2026 intake called the existing member filer, whose `ensureOfficeholderPrinciples` call formed 154 new saved principle records. By Feb. 18, the Mississippi and seeded-random West Virginia rows had produced:

| State | House filed | Senate filed | Admitted to committee | Passed | Failed | Enacted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mississippi | 2 | 0 | 2 | 0 | 0 | 0 |
| West Virginia | 3 | 0 | 3 | 0 | 0 | 0 |

Bills and named seated sponsors:

- Mississippi HB 17 — `legislative-measure_d0317f88550c9bd6`, Thomas Henderson.
- Mississippi HB 18 — `legislative-measure_11660ba8e76d67c3`, Riley McNeil.
- West Virginia HB 13 — `legislative-measure_c7e9ac133fd1f974`, Sage Carlson.
- West Virginia HB 14 — `legislative-measure_2361dc33fffe884e`, Logan Myers.
- West Virginia HB 15 — `legislative-measure_f1b8ae1f062a79f2`, Alex Sutton.

Each recorded an introduction on Feb. 15 and referral to its House standing committee on Feb. 18. They were in committee at the cutoff; there were no passage, failure, enactment, or downstream law-effect records yet. The proposed answers are recorded on each measure, not claimed as enacted consequences.

## Runtime bound and remaining proof

The Jan. 5–Feb. 18 calendar-only interval took 46 seconds at the ordinary Node heap setting. There were 59 scheduled future-due rows initially inside the bound; as handlers added work, 85 bills were introduced nationwide. This is not a count of processed due rows. No daily clock loop ran. The shared state timetable is explicitly labeled `state-session-game-calendar/v1` and `basis: game-profile`, so Feb. 15 is a simulated calendar date, not a sourced claim about Mississippi's real 2026 convening date.

A single-date contribution to natural filing is now demonstrated. Passage, failure, enactment, and actual law consequences remain unproved. The next bounded outcomes route should keep the canonical bill and institution-step handlers while controlling unrelated state calendar work; an owner question asking whether to leave non-target state rows pending is on successor board #2424, comment 6013251433. Continue without waiting for a reply.

## Targeted two-state calendar proof — not whole-world chronological acceptance.

This follow-on uses the ordinary opening-life world, seed `session53-one-date-ms`, but dispatches only Mississippi and West Virginia state bill-season rows plus due items whose entities are those states' filed bills. Other jurisdiction due rows remain scheduled and pending. It calls the existing registered future-transition handlers and records each selected row's terminal due state; it does not change filing, vote, committee, or passage writers. Command: `node --import tsx /tmp/session53-target-states-throughput.mts`.

- Source base HEAD: `f88508186b78f526ecf89a420b5fb584171e039a`, with the same four candidate source/test edits active.
- Open/setup: 5.54 seconds; 9,389 people; 364 existing principle rows.
- Target event rows handled: 26, through April 15, 2026; bounded run total 6.12 seconds; unchanged default heap; zero blocked target rows.
- Additional recorded principles: 268 for the two selected states' actual officeholder intake writers.

| State | House filed | Senate filed | Committee-admitted | Passed floor stage | Failed | Enacted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mississippi | 2 | 0 | 2 | 0 | 2 | 0 |
| West Virginia | 3 | 0 | 3 | 0 | 3 | 0 |

All five bills were referred Feb. 18, received committee hearings Feb. 28, and were not reported on Mar. 1. Their recorded terminal outcome is `failed-in-committee`; no bill produced an enactment or downstream law consequence. The longer cutoff reached April 15 because the next state bill-season row was inside the bound; the two targeted states filed no additional bills there. No unrelated state queue was consumed. No daily loop, heap increase, fixed bill count, or dice were used.

This answers the two-state filing/committee question only. It is deliberately not the whole-world chronological acceptance run. The CTO subsequently required a separate nationwide calendar-only run through one full regular session with all jurisdiction rows in date order and per-state/chamber counts. That acceptance run remains outstanding.
