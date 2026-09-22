# How many dual systems there are

Counted 2026-09-22 on a fresh worktree off `origin/main` at **`d5c707f4`**
("Merge pull request #388"). Every row names the two sites and the input
behind the claim. Nothing here was consolidated; this pass counts.

## The count

| Band | How many | What it means |
|---|---|---|
| A. Two producers, and they **disagree today** | **6** | A live defect a player can meet |
| B. One correct helper that callers may **decline to use** | **6** | The optional-correctness shape |
| C. Duplicate implementations that currently **agree** | **18 module pairs** | Consolidation debt, not a defect yet |
| D. Built, ships to the player, **no producer in play** | **7 functions** | Reader wired to the fixture, not the game |
| E. Exported into the play bundle, **never called by production code** | **606 symbols across 253 modules** | The outer bound of the same problem |

Band E is the honest outer number and is not 606 separate bugs — it is the
size of the surface the other four bands are drawn from.

## A. Two producers that disagree today

| # | The two sites | Which one play reaches | Do they disagree |
|---|---|---|---|
| A1 | `simulation/character-history.ts:2218/2231/2242` draws a name with `drawCanonicalName` and a gender separately, vs `presentation/production-world.ts` (6 sites) using `drawCanonicalNameForGender` | **Both.** `production-world.ts:924` calls `generateQuickCharacterHistory` | **Yes.** See measurement below |
| A2 | `simulation/governing/program-families.ts` (13 families) vs `simulation/legislation-program-families.ts` (20) | Both, on different screens | **Yes.** 7 families |
| A3 | `simulation/municipal-election-rule-packs.ts` (1222 lines, 51 jurisdictions, asOf 2026-09-05) vs `municipalRulePackFor` in `simulation/municipal-government.ts` | **Only the second.** The corpus is imported by its own test and nothing else | **Yes.** 51 jurisdictions of sourced rules reach no player |
| A4 | Given-name generation **version**: `presentation/new-game.ts:211` passes `given-name-v2`; `presentation/production-world.ts:222` defaults to `given-name-v1` | Both, by route | **Yes.** Two name algorithms by entry point |
| A5 | Two populations that never touch, and no electorate | carried from the people-and-life lane | Yes |
| A6 | Two economic surfaces: real BLS/BEA `economic-context.ts` vs authored `macro-conditions.ts` | Both, different panels | Yes |

A5 and A6 are **carried, not re-measured here** — A5 from the people-and-life
lane via the connectivity map, A6 from the world-divergence lane. They are in
the count because they are the same shape, not because this pass proved them.

### A1, measured

`probe1.ts`, 300 seeds, the three context people (parent, peer, teacher) that
`generateQuickCharacterHistory` creates on an ordinary start:

```
context people drawn: 900
names that appear in a gendered pool: 805
of those, name contradicts the drawn gender: 392 (48.7%)
  seed probe-0 teacher: gender male, name "Kaitlyn Wheeler"
  seed probe-3 parent: gender male, name "Lydia Park"
  seed probe-5 parent: gender female, name "Tariq Chan"
```

Essentially a coin flip. `people.ts` carries a comment saying this exact defect
was fixed — "getting an identity from one stream and a name from the whole
corpus on another, with nothing joining them" — and `character-history.ts`
carries a comment above the broken call claiming the name comes "through the
seeded generator". Both comments are true of the file they are in and false of
the pair.

**The name lane measured this more fully and owns the fix on #399**: sixteen
routes, 29 of 72 generated people wrong on an ordinary Lexington start across
24 saves, and 237 of 516 members of Congress in one seated world; zero after.
Their numbers are the ones to quote. This pass found the same shape
independently from the other end, which is why it is listed rather than
folded in.

### A2, measured

`probe2.ts`:

```
governing/program-families.ts PROGRAM_FAMILIES: 13
legislation-program-families.ts programFamilies(): 20
in legislature bank but NOT actionable by a governing office: 7
    transit-access, bridge-maintenance, broadband-access,
    water-service-lines, disaster-recovery, utility-resilience,
    critical-infrastructure
```

All seven are infrastructure and resilience. An elected executive cannot act on
bridges, broadband, water lines or disaster recovery; the legislature can.
`governing/program-families.ts` composes 3 of the 5 family banks and omits
`INFRASTRUCTURE_FAMILIES` and `RESILIENCE_FAMILIES`.

### A3, verified

Every reference to `municipal-election-rule-packs.ts` in `src/` and `scripts/`:

```
src/simulation/municipal-election-rule-packs-matrix.test.ts:16   import
scripts/prose-corpus/coverage.ts:134                             a path string
```

Play uses the other `municipalRulePackFor`, from `municipal-government.ts`, via
`presentation/municipal-governing.ts:67` and `presentation/new-game-geography.ts:156`.
This bears directly on the six states measured refusing candidacy outright: the
rules exist, compiled and sourced, on a route nothing takes.

## B. One correct helper callers may decline to use

The name lane named this shape and it is worth its own band: not two
implementations, but a safe variant exported beside a looser one, where using
the safe one is optional. Swept mechanically for exported pairs where one name
is the other plus a qualifier and both are called in production:

| Loose variant | Refs | Strict variant | Refs |
|---|---|---|---|
| `drawCanonicalName` | 47 | `drawCanonicalNameForGender` | 13 |
| `stateName` | 109 | `stateNameForUsps` | 6 |
| `legislativeScenarioKeys` | 7 | `legislativeScenarioKeysForPlace` | 6 |
| `stateExecutiveIdentity` | 6 | `stateExecutiveIdentityForOfficeKey` | 12 |
| `fileDraft` | 2 | `fileDraftFromOffice` | 3 |
| `bargainingSubjectFacts` | 2 | `bargainingSubjectFactsForDraft` | 2 |

Reference counts are textual occurrences across files, not distinct call sites;
they show the ratio, not a caller list. `legislativeScenarioKeys()` returning
every blueprint regardless of jurisdiction, beside a `ForPlace` variant that
filters, is the Kentucky/Lexington default hazard in API form.

## C. Duplicate implementations that currently agree

18 module pairs export the same symbol name. Executed and compared, these
**agree today** — so they are consolidation debt, not live defects, and should
not be reported to him as bugs:

```
sha256Hex          simulation/sha256.ts  vs  source/core/hashing.ts        AGREE
toCanonicalJson    authoring/            vs  source/core/                  AGREE
HOUSEHOLD_ERRANDS_KEY, PUBLIC_MEETING_KEY
                   presentation/ordinary-life.ts vs simulation/life-opportunities.ts  AGREE
```

The largest single pair is a copied module: `source/domains/government-finances/acquisition.ts`
and `source/domains/public-employment/acquisition.ts` share **9** exported names
(`PUBLISHER_URL`, `DATA_MEMBER`, `IDENTITY_MEMBER`, `CODEBOOK_MEMBER`,
`DISCLAIMER_MEMBER`, `ARCHIVE_ID`, `cutPublisherRows`, `acquisitionPlan`,
`productionRoles`). Others: `places/identity.ts` vs `sld-place-relations/identity.ts`
(2), and single-symbol pairs across `canonical-json`, `setup-questionnaire`,
`stateNameForUsps`, `QuickDossier`/`ShellDossier`, `dollars`,
`municipalRulePackById`, `deriveDisplayName`, `FORBIDDEN_FIELDS`.

## D. Built, ships to the player, no producer in play

Seven functions whose only non-test caller is a demo file:

```
simulation/politics.ts                    recordPropositionExposure, recordPublicPosition,
                                          recordCampaignCommitment, recordPrinciple,
                                          recordSubjectKnowledge
simulation/political-belief-formation.ts  evaluatePoliticalBeliefFormation,
                                          applyNpcPoliticalBeliefFormation
```

The consumer side is complete and ships to the player.
`presentation/world39-journal.ts:294-345` reads `privateBeliefs`,
`publicPositions` and `campaignCommitments` and renders a sentence for each.
The reader is finished; the writer runs only in `demo.ts`. This is the
structural form of the catalogue finding already recorded: the game knows what
politics is about and no person in it can hold a conviction.

`POLICY_PACKS` in `simulation/policy-pack-registry.ts` has exactly one
consumer, `simulation/production-catalog.ts`.

## E. The outer bound

606 exported symbols across 253 modules are bundled into the play client
(reachable from `src/main.tsx`) and referenced by no production file anywhere —
only by tests. Largest: `simulation/queries.ts` (37), `presentation/garment-fit.ts`
(11), `presentation/new-game-geography.ts` (11), `simulation/incidents.ts` (11),
`presentation/legislative-bargaining-brief.ts` (10).

Method: word-boundary identifier match across every file, which is generous —
it counts registry and string references too. Zero means no production file
mentions the name at all.

## Not dual systems

Named so nobody files them again:

- **`projectXxx` in `presentation/` beside `Xxx` in `player/`** — 15 pairs. This
  is the projector/component architecture, working as designed.
- **`sourceDomain`, 25 files** — the source-domain interface.
- **`politicalStartingConditions` vs `generatePoliticalStartingConditions`** — a
  reader and a writer, not two producers.
- **`policy-pack-registry.ts` vs `policy-packs.ts`** — a registry composing a
  loader.
- **`setup-questionnaire.ts` vs `setup-questionnaire-bank.ts`** — logic beside
  its content bank.
- **`municipalRulePackFor` in `municipal-election-rule-packs.ts` vs
  `municipal-government.ts`** — same name, different signatures and different
  concepts. A naming collision that made A3 hard to see, not a second
  implementation.

## What is worth consolidating

**Consolidate:** A1 (owned by the name lane, #399), A2, A3, and band B by making
the loose variant unavailable rather than merely discouraged — the 47-vs-13
ratio on `drawCanonicalName` is what an optional helper produces.

**Leave alone:** band C. They agree, and merging a hashing utility across the
simulation/source boundary would cross a deliberate line in `ARCHITECTURE.md`
for no player-visible gain. Worth a test asserting they stay equal instead.

**Neither:** band E needs triage, not consolidation. It is a list to draw from.

## Method

Import graph over 1492 files, 462 of them tests. Reachability walked from
`src/main.tsx` (play) and `src/cli/demo.ts`. File-level reachability was **not**
the discriminator — demo.ts imports nothing play does not, so every row here is
symbol-level. Probes executed with `node --import tsx` against the worktree at
`d5c707f4`, not read.
