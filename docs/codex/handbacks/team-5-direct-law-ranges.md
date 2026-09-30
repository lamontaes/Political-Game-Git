# Estimated teacher floors and tuition growth now vary by world and state

The teacher-pay and tuition modules now use stable draws within their existing
research ranges. Three public teachers received higher recorded pay in the
watched test. Tuition still reaches state budget receipts; no individual
student charge is demonstrated. Fairness remains held because its point
estimate has no verified research range.

## MERGED

None. This candidate is a draft gap repair, not merge approval. Prior law
research and facility traces remain on their own branches and pull requests.

## WHAT EMERGED

HARDWIRED: an estimated teacher floor constrains job-pay terms through the
existing payday writer. Three teachers' recurring terms and payments changed
in the watched test. This is not a teacher or lawmaker's new decision model.
Evidence: `src/simulation/living-world/town-pay.ts:teacherSalaryFloorAt` call.

HARDWIRED: a tuition freeze changes the state's charges-and-fees receipts
through its existing budget reader. No person feels an individual tuition
charge change yet in this chain. The budget can affect a governor's existing
law-money reaction; no governor was seated in this partial test fixture.
Evidence: `src/simulation/public-budgets/month.ts:decideLawMoneyReaction`.

Wider effects: the school graduation link and other aggregate measures are
unchanged. Teacher contract/licensure tiers, exact sponsor-written floor terms,
student bills, and federal employment protections remain separate gaps.

## VITAL STATISTICS

Nine tests passed across three changed test files. The watched teacher test
checked law start/repeal reads across all fifty-six jurisdictions; fifty-four
had a measured wage and two had none. Its payment example contained three
public teachers and zero private teachers. Zero new effects-map links or
canonical record types were added.

## 1. Why-chain

Teacher floor: an enacted yes answer reaches the existing operative-law reader.
The first school year starts on July 1. The floor uses the state median wage
times a stable world/state ratio. Existing paydays raise below-floor public
school job terms and record payments and paycheck knowledge. The chain bottoms
out in an estimated legal constraint on recorded pay, not an actor outcome draw.
Evidence: `src/simulation/teacher-salary-floor.ts:teacherSalaryFloorAt`.

Tuition: operative laws are read on each July 1; frozen school years accumulate.
The state's measured tuition share and stable growth draw reduce charges and
fees. Repeal stops adding frozen years and does not charge past years back.
The chain bottoms out in modeled state receipts. No person feels a student
charge change yet. Evidence: `src/simulation/public-budgets/tuition-freeze.ts:tuitionFreezeFactor`.

The existing draw helper uses the world seed, link key and canonical state
jurisdiction. Repeated reads and save reloads reproduce its value; they do not
advance a mutable generator or append a fact. Seedless fixtures retain the
central estimate. All towns in one state share the teacher ratio.
Evidence: `src/simulation/outcome-web/index.ts:drawnLinkSize`.

## 2. Research

Teacher ratio uses the existing 0.67–0.95 spread. Read-only production wage
lookups reproduced the five source denominators and ratios: Arkansas $52,700
and 0.94877; New Mexico $74,550 and 0.67069; Iowa $60,580 and 0.82535;
Tennessee $59,980 and 0.83361; Maryland $77,680 and 0.77240. The median is
BLS May 2025 elementary-teacher pay, SOC 25-2021, all ownerships; it is not a
public-only wage sample. The original module comment now states that scope.

Primary official reads, all HTTP 200:

- [Arkansas Act 237](https://arkleg.state.ar.us/Home/FTPDocument?path=%2FACTS%2F2023R%2FPublic%2FACT237.pdf)
  requires a $50,000 classroom-teacher base schedule with education and
  experience increments.
- [New Mexico enacted SB 1](https://www.nmlegis.gov/Sessions/22%20Regular/final/SB0001.pdf)
  sets level-one $50,000, level-two $60,000 and level-three-A $70,000 for
  standard nine-and-one-half-month contracts, with additional pay for specified
  extended teaching time. Subsequent amendment status was not independently read.
- [Iowa Code 284.15](https://www.legis.iowa.gov/docs/code/284.15.pdf)
  sets $50,000 from the fiscal year beginning July 1, 2025, and $62,000 for
  specified teachers with twelve years' experience, with a returned-retiree exception.
- [Tennessee Public Chapter 437](https://publications.tnsosfiles.com/acts/113/pub/pc0437.pdf)
  sets $42,000 for the 2023–2024 school year, $44,500 for 2024–2025, $47,000
  for 2025–2026 and $50,000 for 2026–2027. The prior starting-law citation
  points to the filed bill, which contains only a publication requirement;
  the official bill history supplied this enacted chapter. That shared data
  citation remains a separate repair claim.
- [Maryland Education 6-1009](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=ged&section=6-1009&enactments=false)
  sets a $60,000 minimum from July 1, 2026 and separately names career-ladder
  increases and state/county sharing.

These primary terms support the existing ratio's cross-state basis. They are
not permission to randomize exact real statutory amounts. This repair changes
only the generic estimated floor used for a yes law enacted in play; it does
not rewrite starting laws or claim to implement every tier and contract term.

Tuition workbooks matched their recorded source hashes. Read-only export
functions reproduced national nominal annual gross tuition revenue per net
full-time student, fiscal 2015–2025: 3.10333%. Fifty-state quartiles are
2.66983% and 4.13486%, matching the stored 2.67%–4.13% range after rounding.
This is a revenue-per-student estimate, not a causal estimate of posted tuition.
Source: `data/research/money/state-tuition-revenue.json`.

Fairness's 2.7% point estimate remains unchanged. Its primary paper attempt
returned HTTP 403 and no researched wage interval is available in the source
data examined. Poverty-zero links do not bound wage effects. No endpoints
were invented; Team 9 breadth remains a dependency.

## 3. Revisions

CTO's direct-module draw instruction is applied through the existing helper,
without editing the helper, shared types, fiscal writers or effects map.
Canonical state identity prevents differing legal floors among the same state's
towns. Starting law, effective dates, no-law behavior, minimum-wage protection,
and repeal behavior retain their existing readers.

Authority gaps remain: unknown power is not researched permission. This bounded
repair does not fix the shared authority reader or expand any level's reach.
Territory organic-act and township powers need the assigned primary research.
Missing wage or tuition source coverage remains missing; no rate is invented.

## 4. Numbered parts

1. Teacher module: draw the estimated state ratio inside 0.67–0.95 and use it
   for the existing floor. Test same-state consistency, bounds, reload and seed variation.
2. Tuition module: draw nominal growth inside 2.67%–4.13% and use it for the
   existing receipt reduction. Test stable draws and actual budget/repeal arithmetic.
3. Update the existing watched teacher-pay test to the drawn floor; retain
   checks of payments, terms, dates and paycheck knowledge.
4. Held: fairness range, sponsor-written numeric floor terms, tier/contract
   fidelity, authority catalog repair and individual student charges.

### Six-line trace: raise-teacher-minimum-salary

Owner: Team 5. Source head and candidate route are pinned in the proof section
and exact-head pull request description. Status: **fixed tonight in candidate**
for the direct estimated ratio; **needs research** for full law effects.

1. Enactment: the existing law reader supplies a yes answer; the teacher-floor
   reader applies the drawn state ratio from the first operative July 1.
2. Effects: public-school pay terms use 0.67–0.95 of the state median. The
   unchanged provisional graduation link is +0.25%, range +0.1%–+0.5%, after
   twenty-four months. Two paths are counted in the catalog inventory; pay
   reached three people here, graduation has no person-level reader demonstrated.
3. Authority: this state question retains its existing reach. Federal rights,
   local powers, territory organic acts and township powers need separate
   evidence. Repeal ends future floor application; it does not cut saved pay.
4. Terminal: estimated legal pay constraint followed by recorded transfers.
   For the aggregate graduation effect, no person feels this yet.
5. Gap/fix: the midpoint became a stable world/state draw. Exact enacted terms,
   salary tiers and the graduation intervention remain separate research gaps.
6. Proof: Appomattox's three named teachers reached $2,240 per paycheck; dates,
   superseded terms, transfers and exposure were asserted. Team 2 proof NOT RUN.

### Six-line trace: freeze-public-tuition

Owner: Team 5. Status: **fixed tonight in candidate** for the direct growth
parameter; **needs research** for full law effects and person-level tuition.

1. Enactment: the existing law reader counts school years frozen on July 1;
   the budget reader uses the stable world/state nominal growth parameter.
2. Effects: state receipts forgo drawn growth of 2.67%–4.13% on the measured
   tuition share. One direct budget path is counted. The unchanged college
   completion link is zero with zero delay, citing Deming and Walters; that
   encoded inert claim was not independently reverified in this repair.
3. Authority: the existing state budget reach remains. No federal/local/territory
   power is added. Repeal stops further frozen years and retains earlier gaps.
4. Terminal: modeled state budget receipts. No person feels an individual
   student charge change yet; a zero completion link is not blanket inertness.
5. Gap/fix: the universal growth midpoint became a stable researched draw.
   Individual student terms and full authority/repeal research remain gaps.
6. Proof: seeded partial-budget settlement verifies charges, other receipts
   and repeal arithmetic. No student or governor example; Team 2 proof NOT RUN.

## 5. Simulated, records, world pieces, checks

SIMULATED: existing paydays and state budget settlement; no new actor decision.
RECORDS: existing recurring pay terms, transfers, law exposure and budgets.
WORLD PIECES: schools, work roles, state identity, medians and law history exist.
Missing licensure/contract and student-charge readers remain visible gaps.
CHECKS: research spreads constrain world parameters; they never select an actor.
NONE CASE: absent law changes no pay/tuition; absent measured source does not
mean zero. Seedless fixtures use the central parameter rather than inventing a seed.

Connections: existing teacher-pay writer and budget receipt reader only.
Team 3 owns household birth decisions; Team 8 owns the story resolver. Team 5
agreed to its exported contract on the proposal conversation and claimed only
the new player-options adapter/test and narrowly mapped existing meeting reads.
No story or PlayerGame source was edited here.

## 6. Proof run

Measured on branch `codex/team-5-direct-law-ranges`, based on exact main
`54930d427555034f3a92f335064586247985784d`.

Actual: watched teacher file 2/2 PASS, 22.73 seconds, with console interception
disabled to preserve names and amounts. Focused draw/tuition files 7/7 PASS,
11.92 seconds. Tests had two workers, a 120-second bound and storage reservation.
Initial test startup hit environment Git subprocess EPERM; supported permission
route ran assertions. Initial new empty-place query and incomplete tuition
fixture failed; corrected the query and added the fixture's missing event list.

Production-root strict typecheck: zero diagnostics. Including changed tests
finds two existing teacher-test type errors, reproduced identically with its
exact main source: partial FutureDueItem cast and broad cadence-key indexing.
No suppression or production-type weakening added. Scoped lint, format and
whitespace PASS. Release check reports the inherited wave1-playtest-copy missing
header. Zero-dice reports zero new/three stale allowances, matching prior main.
Spelling reports only four unchanged quoted British examples in the existing
plain-american-wording release note. The first spelling attempt hit the same
environment Git subprocess EPERM; the supported route completed the scan.

Before publication, main advanced to
`2855854ca3537a1eacf5e1dd7591e593154c31bd`. Its diff contains none of this
candidate's seven owned paths. Publication uses that newer main as parent;
the source tested above is preserved, with no shared writer edits.

The required speed command was attempted and reports missing speed:years script;
no year timing or 120% comparison is certified. Browser, full suite and Team 2
independent money proof NOT RUN. No new link added; merge remains with Merge
after exact approval and gate disposition.

## 7. Worked example

Appomattox, Virginia, locality 5102072, seed build20-teacher-floor-0835: median
$65,550; drawn ratio 88.8%; annual floor $58,231. The enacted law took effect
February 19, 2026 and first reached the school year beginning July 1, 2026.

The test's existing payday writer recorded new terms from July 4, 2026.
Jennifer Conway's paycheck changed from $1,892.00 to $2,240.00; Alex Lewis's
from $1,916.80 to $2,240.00; Nadia Richmond's from $1,928.80 to $2,240.00.
Assertions verified superseded terms, transferred amounts and paycheck law
exposures. No private teacher was present in this payment example, so it does
not establish private-school exclusion by an observed paycheck.

Next bounded step: obtain the missing fairness interval and central ownership
for its provenance consumer; keep its rate fixed until research supports a draw.
Story integration waits only on the exact exported API/hunk mapping.
