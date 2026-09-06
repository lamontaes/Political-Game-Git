# Where the municipal-election rule packs come from

`src/simulation/municipal-election-rule-packs.ts` compiles a bounded state-law
baseline for the fifty states and the District of Columbia. It does not claim
the rule of any named municipality, and nothing in this wave is gameplay.

## Evidence ceiling

**Nothing in this wave is audited law.** Every resolved source reference carries
`secondary-synthesis-only`. That means 92O reports the value and names an
instrument, but this lane did not open the instrument itself. A citation in a
pack is the synthesis's provenance claim, not a repository assertion that the
primary text was verified.

`primary-text-read` is reserved for a later audit that actually reads the
operative instrument. No value in this wave has that verification state.

## Exact source and deterministic replay

The one source read in full is:

| Field         | Value                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| Packet        | `92O_NATIONAL_MUNICIPAL_ELECTIONS_DIRECT_DEMOCRACY_COMPLETION — 2026-09-05` |
| Drive file id | `1dfhiTj8FM4vUOYud7kbyU_B3ZDKnZQJ9`                                         |
| Research lane | Antigravity (Google DeepMind)                                               |
| Evidence tier | `secondary-synthesis-only`                                                  |
| Jurisdictions | 51 (50 states + DC)                                                         |

The exact Drive bytes are pinned in a deterministic gzip container at
`data/municipal-elections/raw/92O_NATIONAL_MUNICIPAL_ELECTIONS_DIRECT_DEMOCRACY_COMPLETION.md.gz`.
The container was created with gzip name/timestamp fields disabled; replay
decompresses it and the generated JSON records the original Markdown's byte
length and SHA-256. The parser at
`scripts/source/municipal-election-synthesis.ts` extracts every structured
profile field, the actual recall/initiative/referendum citation strings, and
all four section 7 source frontiers.

`npm run municipal-election:compile` regenerates the JSON. `npm run
municipal-election:replay` regenerates it in memory and fails unless the result
is byte-identical to the tracked artifact. `npm run validate` invokes that
municipal replay explicitly.

The general `source:validate` and `source:replay` commands cover registered
`src/source/domains/*` only. They do **not** validate this Drive-derived
municipal artifact. Passing those commands must never be described as a
Drive-to-JSON proof for 92O; the municipal replay command is the proof for this
artifact.

## What the JSON is

`data/municipal-elections/92O-national-state-baseline.json` is generated from
the pinned Markdown, not hand-maintained. Its jurisdiction profile fields
preserve the structured values 92O serializes. That includes `null` where the
structured trigger says `None%`; explanatory prose is not allowed to backfill a
number into that field.

The JSON also contains two deliberately separate registers:

- `sourceFrontiers` is the four-item section 7 catalogue copied verbatim from
  92O: North Carolina election-method synchronization, Illinois non-home-rule
  term-limit jurisprudence, Texas Type A runoff versus local plurality custom,
  and Kentucky urban-county/metro initiative authority.
- `compilerConflicts` is the ten-item implementation review register. These are
  conflicts or unsafe shapes found while compiling the profiles. They are not
  labelled as 92O's own section 7 catalogue.

## Why the packet's flat TypeScript proposal is not used

The packet proposes booleans and `number | null` fields. Those shapes lose the
distinction between an absent mechanism, an unresolved fact, and a right whose
availability depends on municipal form or charter. The runtime therefore keeps
four states:

- `known`: one statewide baseline value is resolved;
- `locally-selectable`: the source resolves an option set but not the local
  choice;
- `unknown`: the source cannot support one operative value;
- `not-applicable`: the mechanism does not exist, so its dependent field has no
  meaning.

A locally-selectable rule reads as no operative value even when the source
identifies a statutory default.

## Fidelity boundaries fixed in O1B

### Direct-democracy provenance

All 153 recall, initiative, and referendum citation fields now contain the
instrument text 92O carries. Empty strings, punctuation-only values, and labels
such as `Authority:` or `Citation:` fail closed.

### Recall availability

Arkansas, Hawaii, Maine, Missouri, New Mexico, Ohio, Oklahoma, Rhode Island,
Tennessee, and Texas compile recall doctrine as `locally-selectable`. Their
form, charter, ordinance, or local-adoption conditions are preserved; none
becomes a statewide operative recall fact.

Texas additionally preserves that general-law cities lack recall while
home-rule charters choose both ballot form and threshold. It does not compile a
single statewide 20% two-question rule.

### Complex recall thresholds

A flat percentage is emitted only when the source resolves one percentage and
one denominator. The following remain `unknown` rather than being collapsed:

- population tiers or ranges in California, Florida, Louisiana, Montana, and
  Washington;
- the District of Columbia's district-wide plus five-ward compound condition;
- every form-conditional recall listed above;
- Maine's conflict between the structured `votes_cast_for_office` base and the
  mechanics' last-gubernatorial-election base.

### Runoff fidelity

Idaho, New Mexico, and Texas join the six already-serialized local-choice
states as `locally-selectable`. Arkansas's 50% rule with a 40%-plus-20-point
alternative remains `unknown` because the current scalar vocabulary cannot
represent the compound rule. New Mexico and Tennessee retain `null` runoff
triggers because their structured 92O fields say `None%`.

### Other non-scalar thresholds

The District's initiative ward condition and Connecticut's `200 electors or
10%` referendum alternative remain unresolved rather than becoming a simple
percentage. New Hampshire's signer-count warrant path remains
`not-applicable` to a percentage field.

## Consumption gate

The packs have no candidacy, election-engine, campaign, or player-facing
consumer. A boundary test scans the source tree and fails if a new consumer is
introduced without a separately authorized integration. PR #85 is outside this
lane and remains untouched.

Any later source audit that promotes a value must update this page, the source
reference, and the matrix assertions in the same change.
