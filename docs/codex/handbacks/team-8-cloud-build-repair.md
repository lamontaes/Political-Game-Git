# The cloud build accepts the existing furniture clipping data

The standard build now completes with the existing scene renderer. Its people
placement type omitted a field already returned by the producer. The simulation
boundary check now resolves local names, so a date range named window passes
while browser global references still fail. No game behavior changed.

## MERGED

Not merged. Only Merge may integrate after exact-head CTO approval.
This repair starts from current main
`54930d427555034f3a92f335064586247985784d` on
`codex/team-8-cloud-build-repair`. The inherited English handoff remains
preserved on `codex/team-8-english-engine` at
`1864116231b4ec069c14c8fd333ccd53025387a8`; PR #1169 is verified merged.

## 1. Why-chain

HARDWIRED: the baseline standard build stops at two TS2339 errors in
`src/player/PlacePeopleLayer.tsx:48` and line 55. Both read
`clipBandEndPercent` from `BackdropPerson`. The producer spreads `spotFigure`
into each placed person, and `SpotFigure` already declares and returns that
field. The chain bottoms out in an omitted interface field, not missing
world data. Adding the required nullable field restores the producer/consumer
contract without a cast, suppression, weakened type, or rendering change.

HARDWIRED: the baseline boundary test rejects `future-transitions.ts` for its
local `for (const window ...)` variable. Its regex treated any matching token
as a browser API. The chain bottoms out in detection that ignored scope.
The replacement uses TypeScript's lexical name resolver without browser
libraries. Local declarations and ordinary property names pass; unbound
browser names, qualified globalThis access, computed properties, shorthand
references, and template expression access remain checked.

## 2. Research

No empirical rate applies to this development repair. Evidence is the
executed main build, failing boundary test, producer field, consumer reads,
and lexical-scope regression cases. No player-facing prose was authored.

## 3. Revisions

CTO 3:20, routed by the coordinator, takes priority over Team 8's story-engine
work. The repair touches the existing type declaration and one test file.
No file owned by another team's execution lane was changed beyond the exact
source hunk authorized for this repair.

## 4. Numbered parts and exact claims

1. Add `clipBandEndPercent: number | null` to `BackdropPerson` in
   `src/presentation/backdrop-people.ts`.
2. Replace browser-token detection and add regression cases in
   `src/simulation/boundary.test.ts`. The original production-module test,
   forbidden-import check, and ambient-entropy check remain.
3. Declare development-only impact in
   `docs/release/changes/cloud-build-and-boundary-repair.md` and record this
   handback. The coordinator's central claims file is untouched.

## 5. Simulated, records, world pieces, checks

SIMULATED: no actor behavior or effects link changed.
RECORDS: no history, knowledge, IDs, save format, or money writes changed.
WORLD PIECES: the nullable furniture band already existed in producer output;
absence remains null. No place, person, furnishing, or geometry was invented.
CHECKS: baseline standard build failed with the two exact errors; baseline
boundary test failed on the local loop variable. Candidate standard build
passed. Final boundary tests passed 5/5 in 2.83 seconds, maxWorkers 2.
Scoped ESLint, formatting, and whitespace checks passed. The separate standard
typecheck passed with exit 0 after the final boundary changes.

## 6. Proof run

The standard build and changed boundary test are the applicable proof for
this repair. Browser play, random-place runs, speed runs, and full suites
were NOT RUN; no player route or simulation behavior changed.

## 7. Worked example

The same `BackdropPerson` now exposes the producer's existing nullable band
to both renderer reads. A local `window` date range is accepted. An unbound
`window.location`, `globalThis.window`, `globalThis["localStorage"]`, or
`${document.title}` inside a template still fails the boundary check.
No named actor outcome or dollar transfer is claimed.

## VITAL STATISTICS and delivery

Before: standard build exited 2; original boundary test exited 1.
After: standard build exited 0; final changed-file tests passed 5/5.
Only the changed test file ran. No helpers were authorized or used.
No new effects links, fixed universal rates, or gameplay connections exist.
The source branch contains four scoped files; ignored Team 8 conversation
traces and prior evidence recovery remain preserved outside the PR.

The reused workspace is registered to Team 8. The environment's configured
4 GiB storage reserve was restored after the coordinator clarified that its
own measured cloud policy applies. No override, deletion, or new checkout
was used. No recurring automation was created or retried. This chat remains
available to the local report collector.

The predecessor's evidence ZIP upload remains unresolved in END00. Its
payload and destination lacked approval in the automatic review. No upload
retry or bypass occurred, and the original ZIP is absent from this workspace.

Next: submit this exact repair for CTO review; Merge alone integrates it.
Then resume contextual conversation traces while the coordinator reconciles
the proposed Team 8 speech-option and Team 5 scene-resolver claims.
