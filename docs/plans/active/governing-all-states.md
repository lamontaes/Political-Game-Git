# GOVERNING — all-fifty-state executive/legislative baseline and continuity

Owner: Claude (GOVERNING, PLAYTEST-PORK-01 section C and the retained GAMEPLAY
ROLE). Branch `claude/governing-all-states`, base `fed321f7`. LAND integrates.

## Increments

1. **Time** — one time command (`src/presentation/time-command.ts`) with a
   disclosed target, a quiet stretch capped at the next dated item, stale
   source refusal and receipts; a root World-change guard
   (`src/presentation/world-change-guard.ts`) so a change computed from an
   older World never replaces a newer one. StoryView and the corner Day/Week
   control use it.
2. **Campaign → office for all fifty governors** — per-state disposition
   registry; term rules (including weekday-relative starts) compiled into the
   rules resolver; an ordinary executive authority profile for states without
   an accepted pack, labelled as a game profile; filing uses the office's own
   cycle instead of a 28-day horizon; exact unsupported reasons.
3. **Institutional continuity** — Congress and state membership across term
   boundaries; pending successor, vacancy with cause and no-current-record kept
   distinct.
4. **Governing matters** — appointments, budget priorities, bills presented and
   implementation follow-through for the player and NPC offices; three-to-five
   item briefing projection for Your office.

## Rules

- Accepted facts, rejected matrices and authored game profiles stay separate.
- Missing law stays UNKNOWN; a versioned game profile is labelled as such.
- Old recorded victories are not rewritten; any recovery is an explicit,
  versioned option.

## Status (2026-09-16)

Delivered on the branch: increments 1, 2 and 3 (the Congress and governor
parts). Increment 4 (budget priorities and bills presented) is next.

### Game profiles to confirm (proposed values, versioned, labelled in play)

- `ocd-state-executive-game-profile/v1`: four-year governor terms, regular
  elections in the cycle containing 2026, general election on the Tuesday after
  the first Monday in November, term begins the first Monday of January.
- `ocd-governor-turnover-game-profile/v1`: candidate field closes 60 days before
  the election; incumbents step down after two recorded consecutive terms or at
  78; an eligible incumbent runs again 80% of the time.
- `ocd-congress-turnover-game-profile/v1`: incumbents return 85% (House) / 80%
  (Senate), retire at 82; an open seat stays with the prior party 75% of the time.

### Receiving map (filing checked with each state's test life on 2026-01-05)

| State | Calendar     | Next election → term               | Authority pack    | Legislative pack          | Filing today                                                                                                                                                                            | Unfinished |
| ----- | ------------ | ---------------------------------- | ----------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| AL    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| AK    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-ak-governor-v1 | us-ak-legislature-v1      | baseline route exercised                                                                                                                                                                | 2 items    |
| AZ    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| AR    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| CA    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| CO    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| CT    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| DE    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| FL    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| GA    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| HI    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| ID    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| IL    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-il-governor-v1 | us-il-general-assembly-v1 | baseline route exercised                                                                                                                                                                | 2 items    |
| IN    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| IA    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| KS    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| KY    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-ky-governor-v1 | us-ky-general-assembly-v1 | baseline route exercised                                                                                                                                                                | 2 items    |
| LA    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| ME    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| MD    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | us-md-general-assembly-v1 | baseline route exercised                                                                                                                                                                | 3 items    |
| MA    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| MI    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| MN    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-mn-governor-v1 | us-mn-legislature-v1      | REFUSED (unproved-sourced-qualification): Minn. Const. art. V, § 1 was observed in current source text on 2026-09-09; that later observation does not establish the rule on 2026-01-05. | 1 items    |
| MS    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| MO    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | us-mo-general-assembly-v1 | REFUSED (unproved-sourced-qualification): Mo. Const. art. IV, § 3 requires 15. The game does not record that about a character, so it neither grants nor refuses on it.                 | 2 items    |
| MT    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| NE    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-ne-governor-v1 | us-ne-legislature-v1      | REFUSED (unproved-sourced-qualification): Neb. Const. art. IV, § 2 was observed in current source text on 2026-09-09; that later observation does not establish the rule on 2026-01-05. | 1 items    |
| NV    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | us-nv-legislature-v1      | baseline route exercised                                                                                                                                                                | 3 items    |
| NH    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| NJ    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| NM    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| NY    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| NC    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| ND    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| OH    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | us-oh-general-assembly-v1 | REFUSED (unproved-sourced-qualification): Ohio Const. art. XV, § 4 requires true. The game does not record that about a character, so it neither grants nor refuses on it.              | 2 items    |
| OK    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| OR    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| PA    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| RI    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| SC    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| SD    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| TN    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| TX    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| UT    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| VT    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| VA    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| WA    | verified     | 2028-11-07 → 2029-01-10–2033-01-12 | —                 | —                         | baseline route exercised                                                                                                                                                                | 3 items    |
| WV    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| WI    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |
| WY    | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | —                 | —                         | baseline route exercised                                                                                                                                                                | 4 items    |

Refused states are UNFINISHED, not passed: each needs a way for the game to
record the named qualification (elector status, citizenship years) or a RULES
decision about how an unrecorded requirement is treated at filing. The governor
offices in those states still continue for non-player holders.

## CRUNCH46 section 07 — next increments (gap map read 2026-09-16)

What exists: legislative record types and writers (refer, hearing, committee
disposition, floor vote, transmit, concurrence, enrol, presentment, executive
action, override, enactment, adjournment death), bill drafting with typed
instruments, 79F bargaining (Kentucky HB 214 only), vote instructions, public
payment writer (`settlePublicResourcePayment`), Alaska transit route.

Gaps to close, in order:

1. P10: chamber/actor check on every legislative step (authored route too).
2. P11: continuing intake — several bills per session, not one pinned measure.
3. P12: session calendar with convening and adjournment; production
   `recordAdjournmentDeath`; no bill resumes after adjournment.
4. P09/NPC progress: committee, other-chamber and executive steps run on the
   canonical clock for NPC actors; governor "bill" matters bind to real
   `legislativeMeasures` where a legislature exists.
5. P06: committee assignment records made by the chamber's actual appointing
   authority; staff hiring at seating.
6. P08: sponsor/stage labels from real ownership.
7. Drafting: add grant, appropriation transfer, rate/exemption instruments;
   bind amounts to accounts.
8. Fiscal: appropriation, commitment, installment and outturn records over the
   existing payment writer; transit fleet/capacity record (G3 fixture numbers
   are test inputs only).
9. Oversight/casework records.
10. Peer asks: PRESS `recordOutsideMandatePublicPayment` + `canInstitutionAct`;
    CRISIS K3 succession consuming `crisisOfficeContinuityNotices`;
    CHANGE read access to fiscal records.

### Progress against that list (2026-09-17)

- Done: items 1–4 and 6 (legislative clock, step ownership, continuing
  intake, closed sessions, governor desk bound to real measures, sponsor line).
- Done: item 8 as `publicProgramRecords` (`governing/public-program.ts`):
  capacity, appropriation, commitment, installment and capacity outturn, with
  money moving only through the existing public account. The game profile
  `public-program/v1` gives a sitting governor, or a municipal mayor or
  manager, the power to commit an adopted appropriation. Nothing in
  production declares a program yet; a budget or ordinance route has to
  create them.
- Done: item 10.
  - PRESS: `recordOutsideMandatePublicPayment` and `canInstitutionAct`.
  - CRISIS: K3 `applyOfficeContinuityNotices` with a national succession
    record (amend. XXV §1).
  - CHANGE reads the program records, on its branch
    `claude/change-public-service`.
  - K3 production wiring (`applyCrisisOfficeContinuity` in the clock) waits
    until #271 and #266 are both on main; the CRISIS proof branch is
    `claude/crisis-governing-proof`.
- Open: items 5, 7 and 9, plus a player surface for program decisions.
- Blocked by design, with the missing rule named in play:
  - Senate appointments, governors' successors and the 3 U.S.C. §19 line.
  - The special-election interval is the labelled game profile
    `ocd-house-special-election-game-profile/v1`.

## Q47-006 — what the write path cost, and what was done (2026-09-17)

Measured on frozen #268 `e471a521` with C's harness and C's player-path
two-year before-state, under PERFORMANCE-CHECK.md. Counters and one CPU trace
are GOVERNING's; the timing arms are C's, because a repair should not be
scored by the lane that wrote it.

**Cause.** One 30-day click on a two-year save ran 52 full-world validations,
each scanning 4,421 records — 238,725 record visits — to execute 12 due items
and append 73 records. The trace put the cost in `validateHistoryIntegrity`
itself, then in existence checks that scanned all of history per record.
Begin is not implicated: `createNewGameWorld` is 43 ms and a fresh one-week
click is under a quarter of a second.

**Repaired** (`52d3d676`, `96d835f0`, `050ebda6`):

- contiguity proved with a seen-list instead of sorting every record per write;
- per-family ordering and stable-key proofs remembered by array identity, so a
  write re-proves only the families it changed;
- life and press existence checks indexed once a history is long enough for the
  index to pay for itself, and scanning below that;
- the due resolver listing the schedule once rather than per resolved item, and
  comparing record references instead of serializing both due prefixes.

**Rejected: proving each record once.** A per-record memo would have been the
larger win, and it is unsound here. Seventeen of the twenty-two validated life
families read state that can change without the record changing —
`world.currentDate`, `world.people` and a person's birth date,
`world.jurisdictions`. "A record that passed cannot stop passing" holds for
references into append-only history and not for those, so a memo keyed on the
record would skip a check whose answer had moved. The five clean families are
not where the cost is. Recorded here because it is the reason the second lever
is not available on these terms.

**Still open.** The evolved quarter-year click remains tens of seconds. The
remaining candidate is validating once at the boundary of a composite command
rather than at every nested transition; that changes when the integrity
contract fires, so it is a LIVE QUESTIONS item and not an implementation
decision.

## D1 — an office's positions, and who sits on its committees

Two shortcuts closed. Both are written and typecheck; neither is tested yet, so
neither is claimed as working. (Host was held for A's browser verification.)

**Staff at seating.** An office's positions are now authorized when the office
is seated, whether or not anybody is hired into them. Three positions, each one
the game can exercise — chief of staff, legislative director, constituent
services — because a staffing table longer than the game can use would be
decoration.

The first attempt put these in the civil personnel domain's own position
family, and its integrity rule refused every one of them: "must be an authored
position of an authored state agency." That rule is correct and the reuse was
the error. A probe confirmed it from the data rather than from reading —
`us-ky-governor` has `provenance=generated` and classification
`service:us-ky-governor`, so it is neither authored nor an agency. That family
models authored civil-service scenarios; it is not a nationwide generated
staffing substrate. Loosening `charterable` to admit a generated office would
have weakened a contract that is doing its job, so governing keeps its own
records — `officeStaffPositions` and `officeStaffIncumbencies` — and still
reads the personnel domain's boundary for the one fact it does establish.

Worth recording separately: the failure was only visible because the tests ran.
The design typechecked, read plausibly, and was wrong.

What is sourced and what is not is kept apart in the record itself. WHICH
positions an office has is `governing-office-staffing/v1`, an authored profile,
and every position's basis note says so. The civil-service CLASS comes from
`executiveOfficeStaffBoundary`, which is compiled for Minnesota (unclassified)
and Alaska (exempt) and for nowhere else; elsewhere the class is recorded
`unknown` with the reason, not guessed. Neither compiled boundary establishes
bargaining or agreement coverage, so both stay `unknown` rather than being
inferred from the class.

This is also what CHANGE's education reconnect needs: an authorized position
nobody holds is a real opening, readable through `openOfficePositions`, and it
exists because an office was seated rather than because a job was invented for
somebody who finished a course.

**Committee rosters.** `committeeMembers(body, size)` returned
`body.members.slice(0, size)`. That put the same handful of members on every
committee of a chamber, and it could never seat anybody far down the list — a
player joining a body is appended to it, so a player was on no committee
however many committees existed. Replaced by
`governing-committee-assignment/v1`: committees are dealt from a seeded
ordering of the chamber so everybody serves before anybody serves twice, a
committee larger than its chamber seats the chamber once, and the roster is a
pure function of facts already recorded (the seated body, the compiled
committee list and its compiled size). It stores nothing, so it cannot drift
from a save, and `committeesForPerson` answers what the player sits on.

A second thing the probe settled: `currentGoverningOffices` returns only the
governorships a World has MATERIALIZED, which at opening is one. A test that
wanted Minnesota and Alaska offices could not have them. The class reading is a
pure function of the state code and the date, so it is asked about a state
rather than about an office, and needs no office to exist.

**Still open in D1.** Casework against the constituent-services position, and
bargaining beyond HB214.

**The MN/MO/NE/OH filing item, stated precisely.** Traced rather than left
vague. Qualification facts ARE compiled for Minnesota, Missouri, Nebraska,
Nevada and Ohio — 63 office facts promoted only where the cited first-party
provision was acquired, hashed and found to contain the transcribed words. What
is not compiled for any of them is FILING, and `candidacy-packs.ts` says why in
the rule itself: "The qualification source establishes who may serve, not a
filing deadline or filing authority." So a player in those states can be told
who may serve and not how to stand.

Two things follow, and the second changes the item's size:

- No accepted source in the repository states a filing deadline, filing
  officer, primary, nomination or ballot-access procedure for ANY office. This
  is an acquisition task — reading and hashing first-party provisions — not a
  coding task, and nothing may be written toward it that guesses.
- It is NOT a blocked path. `filing` is display-only: no consumer in
  `candidacy.ts` gates on it, so an unknown filing rule does not stop a player
  filing. The dead end is informational, not mechanical.

That makes it lower priority than it read as, and it makes the honest fix
acquisition rather than code. Recorded so nobody later reads "filing dead end"
as a bug in the campaign path.

## Q47-006 — where the remaining cost actually is

C's per-family profile (one 30-day click, player-path before-state, repaired
tree) localised it. Per click: 1,924 family passes, 1,353 proofs reused, 22,499
records walked to append 68 — and events alone is 18,468 of that 22,499, 82% of
all walking. Decision trace and publication are another 16% between them. Every
other family reuses its memoized proof on 50 or 51 of its 52 passes and walks
nothing, so the array-identity repair is doing what it was built to do. Events
keeps re-walking because events change on nearly every write, which is exactly
the case an identity memo cannot help.

Read the WALKED column, not the share column: C flagged that their own
instrument reports 12.1% for a family that walked zero records and reused zero
proofs, which is timing noise on an empty array. Walked is a count.

**An events suffix proof is sound. Prove-once was not. The difference is
direction, not immutability.**

Prove-once failed because seventeen of twenty-two life families read state that
can move in BOTH directions — a later-recorded death, a changed birth date — so
a record that had passed could genuinely start failing, and a memo keyed on the
record would skip a check whose answer had moved.

Every read in the events pass is monotone in the SAFE direction:

- `occurredAt > recordedAt` — frozen fields of an immutable appended record;
- `recordedAt > world.currentDate` throws, and currentDate only increases, so
  an event that passed cannot start failing. The mutable read is real; its
  direction is harmless;
- `world.jurisdictions[...]` and `world.people[...]` — existence only, and both
  maps are written by spread-and-add with no delete anywhere;
- the nineteen `*EntityExists` checks — append-only history, so once true,
  always true;
- `*AvailableAt(world, id, event.occurredAt, event.sequence)` — the one
  expected to break it, and it does not. `resource-integrity.ts:75` is true iff
  some record with that id has `date <= date` and `sequence <
historySequenceExclusive`; both coordinates come from the event and are
  frozen, and the record found is immutable, so no later append can narrow it;
- `validateEventContext` — jurisdiction existence plus string checks on frozen
  fields.

**The precondition is load-bearing and must not be left as prose.** This
soundness is a property of the checks as they stand, not of the design. One
non-monotone check added to that loop later makes a suffix proof silently
wrong, with no test failing. Any implementation carries that guard as part of
the work.

**Not built.** This is not boundary validation — it changes how one family
proves itself between two writes, not when validation fires — but it is write
path performance work during LAND's hold, so it waits on their ruling rather
than on my reading of it.

**The 45-minute CI timeout is not evidence about this.** C measured the import
question: generated data is cheap (the four largest generated modules are
214–582ms), and the cost is TypeScript transformation of a large module graph —
a bare vitest file imports in 12ms against 3.85s for the simulation barrel, of
which 3.19s is transform. Nothing in the write path can reach it.

## What went wrong with checking, and the rule that came out of it

Five failures in one session, all the same species: a check that reported
success about something it was not looking at, believed because it was green.

1. `npx tsc --noEmit -p tsconfig.json` run about eight times and reported as
   evidence to three lanes. `tsconfig.json` here is a solution file —
   `{"files": [], "references": [...]}` — so without `--build` it typechecks
   ZERO files and exits 0. Not a weak check; no check. It shipped two type
   errors (`EntityKind` had no member for either new office-staff kind).
2. Vitest green treated as covering types. 1,294 passing tests do not
   typecheck anything.
3. `tsc -p tsconfig.app.json` reported as "both SHAs typecheck". True, and
   useless: the app project EXCLUDES test files, so it was aimed away from the
   file that had just been written. The real gate caught a branded-`EntityId`
   error in `events-suffix-proof.test.ts`.
4. A memo design that typechecked and read well and was unsound — a proved
   prefix LENGTH trusted by position. Its own test killed it.
5. A confident correction of another lane's measurement, not reproduced on
   their head. The `.test.tsx` glob reading was right; the count difference was
   never extensions, it was two different trees.

**Which directory a file sits in decided whether tonight's bug was found.**
`events-suffix-proof.test.ts` is in `src/simulation`, which the node project
covers, so the gate caught it. The identical file in `src/presentation` — 241
test files no project covers on the receiver head — would have passed silently,
and a test written to protect the repair would have been sitting inside a file
nothing typechecks.

**Rules adopted.**

- Name the project. Never say "it typechecks" without saying which config, and
  prefer `npm run typecheck`, which is the gate.
- Cite the symbol AND the head. A line number is true in one workspace; so is a
  COUNT. 230 and 268 were both correct measurements of different trees, and
  three messages went into debugging compiler semantics that were never in
  dispute. A SHA beside each number would have dissolved it on sight. This
  applies to record counts, timings and test totals, not only file counts.
- Measure before correcting somebody else's measurement, on their head.
- Attach the falsifier. A confident claim with the command that would settle it
  is a different object from a confident claim: it invites the check instead of
  closing it off. That is why the count disagreement resolved in ten seconds.

The single failure mode behind all five is reasoning where measuring was
available. The costume changes every time; what separates a cheap instance from
an expensive one is not care, it is whether somebody looked before anybody
acted.

## "Bargaining beyond HB214", stated precisely

Traced rather than left as a slogan, the way the filing item was.

The bargaining MACHINERY is already general. `legislative-politics.ts` carries
filed provisions and revisions, commitments with conditions, obligations and
standing assessment, and recorded negotiations with exchange character — none
of it tied to one bill. `legislative-bargaining-world.ts` builds its facts from
whatever measure the world filed (`measure.designation`, `measure.shortTitle`),
not from a bank.

The gate is content, and it is one line:
`bargainingBriefSupports(scenarioKey)` is `scenarioKey === "kentucky"`.

But read the condition it sits in:

```
if (docketKey === null && !bargainingBriefSupports(scenarioKey))
```

A DOCKET bill — one the player drafted and saved — bypasses the brief entirely,
because it carries its own content and the sitting is about whichever bill that
is. So a player's own bill can already be bargained in any compiled rule-pack
legislature. What is Kentucky-only is bargaining over the AUTHORED SCENARIO
bill, because an authored deliberation brief exists for exactly one of them.

**So this is not primarily an engineering item, and treating it as one would
produce the wrong work.** Generalising it means authoring a deliberation brief
per legislature — filed sections, beneficiaries, fiscal exposure, the analyst
and advocate and guardian positions. That is gameplay content authoring at
49x, and it is the kind of content that must not be improvised: a brief is
authored game material about an authored game bill, so it is legitimate to
write, but writing forty-nine of them is not a repair and should not be
smuggled in as one.

A separate and smaller tier: scenario keys beginning `institution:` refuse with
"no supplied deliberation brief or recorded member decisions for this bill",
and say that the institution's supported procedural actions remain available in
the office. That refusal is accurate and leaves the player somewhere to go.

**What is worth doing here, if anything, is the docket path.** It already
generalises, which means the reachable improvement is making sure a player who
drafts their own bill in a non-Kentucky legislature actually finds that route,
rather than authoring briefs. Not started, and not assumed to be needed —
recorded so the next person does not read "bargaining beyond HB214" as an
engineering gap and start writing the wrong thing.

## Deferred to after the candidate: the office record contradicts the roster

Named in LAND's receipt as "office record says 'not appointed' for a member the
roster seats". Under the freeze because it changes player-facing copy; it lands
as its own change with its own verification once the candidate publishes.

`fdca58fb` gave every chamber's committees a deterministic roster, and
`committeesForPerson` answers which ones a given member sits on. But
`legislative-office-context.ts` still tells a seated member:

> You have not been appointed to a committee. Sponsoring a bill does not put
> you on the one that hears it.

For a member the roster seats, that sentence is false. The record and the
roster disagree, and the record is the one the player reads. The second half of
it stays true and worth keeping — sponsoring a bill really does not put you on
the committee that hears it — so this is a wiring job, not a rewrite: read
`committeesForPerson` and say which committees the member actually sits on,
keeping the "unavailable" branch for a chamber whose committees are not
compiled.

Worth noting how it surfaced: not from the roster work, and not from a review.
`legislation-docket` asserted old database wording, B attributed the copy
change, and only then did the contradiction between two things I had written
myself become visible. The committee rosters and the office record were both
mine and neither knew about the other.

## What is still open in D1

- The committee-roster wiring above.
- Casework against the constituent-services position authorized at seating.
- The MN/MO/NE/OH filing facts, which need acquired law rather than code, and
  are informational rather than a blocked path.
