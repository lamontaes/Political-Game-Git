# WORLD46 — seeded starting worlds and party evolution

Owner lane: CRUNCH46 section 06 WORLD (Claude Opus 5, session
`political-game-claude-runtime-proof-f1`), branch `claude/world46-seeded-parties`
from main `fed321f7`. Authority: CRUNCH46 sections 00–00B, 06, 12 (MAPS
boundary), 13 and R4; ALIVE44 chunk 1 (political geography initialization) and
chunk 3 (party organization model).

## What this delivers

### W1 — federal geography repair, received and version-gated

- `Federal_Geography_Repair_Candidate.zip` (Drive `1inDWg0J…`) applied with
  `git apply` against the exact recorded base blobs
  (`opening-officeholders.ts` `be6f52ae`, `rng.ts` `b290ae14`). The candidate's
  six integration tests are included unchanged in
  `src/presentation/opening-federal-geography.test.ts` and now run.
- New `NewGameSetup.worldOpeningVersion`. New Game stamps
  `world-opening-crunch46-v1`; a replay descriptor without the field is the
  legacy opening. Unknown values are refused. The field travels in the replay
  half only, so world identity (`worldSeedFor`) is unchanged.
- The repair (Washington residence and institutions, separately seeded
  birthplace) applies only to current openings. A legacy descriptor rebuilds
  the fed321f7 world byte-for-byte; `world46-opening.test.ts` pins the sha256
  of two such openings computed on a pristine fed321f7 worktree.
- Saved Worlds are never regenerated: every writer is opening-only and
  idempotent, and no reader writes.

### W2 — compiled calibration input (`political-geography-v1`)

`data/source/electoral-calibration-2024/` holds the publisher bytes (House
Clerk statistics 2020/2022/2024 PDFs, NGA governor pages), `artifact-lock.json`
(sha256 per artifact), `corpus.json`, `corpus-manifest.json` and a README.
`scripts/world/compile-electoral-calibration.mjs` re-derives
`src/simulation/world-setup/electoral-calibration.generated.json` offline.

- 435 House rows joined to Census 119th district GEOIDs, 100 Senate seats with
  class and last applicable election (specials handled explicitly), presidential
  two-party shares for the 50 states and DC, and 50 governor snapshots as of
  2026-01-05.
- Reconciliation controls: House winners 215 D / 220 R and Senate last-election
  winners 45 D / 53 R / 2 other match the Clerk Political Divisions rows.
- Missing values stay null with notes; AK-00 (ranked choice, no printed
  deciding round) is flagged ambiguous and its winner is resolved only by the
  Clerk divisions control.

### W3 — joint initializer (`crunch46-provisional-v1`)

- `src/simulation/world-setup/crunch46-provisional-policy.json` stores the
  section 13 parameters as data. The director's JSON bundle was not on Drive;
  the values were transcribed from the section 13 text.
- `ensureWorldStartingConditions` runs first at Begin and persists, in
  `history.worldConditions`: the opening record (version + regime), the macro
  starting conditions (the section 13 startup kernel; CHANGE owns every later
  month) and the political starting conditions (shared national, Census-region
  and state swings, per-seat residuals, generated shares and affiliations,
  generated presidency).
- Seat rule: logit(baseline) + swing/25, back to a share; no flip cap; ties are
  an explicit even draw. Non-major winners (ME, VT senators) keep their
  affiliation and certified caucus and are never recoded to a share.
- Presidency: generated state results → actual elector allocation (NARA 2020
  census allocation; ME/NE district electors follow the generated House share
  of the same district, a labeled proxy) → Twelfth Amendment delegation vote if
  no majority → explicit even draw only if that also fails.
- Home-state executive: state presidential share with the same shared swings
  plus a contest residual (`generateStateExecutiveAffiliation`, exported for
  GOVERNING's other states).
- Normal draws use engine-independent arithmetic (`deterministic-math.ts`) so a
  seed replays identically in every browser.

### W4 — party organizations and evolution

- `party-registry.ts`: party units derived from persistent organizations (any
  number); setting parties keep their historic order; `partyColorOrder` is a
  permanent color/legend key. `nationalParties` and `homePartyChapters` no
  longer assume a pair.
- `party-evolution.ts`: governing bodies (officers/organizers + standing
  committee), recorded body decisions with named dissenters, initiatives,
  responses and adoption for founding, split, merger, rename, platform change
  and dissolution. Requirements are enforced exactly as CRUNCH46 06 W4 states.
  Leaving a party never touches a seat, term, caucus or earlier roll.
- `party-life:body-review` (quarterly) lets a body decide its next authored
  organizational question. A member acts only with a defining stance, at least
  two recorded losses on the same question and another member who shares the
  view; staying is always weighed.
- Readers for other lanes: `affiliationAt`, `partyUnitOfficersAt`,
  `activePartyUnitsAt`, `partyUnitStatusAt`, `partyPlatformAt`,
  `partyBallotStatusAt` (`not-represented`: a label grants nothing).
- MAPS' as-of patch for `congress.ts` is received verbatim
  (`LivingWorldReadOptions`).

## Conflicts reported to the director (not silently resolved)

1. Section 13 says a seat without a certified two-party margin uses the
   sourced regional baseline. With the state presidential share as that
   baseline, 9 seats whose only major-party candidate won lean the other way
   at zero swing (CA-20, FL-20, IL-15, IL-16, PA-03, TX-09, TX-20, TX-30,
   WA-04), so near-reference worlds usually flip them. Implemented as written.
2. The same proxy drives the first governor. States whose reference governor
   is off the presidential lean (e.g. KY, KS, VT) will usually start with the
   other party in near-reference worlds.
3. The ALIVE43 profile's random independents are replaced by the certified
   non-major seats; its vacancy draw is kept.

## Not done here

- No new player-facing controls: the player takes part through existing
  chapters; initiative/response commands exist for UI to mount (adapter sent).
- National setting parties have no materialized national committee, so their
  merger/rename needs an actual officer to exist first.
- State legislatures are not generated; only the home-state executive is.
