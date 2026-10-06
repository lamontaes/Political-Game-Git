# b29 P1: dated state intake candidate evidence

## Candidate source

- Exact base `HEAD`: `f88508186b78f526ecf89a420b5fb584171e039a` (branch `session-53-b29-p1`).
- Producer code is committed at `5bbb72c920acb031bb67479f5d6b4541eda79f65` (state bill-season seed plus D.C. Council seating/scheduling on every opening); this evidence update is a later documentation commit.
- Focused verification: the two simulation files passed (68 tests); the changed opening-life file passed separately (11 tests); `git diff --check` passed.
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

This targeted proof uses the ordinary opening-life world, seed `session53-one-date-ms`, but dispatches only Mississippi and West Virginia state bill-season rows plus due items whose entities are those states' filed bills. Other jurisdiction due rows remain scheduled and pending. It calls the existing registered future-transition handlers and records each selected row's terminal due state; it does not change filing, vote, committee, or passage writers. Command: `node --import tsx /tmp/session53-target-states-throughput.mts`.

- Source base HEAD: `f88508186b78f526ecf89a420b5fb584171e039a`, with the same four candidate source/test edits active.
- Open/setup: 5.54 seconds; 9,389 people; 364 existing principle rows.
- Target event rows handled: 26, through April 15, 2026; bounded run total 6.12 seconds; unchanged default heap; zero blocked target rows.
- Additional recorded principles: 268 for the two selected states' actual officeholder intake writers.

| State | House filed | Senate filed | Committee-admitted | Passed floor stage | Failed | Enacted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mississippi | 2 | 0 | 2 | 0 | 2 | 0 |
| West Virginia | 3 | 0 | 3 | 0 | 3 | 0 |

All five bills were referred Feb. 18, received committee hearings Feb. 28, and were not reported on Mar. 1. Their recorded terminal outcome is `failed-in-committee`; no bill produced an enactment or downstream law consequence. The longer cutoff reached April 15 because the next state bill-season row was inside the bound; the two targeted states filed no additional bills there. No unrelated state queue was consumed. No daily loop, heap increase, fixed bill count, or dice were used.

This answers the two-state filing/committee question only. It is deliberately not a nationwide acceptance run. The Apr. 30 all-due bounded progress run and its full-session limitations are recorded below.

## Nationwide all-due run through Apr. 30 (bounded progress; not full-session acceptance)

The completed bounded run used the ordinary opening world and the canonical `resolveFutureDueItemsThrough` resolver with `composeWorldTimeHandlers()`. At each iteration it advanced directly to the next scheduled due date and resolved **all due items** through that date in `(dueAt, sequence)` order. This is a bounded future-calendar traversal, not a daily clock loop.

- Exact code source HEAD: `5bbb72c920acb031bb67479f5d6b4541eda79f65` (candidate branch; base/current-main composition `f88508186b78f526ecf89a420b5fb584171e039a`).
- Seed/place: `session53-nationwide-2026-2027`, observer place `session53-random-state`, key `2825740`; opening Jan. 5, 2026.
- Bounded cutoff: Apr. 30, 2026. This resolved every scheduled due item through that date, but Apr. 30 is not the recorded end of every jurisdiction’s regular session; do not label this result full-session acceptance.
- Opening/setup 5.617 s; full run 179.133 s. Default Node heap, no heap-size override, no daily loop.
- **2,347 due rows processed in 77 chronological date batches; 0 unresolved due rows inside cutoff.**
- State legislatures: 85 filed; 338 committee actions; 114 referrals; 45 floor-passage actions; 71 terminal non-enactments; 14 enacted. D.C. Council: 5 filed; 0 committee actions/referrals; 10 floor passages; 4 enacted; 1 pending. Combined recorded bills: 90 filed, 18 enacted, 71 failed, 1 pending; 0 vetoes. Filing/disposition are unique bills by origin body; committee/floor metrics count dated chamber actions.
- The all-due world included 50 state jurisdictions, the federal Congress, the D.C. Council, and the five territory identities. The Council used its existing municipal intake path and filed five measures. Puerto Rico has a generic state pack but no territorial member roster or bill intake. GU/VI/AS/MP have no canonical legislative pack/roster. Those four territories are unmeasured, not successful zero-throughput cases.

| Jurisdiction | Chamber | Filed (origin) | Committee actions | Referrals | Floor passages | Failed (origin) | Enacted (origin) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Alabama | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Alabama | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Alaska | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Alaska | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Arizona | House of Representatives | 2 | 6 | 2 | 2 | 2 | 0 |
| Arizona | Senate | 0 | 6 | 2 | 0 | 0 | 0 |
| Arkansas | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Arkansas | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| California | Assembly | 1 | 3 | 1 | 1 | 0 | 1 |
| California | Senate | 0 | 3 | 1 | 1 | 0 | 0 |
| Colorado | House of Representatives | 1 | 3 | 1 | 1 | 1 | 0 |
| Colorado | Senate | 0 | 3 | 1 | 0 | 0 | 0 |
| Connecticut | House of Representatives | 1 | 3 | 1 | 1 | 0 | 1 |
| Connecticut | Senate | 0 | 3 | 1 | 1 | 0 | 0 |
| Delaware | House of Representatives | 1 | 3 | 1 | 1 | 1 | 0 |
| Delaware | Senate | 0 | 3 | 1 | 0 | 0 | 0 |
| Florida | House of Representatives | 1 | 3 | 1 | 0 | 1 | 0 |
| Florida | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Georgia | House of Representatives | 1 | 3 | 1 | 0 | 1 | 0 |
| Georgia | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Hawaii | House of Representatives | 2 | 6 | 2 | 2 | 0 | 2 |
| Hawaii | Senate | 0 | 6 | 2 | 2 | 0 | 0 |
| Idaho | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Idaho | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Illinois | House of Representatives | 3 | 9 | 3 | 3 | 0 | 3 |
| Illinois | Senate | 0 | 9 | 3 | 3 | 0 | 0 |
| Indiana | House of Representatives | 3 | 9 | 3 | 0 | 3 | 0 |
| Indiana | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Iowa | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Iowa | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Kansas | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Kansas | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Kentucky | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Kentucky | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Louisiana | House of Representatives | 3 | 9 | 3 | 3 | 3 | 0 |
| Louisiana | Senate | 0 | 9 | 3 | 0 | 0 | 0 |
| Maine | House of Representatives | 3 | 9 | 3 | 0 | 3 | 0 |
| Maine | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Maryland | House of Delegates | 1 | 3 | 1 | 1 | 1 | 0 |
| Maryland | Senate | 0 | 3 | 1 | 0 | 0 | 0 |
| Massachusetts | House of Representatives | 2 | 6 | 2 | 2 | 0 | 2 |
| Massachusetts | Senate | 0 | 6 | 2 | 2 | 0 | 0 |
| Michigan | House of Representatives | 1 | 3 | 1 | 0 | 1 | 0 |
| Michigan | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Minnesota | House of Representatives | 1 | 3 | 1 | 0 | 1 | 0 |
| Minnesota | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Mississippi | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Mississippi | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Missouri | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Missouri | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Montana | House of Representatives | 0 | 0 | 0 | 0 | 0 | 0 |
| Montana | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Nebraska | Legislature | 2 | 6 | 2 | 0 | 2 | 0 |
| Nevada | Assembly | 0 | 0 | 0 | 0 | 0 | 0 |
| Nevada | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| New Hampshire | House of Representatives | 2 | 6 | 2 | 2 | 2 | 0 |
| New Hampshire | Senate | 0 | 6 | 2 | 0 | 0 | 0 |
| New Jersey | Assembly | 0 | 0 | 0 | 0 | 0 | 0 |
| New Jersey | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| New Mexico | House of Representatives | 2 | 2 | 2 | 0 | 2 | 0 |
| New Mexico | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| New York | Assembly | 1 | 3 | 1 | 1 | 0 | 1 |
| New York | Senate | 0 | 3 | 1 | 1 | 0 | 0 |
| North Carolina | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| North Carolina | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| North Dakota | House of Representatives | 0 | 0 | 0 | 0 | 0 | 0 |
| North Dakota | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Ohio | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Ohio | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Oklahoma | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Oklahoma | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Oregon | House of Representatives | 1 | 3 | 1 | 1 | 0 | 1 |
| Oregon | Senate | 0 | 3 | 1 | 1 | 0 | 0 |
| Pennsylvania | House of Representatives | 3 | 9 | 3 | 3 | 3 | 0 |
| Pennsylvania | Senate | 0 | 9 | 3 | 0 | 0 | 0 |
| Rhode Island | House of Representatives | 2 | 6 | 2 | 2 | 2 | 0 |
| Rhode Island | Senate | 0 | 6 | 2 | 0 | 0 | 0 |
| South Carolina | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| South Carolina | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| South Dakota | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| South Dakota | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Tennessee | House of Representatives | 3 | 9 | 3 | 0 | 3 | 0 |
| Tennessee | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Texas | House of Representatives | 0 | 0 | 0 | 0 | 0 | 0 |
| Texas | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Utah | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Utah | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Vermont | House of Representatives | 1 | 3 | 1 | 1 | 0 | 1 |
| Vermont | Senate | 0 | 3 | 1 | 1 | 0 | 0 |
| Virginia | House of Delegates | 2 | 6 | 2 | 2 | 0 | 2 |
| Virginia | Senate | 0 | 6 | 2 | 2 | 0 | 0 |
| Washington | House of Representatives | 2 | 6 | 2 | 2 | 2 | 0 |
| Washington | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| West Virginia | House of Delegates | 3 | 9 | 3 | 0 | 3 | 0 |
| West Virginia | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Wisconsin | Assembly | 2 | 6 | 2 | 0 | 2 | 0 |
| Wisconsin | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Wyoming | House of Representatives | 2 | 6 | 2 | 0 | 2 | 0 |
| Wyoming | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Puerto Rico | House of Representatives | 0 | 0 | 0 | 0 | 0 | 0 |
| Puerto Rico | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| Guam | *No legislative pack* | — | — | — | — | — | — |
| U.S. Virgin Islands | *No legislative pack* | — | — | — | — | — | — |
| American Samoa | *No legislative pack* | — | — | — | — | — | — |
| Northern Mariana Islands | *No legislative pack* | — | — | — | — | — | — |
| United States | House of Representatives | 0 | 0 | 0 | 0 | 0 | 0 |
| United States | Senate | 0 | 0 | 0 | 0 | 0 | 0 |
| District of Columbia | Council | 5 | 0 | 0 | 10 | 0 | 4 |

The table’s `failed` and `enacted` values are bills attributed to their originating chamber; chamber actions are recorded where performed. The single-chamber Nebraska Legislature is listed under its actual unified institution. Federal House and Senate each filed zero bills. D.C. is reported through its Council, not as a state-level pack.

Representative outcomes from the saved bill records: D.C. B26-0011 (`legislative-measure_4ff62c1eefdab998`) passed the Council twice and became law without signature Mar. 17, effective Apr. 28; B26-0015 (`legislative-measure_3f1bc31b979e41b8`) passed the Council twice and was presented to the Mayor Apr. 27, still pending at cutoff. California AB 12 (`legislative-measure_698081622022ef68`) and Illinois HB 16 (`legislative-measure_83db18f3e16e86bd`) passed both chambers, were signed and enacted Apr. 17, effective Jan. 1, 2027; each record includes introduction, committee, floor, enrollment, presentation, signature and enactment dates. Those enactment records establish that laws pass after the opening President's term only if the presidency changes during this bounded span; this four-month run alone does not establish post-first-term persistence. The report records effective dates, but it does not record downstream law-effect application by Apr. 30 because those effective dates are in 2027; it makes no claim about an already-applied policy consequence.

Machine-readable report with per-bill IDs/actions/enactments and state/federal jurisdiction rows (the five D.C. bills use municipal jurisdiction `jurisdiction_7691c6e3ae48f824`): `/tmp/session53-all-due-first-session.json`.

## Session-end coverage required before acceptance

The regular-session calendar in `data/content/legislative-session-calendars.json` is explicitly a game-profile cadence, not a convening/adjournment record. The April 30 run therefore cannot establish that every state's own regular session ended. The 2026 source end-date data supports the following state-level source-date comparison. The Apr. 30 artifact does not serialize `sessionAdjournments`, so none of these source dates is claimed as a simulated session-end record reached by that run:

| State | 2026 regular-session end evidence |
| --- | --- |
| Alabama | 2026-04-09 (source date by cutoff; simulated adjournment record not captured) |
| Alaska | no recorded 2026 end in sessionEnds data |
| Arizona | 2026-06-13 (source date after cutoff) |
| Arkansas | 2026-04-29 (source date by cutoff; simulated adjournment record not captured) |
| California | no recorded 2026 end in sessionEnds data |
| Colorado | no recorded 2026 end in sessionEnds data |
| Connecticut | no recorded 2026 end in sessionEnds data |
| Delaware | no recorded 2026 end in sessionEnds data |
| Florida | 2026-03-13 (source date by cutoff; simulated adjournment record not captured) |
| Georgia | no recorded 2026 end in sessionEnds data |
| Hawaii | 2026-05-08 (source date after cutoff) |
| Idaho | 2026-04-02 (source date by cutoff; simulated adjournment record not captured) |
| Illinois | no recorded 2026 end in sessionEnds data |
| Indiana | no recorded 2026 end in sessionEnds data |
| Iowa | no recorded 2026 end in sessionEnds data |
| Kansas | 2026-04-10 (source date by cutoff; simulated adjournment record not captured) |
| Kentucky | 2026-04-15 (source date by cutoff; simulated adjournment record not captured) |
| Louisiana | no recorded 2026 end in sessionEnds data |
| Maine | 2026-04-29 (source date by cutoff; simulated adjournment record not captured) |
| Maryland | no recorded 2026 end in sessionEnds data |
| Massachusetts | no recorded 2026 end in sessionEnds data |
| Michigan | estimated date 2026-04-15; no recorded adjournment |
| Minnesota | no recorded 2026 end in sessionEnds data |
| Mississippi | no recorded 2026 end in sessionEnds data |
| Missouri | legal regular-session end limit 2026-05-30 (after cutoff) |
| Montana | no recorded 2026 end in sessionEnds data |
| Nebraska | 2026-04-17 (source date by cutoff; simulated adjournment record not captured) |
| Nevada | no recorded 2026 end in sessionEnds data |
| New Hampshire | no recorded 2026 end in sessionEnds data |
| New Jersey | no recorded 2026 end in sessionEnds data |
| New Mexico | 2026-02-19 (source date by cutoff; simulated adjournment record not captured) |
| New York | no recorded 2026 end in sessionEnds data |
| North Carolina | estimated date 2026-04-15; no recorded adjournment |
| North Dakota | no recorded 2026 end in sessionEnds data |
| Ohio | no recorded 2026 end in sessionEnds data |
| Oklahoma | 2026-05-14 (source date after cutoff) |
| Oregon | no recorded 2026 end in sessionEnds data |
| Pennsylvania | no recorded 2026 end in sessionEnds data |
| Rhode Island | no recorded 2026 end in sessionEnds data |
| South Carolina | no recorded 2026 end in sessionEnds data |
| South Dakota | no recorded 2026 end in sessionEnds data |
| Tennessee | no recorded 2026 end in sessionEnds data |
| Texas | no recorded 2026 end in sessionEnds data |
| Utah | 2026-03-06 (source date by cutoff; simulated adjournment record not captured) |
| Vermont | no recorded 2026 end in sessionEnds data |
| Virginia | no recorded 2026 end in sessionEnds data |
| Washington | 2026-03-12 (source date by cutoff; simulated adjournment record not captured) |
| West Virginia | no recorded 2026 end in sessionEnds data |
| Wisconsin | no recorded 2026 end in sessionEnds data |
| Wyoming | 2026-03-11 (source date by cutoff; simulated adjournment record not captured) |
| Puerto Rico | no recorded 2026 end in sessionEnds data |
| Guam | no recorded 2026 end in sessionEnds data |
| the U.S. Virgin Islands | no recorded 2026 end in sessionEnds data |
| American Samoa | legal session ends 2026-02-25 and 2026-08-26 (second session after cutoff) |
| the Northern Mariana Islands | no recorded 2026 end in sessionEnds data |

The source table has 2026 published adjournments for 15 states: 12 source dates by Apr. 30 and three later. The bounded-run artifact has no `sessionAdjournments` field, so the number of session-end records actually reached is unmeasured. It also has Missouri’s legal May 30 limit and American Samoa’s two 45-day legal sessions, with the second ending Aug. 26. Michigan and North Carolina have estimated Apr. 15 ends. Twenty-eight annual-session states have no finite end date in the current source table; four states have no 2026 regular session. Entries marked no recorded end are unverified for cutoff completion. Montana, Nevada, North Dakota, and Texas have no 2026 regular session under `regular-session-years.json`, so their next regular session is in 2027. American Samoa has two 2026 sessions ending Feb. 25 and Aug. 26; Apr. 30 covers only the first. Arizona (June 13), Hawaii (May 8), Missouri (May 30), and Oklahoma (May 14) end after Apr. 30. D.C. is a year-round Council, with no annual adjournment record; the federal Congress has no state-style session-end record in this coverage table; its Apr. 15 median date is an effective-date estimate, not a council session end. Puerto Rico, Guam, the Virgin Islands, and Northern Mariana Islands have no canonical legislative calendar/roster contract. The displayed Michigan, North Carolina and D.C. Apr. 15 dates are estimates, not recorded adjournments.

Thus the run is a useful all-due throughput result but not the CTO’s per-jurisdiction full-session acceptance. Four-year/annual wall-clock OOM is not treated as a b29 blocker; this is a source/session-end coverage gap. Continue bounded calendar work only against named recorded end dates, and route absent session-end/member-intake contracts to CTO rather than inventing dates or zero rows.

## Opening calendar follow-up: seed Congress intake through its existing writer

The regular opening paths now schedule the canonical Congress monthly intake row through `scheduleCongressIntake`, which the existing `congressIntakeHandler` consumes via `fileMemberAgendaBills`. It is the same producer as `applyCongressLawmaking` and does not depend on a daily clock advance to put the first filing date on the calendar. The async and synchronous opening paths both seed the existing state bill-season rows and D.C. Council sitting. Focused calendar/intake checks: 69 passed. The separate opening-life integration check did not pass in this checkout: after the new rows were scheduled, it failed its existing assertion that the opening Congress roster has more than 3,500 saved principle rows (observed 0); this remains a verification gap and no Congress passage count is claimed from it.

## Nationwide legislative-calendar-only compact run (diagnostic, not acceptance)

A separate narrower dispatcher selected only state bill-season rows, Congress/DC legislative rows, and due rows attached to legislative measures and their executive matters. It processed 1,254 selected rows through May 22, 2027 in 64 date batches (requested cutoff June 30, 2027) in 98.806 seconds. Its origin-chamber-only rollup was initially mistaken for per-chamber action counts; the count from its action log is 521 committee actions and 51 floor passage actions, with 154 filings, 140 failed, and 14 enacted. This is retained as a compact diagnostic only; it is **not** substituted for an all-due, per-jurisdiction session-end acceptance.

## Preserved broader failed run

Before the bounded session acceptance, a broad all-transition run was requested through Apr. 15, 2027 on the same source head and seed. It stopped at Sep. 11, 2026 after 194 date batches, 85 measures, 604 legislative actions, RSS 4,243,042,304 bytes, elapsed 718,229 ms; exit 134 with V8 heap OOM at about 770,843 ms (heap near 3.8 GB). It produced no final counts or processed-row counter. Full evidence remains at `/tmp/session53-nationwide-calendar-attempt-oom.txt`. That failed longer run remains preserved and was not restarted. The Apr. 30 result above is a completed bounded all-due traversal, not full-session acceptance. It resolves the original longer-run cost question for a four-month horizon, but it is not a substitute for reaching each jurisdiction’s own end date.

## Nationwide legislative-calendar-only compact diagnostic — not all-due acceptance.

This bounded rerun used the ordinary opening world and canonical registered transition handlers for state bill-season rows, Congress/DC intake and sitting, and due rows attached to filed legislative measures and their executive matters. Rows were dispatched by `(dueAt, sequence)` through the next due item, with no daily advance loop and no heap override. The earlier all-transition attempt remains preserved separately below. Per the latest scope correction, these results are a legislative-only diagnostic; they do **not** satisfy acceptance requiring ALL due rows in nationwide chronological order.

- Exact source HEAD: `598fa88c347a517493f20e153348442bd991b491` (candidate branch; not current main composition).
- Seed/place: `session53-nationwide-2026-2027`, observer place `session53-random-state` / key `2825740`; opening date Jan. 5, 2026.
- Requested cutoff: June 30, 2027; last eligible selected legislative due row: May 22, 2027; 64 date batches.
- Opening/setup: 5.812 s; full run: 98.806 s; default Node heap; no daily loop; 1,254 selected legislative due rows processed, 0 blocked, 0 selected legislative rows pending inside cutoff.
- Run produced 154 new measures and 888 total legislative action records. Recounting all bill action records by the chamber on each action (rather than attributing all passage actions to the filing chamber) yields 521 committee-stage actions, 51 floor-stage passages, 14 enacted, 140 terminal non-enactments, and 0 vetoes. “Filed” and terminal disposition are attributed to the bill’s originating chamber; committee/floor metrics are actions in the named chamber. 175 referral actions include bills that were referred in both chambers.
- This report contains all 50 state jurisdictions and federal Congress. Opening-roster diagnostics found no DC council due rows and no territory due rows. Puerto Rico resolves to a generic state legislature pack but had no opening due row; GU/VI/AS/MP have no legislative pack. Thus this run does not establish DC/territorial throughput; those missing institutions are reported as unmeasured, not zero throughput.

| Jurisdiction | Chamber | Filed (origin) | Committee actions | Floor passages | Failed (origin) | Enacted (origin) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Alabama | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Alabama | Senate | 0 | 0 | 0 | 0 | 0 |
| Alaska | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Alaska | Senate | 0 | 0 | 0 | 0 | 0 |
| Arizona | House of Representatives | 4 | 12 | 4 | 4 | 0 |
| Arizona | Senate | 0 | 12 | 0 | 0 | 0 |
| Arkansas | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Arkansas | Senate | 0 | 0 | 0 | 0 | 0 |
| California | Assembly | 1 | 3 | 1 | 0 | 1 |
| California | Senate | 0 | 3 | 1 | 0 | 0 |
| Colorado | House of Representatives | 2 | 3 | 1 | 2 | 0 |
| Colorado | Senate | 0 | 3 | 0 | 0 | 0 |
| Connecticut | House of Representatives | 1 | 3 | 1 | 0 | 1 |
| Connecticut | Senate | 0 | 3 | 1 | 0 | 0 |
| Delaware | House of Representatives | 2 | 3 | 1 | 2 | 0 |
| Delaware | Senate | 0 | 3 | 0 | 0 | 0 |
| Florida | House of Representatives | 1 | 3 | 0 | 1 | 0 |
| Florida | Senate | 0 | 0 | 0 | 0 | 0 |
| Georgia | House of Representatives | 2 | 6 | 0 | 2 | 0 |
| Georgia | Senate | 0 | 0 | 0 | 0 | 0 |
| Hawaii | House of Representatives | 2 | 6 | 2 | 0 | 2 |
| Hawaii | Senate | 0 | 6 | 2 | 0 | 0 |
| Idaho | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Idaho | Senate | 0 | 0 | 0 | 0 | 0 |
| Illinois | House of Representatives | 3 | 9 | 3 | 0 | 3 |
| Illinois | Senate | 0 | 9 | 3 | 0 | 0 |
| Indiana | House of Representatives | 6 | 18 | 0 | 6 | 0 |
| Indiana | Senate | 0 | 0 | 0 | 0 | 0 |
| Iowa | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Iowa | Senate | 0 | 0 | 0 | 0 | 0 |
| Kansas | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Kansas | Senate | 0 | 0 | 0 | 0 | 0 |
| Kentucky | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Kentucky | Senate | 0 | 0 | 0 | 0 | 0 |
| Louisiana | House of Representatives | 6 | 9 | 3 | 6 | 0 |
| Louisiana | Senate | 0 | 9 | 0 | 0 | 0 |
| Maine | House of Representatives | 6 | 18 | 0 | 6 | 0 |
| Maine | Senate | 0 | 0 | 0 | 0 | 0 |
| Maryland | House of Delegates | 2 | 3 | 1 | 2 | 0 |
| Maryland | Senate | 0 | 3 | 0 | 0 | 0 |
| Massachusetts | House of Representatives | 2 | 6 | 2 | 0 | 2 |
| Massachusetts | Senate | 0 | 6 | 2 | 0 | 0 |
| Michigan | House of Representatives | 2 | 6 | 0 | 2 | 0 |
| Michigan | Senate | 0 | 0 | 0 | 0 | 0 |
| Minnesota | House of Representatives | 2 | 6 | 0 | 2 | 0 |
| Minnesota | Senate | 0 | 0 | 0 | 0 | 0 |
| Mississippi | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Mississippi | Senate | 0 | 0 | 0 | 0 | 0 |
| Missouri | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Missouri | Senate | 0 | 0 | 0 | 0 | 0 |
| Montana | House of Representatives | 1 | 3 | 0 | 1 | 0 |
| Montana | Senate | 0 | 0 | 0 | 0 | 0 |
| Nebraska | Legislature | 4 | 12 | 0 | 4 | 0 |
| Nevada | Assembly | 2 | 6 | 2 | 2 | 0 |
| Nevada | Senate | 0 | 6 | 0 | 0 | 0 |
| New Hampshire | House of Representatives | 4 | 6 | 2 | 4 | 0 |
| New Hampshire | Senate | 0 | 6 | 0 | 0 | 0 |
| New Jersey | Assembly | 0 | 0 | 0 | 0 | 0 |
| New Jersey | Senate | 0 | 0 | 0 | 0 | 0 |
| New Mexico | House of Representatives | 2 | 2 | 0 | 2 | 0 |
| New Mexico | Senate | 0 | 0 | 0 | 0 | 0 |
| New York | Assembly | 1 | 3 | 1 | 0 | 1 |
| New York | Senate | 0 | 3 | 1 | 0 | 0 |
| North Carolina | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| North Carolina | Senate | 0 | 0 | 0 | 0 | 0 |
| North Dakota | House of Representatives | 2 | 6 | 0 | 2 | 0 |
| North Dakota | Senate | 0 | 0 | 0 | 0 | 0 |
| Ohio | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Ohio | Senate | 0 | 0 | 0 | 0 | 0 |
| Oklahoma | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| Oklahoma | Senate | 0 | 0 | 0 | 0 | 0 |
| Oregon | House of Representatives | 1 | 3 | 1 | 0 | 1 |
| Oregon | Senate | 0 | 3 | 1 | 0 | 0 |
| Pennsylvania | House of Representatives | 6 | 9 | 3 | 6 | 0 |
| Pennsylvania | Senate | 0 | 9 | 0 | 0 | 0 |
| Rhode Island | House of Representatives | 4 | 6 | 2 | 4 | 0 |
| Rhode Island | Senate | 0 | 6 | 0 | 0 | 0 |
| South Carolina | House of Representatives | 4 | 12 | 0 | 4 | 0 |
| South Carolina | Senate | 0 | 0 | 0 | 0 | 0 |
| South Dakota | House of Representatives | 4 | 9 | 0 | 4 | 0 |
| South Dakota | Senate | 0 | 0 | 0 | 0 | 0 |
| Tennessee | House of Representatives | 6 | 18 | 0 | 6 | 0 |
| Tennessee | Senate | 0 | 0 | 0 | 0 | 0 |
| Texas | House of Representatives | 2 | 6 | 2 | 2 | 0 |
| Texas | Senate | 0 | 6 | 0 | 0 | 0 |
| Utah | House of Representatives | 2 | 6 | 0 | 2 | 0 |
| Utah | Senate | 0 | 0 | 0 | 0 | 0 |
| Vermont | House of Representatives | 1 | 3 | 1 | 0 | 1 |
| Vermont | Senate | 0 | 3 | 1 | 0 | 0 |
| Virginia | House of Delegates | 2 | 6 | 2 | 0 | 2 |
| Virginia | Senate | 0 | 6 | 2 | 0 | 0 |
| Washington | House of Representatives | 2 | 6 | 2 | 2 | 0 |
| Washington | Senate | 0 | 0 | 0 | 0 | 0 |
| West Virginia | House of Delegates | 6 | 18 | 0 | 6 | 0 |
| West Virginia | Senate | 0 | 0 | 0 | 0 | 0 |
| Wisconsin | Assembly | 4 | 12 | 0 | 4 | 0 |
| Wisconsin | Senate | 0 | 0 | 0 | 0 | 0 |
| Wyoming | House of Representatives | 2 | 6 | 0 | 2 | 0 |
| Wyoming | Senate | 0 | 0 | 0 | 0 | 0 |
| United States | House of Representatives | 0 | 0 | 0 | 0 | 0 |
| United States | Senate | 0 | 0 | 0 | 0 | 0 |

For clarity, committee actions count every `referred`, `committee-hearing-held`, `committee-reported`, and `committee-not-reported` record in that chamber. Floor passages count every `floor-stage-passed` record there. A measure can therefore have activity in both chambers; failed/enacted are unique bills attributed once to the originating chamber. Federal House and Senate each had zero filed measures in this run. The five territory governments and D.C. are not listed with synthetic zero rows because their institutions were absent from the measured packs/queues.

Representative full paths in the saved report include California AB 12 (`legislative-measure_698081622022ef68`): filed Feb. 15, referred/heard/reported in both chambers, passed House Mar. 7 and Senate Mar. 30, signed Apr. 17, enacted Apr. 17, effective date Jan. 1, 2027; Illinois HB 16 (`legislative-measure_83db18f3e16e86bd`) followed the same two-chamber path and was enacted Apr. 17, effective Jan. 1, 2027. Action records establish the enactment and effective dates; this report does not include downstream law-effect application records, so it does not claim a specific resulting policy change.

Exact machine-readable per-bill/per-jurisdiction source output: `/tmp/session53-nationwide-legislature-acceptance.json`.

## Broad all-transition attempt (failed; not acceptance)

A first attempt drove every ordinary future-transition due item, including unrelated world systems, in chronological date order from Jan. 5, 2026 toward Apr. 15, 2027. Exact evidence: `/tmp/session53-nationwide-calendar-attempt-oom.txt`; source commit `598fa88c347a517493f20e153348442bd991b491`, seed `session53-nationwide-2026-2027`, no `--max-old-space-size` override, no daily advance/world-aging loop, requested cutoff Apr. 15, 2027. It stopped at Sep. 11, 2026 after 194 date batches, 85 measures, 604 legislative actions, RSS 4,243,042,304 bytes, elapsed 718,229 ms; process exit 134 with V8 OOM at about 770,843 ms (heap near 3.8 GB). It produced no final per-state counts or processed-due-row counter. This failed global run was preserved and not restarted. The narrower 98.806-second run above is only diagnostic and is not substituted for the all-due acceptance requirement.

The next acceptance needs a bounded owner-approved definition of “ALL due rows” whose required horizon completes one full regular session while keeping the designated calendar scope and memory bound. Current measured evidence shows why this cannot be inferred from either the stopped global attempt or the completed legislative-only diagnostic. No annual daily loop or larger heap was started.

## Corrected April 30 artifact and opening-principle follow-up

The instrumented all-due Apr. 30 artifact supersedes earlier row/wall-time summaries where they differ. Its exact source head is `3186f2d0c2add2182290b1b73686a7b65d453520`; it processed 2,353 (not 2,347) due rows in 77 date batches, had 0 unresolved due rows inside the bound, processed 90 measures and 642 legislative actions in 187.857 seconds. The per-jurisdiction state rollup is 85 filings, 338 committee actions, 114 referrals, 45 floor passages, 71 failed and 14 enacted. The machine bill list also records five D.C. Council bills B26-0011 through B26-0015: 10 floor passages, four enacted, and B26-0015 pending at cutoff. The D.C. bill jurisdiction ID is not joined to the jurisdiction summary row's institutional pack, so the summary's D.C. `pack: null` row must not be interpreted as zero Council activity. Congress House and Senate each filed zero measures during this earlier run. The artifact's actual `sessionAdjournments` array is empty; none is claimed as reached.

A separate post-`3186f2d` opening work-ledger repair at source head `d2f97bc10abf4337a5c5d43691d9a54e8d6ed6a7` is documented in `p1-opening-principles.md` and `p1-opening-principles.json`. It records current Congress public service through the canonical work writer before life-principle preparation and produces one actual dated Feb. 1 House filing, H.R. 6, 119th Congress, sponsor Emma Mendoza. That one-row diagnostic has no committee or floor outcomes and is not merged into the older Apr. 30 counts.

The existing integration assertion at `src/presentation/opening-life.test.ts:135` still expects more than 3,500 legacy `officeholder-principles/v1:` draw rows and observes zero. Sync and async source comparisons on exact base `f88508186b78f526ecf89a420b5fb584171e039a` both observed zero with 342 total saved rows; current canonical life writing uses `life-principles/v1:` and the assertion has not been altered. Candidate is not READY while that integration remains unresolved.
