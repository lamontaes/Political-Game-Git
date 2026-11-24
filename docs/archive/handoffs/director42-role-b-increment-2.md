# DIRECTOR42 ROLE B — increment 2: composed onto #255

Status: **READY FOR RECEIVING REVIEW — VALIDATION PENDING.**

## Source identity

LAND's ACK is correct as stated; nothing to correct.

|                                  |                                                                     |
| -------------------------------- | ------------------------------------------------------------------- |
| Role / session                   | ROLE B — DEHARDWIRE, `session_01WZB6HoCjRiQHuG7TA46wKV`             |
| Program / model / effort         | Claude Code, Opus 5, xhigh, implementation                          |
| Branch                           | `claude/director42-role-b-dehardwire-c3bgvv`                        |
| Previous head (RECEIVED by LAND) | `9f15de58c2b9f2c52765d127df53729949e52382`                          |
| Composed onto                    | `5ed9bbd01a4b52bd8e365b4c5831cf990f232571` (#255, as LAND named it) |
| New head                         | `a73da0d50eea005af16f2ab591bc3c8855b214cb`                          |
| Original base                    | `f22fd314e72bec0440044026ccdfd99e7a67600d` (still actual main)      |

Composed by merging `origin/claude/land-main` at that exact SHA. One file
conflicted, `src/presentation/legislation-world.ts`. It was **not** resolved by
transplanting the older version: the file was restored byte-for-byte from
5ed9bbd0 and the dehardwire delta re-expressed against it.

## Preserved from #255, verified

`resolveLegislativeAssignmentForMeasure`, the member/term/chamber checks,
`institution:<packId>` work keys, `readRecordedLegislativeSitting` and the
recorded-sitting notice, the seat-derived origin chamber, and the
supplied-measure and docket routes are all intact. #255's own
`legislative-institution-entry`, `legislative-authored-sitting`,
`legislative-routine-plan`, `legislative-commitment-standing` and
`legislative-bargaining-world` suites pass unchanged.

## What the composition surfaced

**#255's institutional route files every measure as `designation: "WORK 1"`.**
That is the HB 214 defect one layer out — one fixed bill identity for every
registered legislature, in every world. The `authoredDesignation` rename from
increment 1 caught it as a compile error the moment the two branches met.

An institution is not one bill, so its template now names none:
`authoredDesignation` is `null` there, and the content index titles such an
entry by what it is rather than inventing a designation. Both routes number
their measure through `nextMeasureDesignation`, from the chamber the bill is
actually filed in — **the seat's own chamber** where #255 established it, the
pack's default origin otherwise.

## Template compatibility — checked against the registry, and it failed

Checked by iterating `LEGISLATIVE_RULE_PACKS` rather than a list kept by hand.
**Nevada's lower chamber is an Assembly, and `designationPrefix` raised for
it** — filing there errored instead of numbering the bill. Nevada Assembly
Bills are AB, and the shared helper now says so, which fixes the
player-drafting route as well.

The existing assertion used `"assembly"` as its example of an _unknown_
chamber. That was true only while no registered pack had one. It now asserts
`AB` and keeps the unknown-chamber refusal on a key no legislature uses, so the
invariant is kept rather than weakened.

## The split LAND asked for: safe numbering, constrained selection

Drawing which written measure a session opens on left the deliberation sitting
describing a bill the world had not filed. The filed sections, the fiscal note
and its amounts, and the beneficiary and its place are all written about one
measure; a seed that drew a different one would have put a transit pilot's
sections under a school-crossing bill's name. That is the fabrication this wave
exists to remove, not a second seed's worth of variety — and it broke six
accepted bargaining tests, which is how it was found rather than shipped.

So the two are split:

- **A number is the jurisdiction's own fact and is drawn everywhere.** This is
  the actual dehardwire and it is unconditional.
- **Which measure is carried is a content dependency.** Where a legislature has
  an authored deliberation brief, the session opens on the measure that brief
  describes. A legislature without one still draws from its written measures.
- **The room fails closed if the two ever diverge** — as it already does for an
  institution with no brief. The office keeps every supported procedural action
  on the bill either way; only the deliberation room stands down, and it says
  which bill it has no brief for.

## The immediate endpoint, proven

`src/presentation/dehardwire-packet-coherence.test.ts` walks the ordinary
route — a life, a candidacy filed, the campaign played to a win, a seated term,
the office's bill, the floor — and then asserts that all of it describes the
same measure in the same institution:

1. the record's number, matching `^[A-Z]{2} \d+$`, from this world's numbering;
2. the conversation's subject facts, by measure id, designation and title;
3. the institution — the seat's rule pack is the measure's rule pack, and the
   room names the chamber the bill is before;
4. the filed sections, each recorded against this measure;
5. the fiscal note, recorded against this measure and naming it, with the
   amount the bill actually commits;
6. the beneficiary and its place, from the same authored measure as the
   sections;
7. the participants, each a person this world contains;
8. the supported outcomes offered on this measure.

Plus: **walking in and reading spends no game time**, and after a save and a
reopen it is still the same bill, the same number and the same people.

## Census, narrowed

The file-wide wildcard is gone from both the data and the tool: a new literal
in a file already listed cannot inherit an older one's clearance. All thirteen
cases are listed by exact literal — 13 legitimate data/label, **0 production
hardcode, 0 unclassified** across 458 runtime-reachable modules.

`dehardwire-authored-designation.test.ts` narrows the central claim from prose
to a check: nothing on the ordinary-play graph reads `authoredDesignation` at
all (the content index is a development surface and is not on that graph), and
repo-wide only the content index and the declaration site read it.

`docs/dehardwire/classification.json` now carries the Kentucky-pinned sitting
and the six fixture-named modules as **tracked exceptions**, with status and
owner, rather than leaving them implied.

## Checks actually run

| Check                                                      | Result                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| `npm run typecheck`                                        | pass                                                       |
| `npm run lint`                                             | pass                                                       |
| `npm run format`                                           | pass                                                       |
| `vitest run src/presentation src/content src/simulation`   | **259 files, 3282 tests pass**, 6 files / 19 tests skipped |
| `dehardwire-packet-coherence.test.ts` (new)                | 3 pass                                                     |
| `dehardwire-authored-designation.test.ts` (new)            | 3 pass                                                     |
| `dehardwire-measure-identity.test.ts`                      | 11 pass                                                    |
| `dehardwire-census.test.ts`                                | 5 pass                                                     |
| `node scripts/dehardwire-census.mjs`                       | exit 0                                                     |
| `playwright test tests/e2e/pr79f-production-floor.spec.ts` | **fails — and fails identically at 5ed9bbd0, see below**   |

**NOT RUN by this owner:** the repository gate as the project runs it, the rest
of the Playwright lane, `test:run-a/b/c`.

## One finding about #255 itself

`tests/e2e/pr79f-production-floor.spec.ts` — the browser journey through the
route a player opens — **times out waiting for `getByTestId('elsewhere-work')`**
at the very start, before any bill is reached. It is a navigation locator, not a
measure-identity assertion.

It was re-run **at 5ed9bbd0 in a separate worktree with none of this branch's
changes, and fails identically**. So the production-floor browser journey does
not currently pass on #255, and this delta neither causes nor fixes it. Under
MERGE-FIRST a stale browser locator is named and owned rather than treated as a
blocker — but LAND should know that #255's own browser evidence for that route
is currently red. **Owner: LAND / #255.**

Nothing was skipped, deleted, weakened or given a longer timeout.

## Residuals, with owners

1. **`pr79f-production-floor.spec.ts` navigation timeout on #255.** Present at
   5ed9bbd0 without this delta. _Owner: LAND / #255._
2. **Pre-existing unit and browser failures from increment 1** (historical
   git-range and prose-corpus checks; three docket/legislation browser
   timeouts). Present at f22fd31. _Owner: for LAND to assign._
3. **The authored sitting's cast and place are still Kentucky's.** The measure
   it is about is now the world's, and the packet is coherent or it stands
   down; widening it means a second authored sitting, not a deletion.
   Coordinate emitted text with ROLE C. _Owner: ROLE B._
4. **Six fixture-named modules on the ordinary-play runtime graph.** Pinned by
   test, individually uncleared. _Owner: ROLE B._

No people or art scope was touched. No `.tsx` player surface was edited in
either increment.

## Receiver action

**LAND: take `a73da0d5` as the successor-only delta onto the #255 composition;
its only interface facts for C and D are the `authoredDesignation` rename and
`fiscalNoteSummaryFor`.**
