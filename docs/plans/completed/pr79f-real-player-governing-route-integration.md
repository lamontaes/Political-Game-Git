# 79F — PR #79 post-PR85 real-player governing route integration and finalization

Canonical report name:
`79F_CLAUDE_PR79_POST_PR85_REAL_PLAYER_GOVERNING_ROUTE_INTEGRATION_COMPLETION`

Date: 2026-09-08. Owner: the PR #79 writer, one writer only.
Target branch: `claude/legislative-bargaining-dialogue-realism` (PR #79).

## Exact heads

- Starting PR #79 head: `d8baf0c3e025df4c1625bf2e796e797114f864e5` (verified
  identical to the packet's recorded head before any edit).
- Main merged: `b61abf26118e50be351c09db5b3d0823333fc9ec` — main had moved
  past the packet's `167a2477` by PR #119 (92C life content), PR #125 (prose
  corpus) and PR #126 (P1 prose migration). All intervening commits were
  inspected; none overlaps bargaining, campaign continuity, or the membership
  contract, so integration continued. The merge is an ordinary merge commit
  (`b3a2d07`), no rebase, no force-push.
- Ending head: the final commit on this branch carrying this report; the last
  implementation commit before the report is recorded in `git log`.

## Merge conflict resolution

One conflict: `docs/decisions/DECISION-LOG.md`. Both sides appended entries at
the same point — main's D-078 (PR #85 campaign/candidacy/election continuity)
and this branch's D-081/D-082 (bargaining and commitment semantics). Both were
kept, main's D-078 first, D-081/D-082 after it, preserving every word of each.
No ownership machinery, freeze range, or helper was touched; no branch-local
exception was resurrected.

Three post-merge reconciliations, none semantic:

- `tests/ordinary-conversation-integration.test.ts` — the byte-identical-to-
  main baseline was re-captured by running the identical replay on unmodified
  main `b61abf2` (P1 rewrote conversation narration). The branch's replay
  matches the fresh baseline hash-for-hash, so the PR79 consequence hook still
  changes nothing in ordinary conversation records.
- `scripts/prose-corpus/computed-anchors.json` — anchors minted for the prose
  sites this branch adds (the corpus tooling arrived from PR #125 mid-flight),
  including one deliberate second-occurrence anchor for a line whose exact
  text already exists on main. Minted with the corpus's own tool; nothing
  hand-numbered except the occurrence the tool refuses to guess by design.
- `scripts/prose-corpus/corpus.test.ts` — the live coverage measurement
  re-pinned over the merged tree and again over the 79F additions, following
  the test's own re-pinning precedent.

## What 79F adds

### The canonical route (exact records)

- Player: `world.control.personId` — the person created by the ordinary
  new-game route in Lexington–Fayette.
- Win: the accepted PR #85 path (`fileForOffice` → campaign afternoons →
  election contest resolved on the ordinary time advance). `seatTheWinner`
  records the governing seat as ordinary work records: a `WorkRelationship`
  of kind `employment:legislative-member` (stableKey
  `<campaign stableKey>:seat`) with a `WorkRoleRecord` whose
  `locationJurisdictionId` is the Kentucky state jurisdiction, in a
  legislature organization reused per pack.
- Residence: `person.homeJurisdictionId` and the `householdLocations` records
  stay Lexington–Fayette throughout; the governing jurisdiction is only ever
  read from the role. `resolvePlayerCapabilities` keeps the two apart.
- Legislative work: capabilities resolve scenario `kentucky` for the governing
  workplace; `openLegislativeWork` introduces HB 214 ("Transit Access Pilot",
  `KENTUCKY_RULE_PACK`) as measure stableKey `legislative-work:kentucky:measure`
  with the sponsoring colleague context-person
  `legislative-work:kentucky:member`.
- Bargaining: `openLegislativeBargaining` (new,
  `src/presentation/legislative-bargaining-world.ts`) answers one question —
  does this player currently have a truthful bargaining context? When the
  measure is on the House of Representatives floor it derives the seat from
  canonical state: colleagues `legislative-work:kentucky:{advocate,guardian,analyst}`
  through the accepted context-person seam, HB 214's filed text as canonical
  provisions `legislative-work:kentucky:section-{1,2,3}`, the fiscal note event
  `legislative-work:kentucky:fiscal-note`, prior working history
  `legislative-work:kentucky:prior:{advocate,guardian}`, seated bodies linking
  every person this world actually models (player, sponsor, advocate,
  guardian), and room contexts under
  `legislative-work:kentucky:floor:{both-present,advocate-only}`. All seeding
  is idempotent: a reload finds, never re-creates.

### Fail closed

Every gate returns an explicit reason instead of a substitute: no legislative
seat (a lost election never passes the first gate), no rule-pack surface, no
authored bargaining sitting for the legislature (`bargainingBriefSupports` is
true for exactly `kentucky`), no measure taken up, measure not on the floor.
Nothing is manufactured from residence, display names, ordering, or the
developer fixture, and the refused paths seed no records.

### Rehomed surface

`MeasureFloorSurface` (new) is the existing #79 floor presentation extracted
unchanged; it reads a neutral `LegislativeBargainingSeat`
(`legislative-bargaining-brief.ts`, which also owns the authored HB 214
bargaining content both constructors share). `?view=floor` remains as the dev
proof through `createLegislativeBargainingFixture`; production reaches the same
surface from the office overlay in `PlayerGame` ("Go to the members' room")
through the adapter. The bargaining floor actions and the paper workspace now
take the neutral seat; no second legislative UI was built and no bargaining
semantics were changed.

## Proofs

- **A — win → govern → bargain** (`legislative-bargaining-world.test.ts`,
  proof A; `tests/e2e/pr79f-production-floor.spec.ts`): a deterministic
  character (`p85c-owner-0`) wins through the accepted PR85 route, residence
  unchanged, enters the members' room from normal play, talks to a modelled
  member, inspects the bill and fiscal note, offers/decides the amendment
  through the existing mechanics, calls the floor vote, and the resulting
  records are the accepted #79 families in the player's own history.
- **B — save/reload** (same files): after a bargaining interaction and a
  fiscal-note read, serialize → deserialize round-trips byte-identically,
  the adapter reaches the same measure/advocate/guardian/analyst/jurisdiction
  identities, re-entry changes no bytes, canonical knowledge restores
  `analysisSeen`, and bargaining continues. The browser proof saves through
  the ordinary repository and reloads the page.
- **C — loss continues life** (proof C): a searched losing seed leaves no
  `employment:legislative-*` relationship, capabilities withhold legislation,
  the adapter returns an explicit unavailable reason, and ordinary days keep
  passing. The browser proof additionally shows no Work surface exists before
  the win.
- **D — no content fails closed** (proof D): before the bill is taken up and
  while it is in committee the adapter withholds with the truthful reason and
  seeds nothing; the authored-sitting registry answers `kentucky` only.
- **E — no dev-fixture leakage**
  (`legislative-bargaining-no-fixture.test.ts`): a mechanical walk of the real
  import graph proves the fixture module is unreachable from `PlayerGame`,
  `MeasureFloorSurface`, the adapter, the brief and the actions; the
  dependency direction (fixture → brief) is pinned; `MeasureFloorView` (the
  dev wrapper) is unreachable from the production spine.
- **F — 79C semantics survive**: the entire pre-existing #79 suites run
  unchanged (talking never legislates, amendment-only revision, support-if /
  oppose-unless polarity, obligation-before-fulfilment, question identity,
  later-vote matching, `provision-removed` impossibility, deterministic
  dialogue, audience/knowledge boundaries), and proof A pins
  talking-never-legislates plus word-for-word dialogue determinism on the
  real-player path.

## Validation at the final head

Recorded in the PR body and the session log: full `npm run validate`
(format, lint, typecheck, unit suite including donor containment with donor
history fetched, source validation, source replay, production build,
deterministic demo, art validation), the full Playwright suite (277 tests,
including the new production-floor proof), `git diff --check`, and
`npm run agent:preflight`. No timeout, assertion, or skip was weakened; the
only test-expectation edits are the two live-measurement re-pins and the
re-captured main baseline described above.

## Remaining bounded limitations

- Exactly one authored bargaining sitting exists (Kentucky / HB 214); every
  other legislature truthfully withholds. Content production for more
  jurisdictions is outside this packet.
- The in-scene conversation-phase memory (`LegislativeBargainingProgress`)
  remains presentation state for the open sitting; every consequence
  (commitments, negotiations, amendments, votes, knowledge) is canonical, and
  a reload rebuilds the sitting from those records.
- The loss path's browser evidence is the absent Work surface pre-win plus the
  unit proofs; a full browser losing playthrough is covered by the existing
  campaign e2e suite.
- D-081/D-082 remain PR #79's decision reservations; no new decision entry was
  created by 79F.

PR #79 remains OPEN AND UNMERGED for fresh independent exact-head acceptance.
