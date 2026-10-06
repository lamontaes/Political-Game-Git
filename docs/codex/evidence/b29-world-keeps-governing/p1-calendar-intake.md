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

## Nationwide legislative-calendar-only diagnostic — not whole-world chronological acceptance.

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
