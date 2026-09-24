# What a town needs before it plays, and what the country actually has

Measured 2026-09-22 on a worktree off `origin/main` at `4965f63c`. Every number
below is pinned by `tests/nationwide/town-playability.test.ts`, which fails if
the tree stops matching this document. The assertions were mutation-checked:
changing 19,480 to 19,481 and 16,184 to 16,185 both fail, so these are
measurements and not decoration.

## The short answer

A life starts anywhere. **Government stops almost everywhere.** The gap is not
one missing thing; it is four, and only one of them is a research problem.

## What a town needs, in the order the game asks

A place must answer four separate questions before a player can do politics in
it. They are genuinely separate — the code keeps them apart on purpose, and
`candidacyAuthority` (`src/simulation/candidacy.ts:96-121`) is careful that a
town with no council of its own still reaches its state's offices.

| #   | What a place needs                                       | Where it is read                   | How much of the country has it                                     |
| --- | -------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| 1   | **Identity** — a name, a state, a jurisdiction           | `national-places.generated.ts`     | **32,350 places + 3,222 counties. Complete.**                      |
| 2   | **A government that exists** — who actually governs here | `governmentUnitsForPlace`          | **19,480 of 32,350 places (60.2%)**                                |
| 3   | **A candidacy pack** — which offices are elected here    | `capabilities.candidacyPackId`     | **0 localities.** 9 whole states, plus the governorship everywhere |
| 4   | **A procedural pack** — how a measure moves              | `municipalRulePackFor(government)` | **1 city in the United States**                                    |

Question 1 is solved. Question 4 is solved in Charlottesville, Virginia, and
nowhere else.

## The one line that closes the country

`src/simulation/life-places.ts:642`. Every one of the 35,572 places synthesized
from the national corpus is handed:

```ts
capabilities: { legislativeScenarioKey: null, candidacyPackId: null },
```

That is not an oversight, and the comment above it says so: a town's own
offices are unsourced, and the game refuses to invent them. The refusal is
correct as written. What is wrong is that **nothing has ever been offered in
its place**, so the honest refusal is the whole experience.

Its player-visible consequence is the reported one: naming Illinois opens a
legislative start and naming Chicago closes it
(`src/presentation/new-game.ts:302`, `src/player/PlayerGame.tsx:1831`).

## Four findings that change what should be built

### 1. The game already knows who governs 19,480 towns

The Census 2025 Government Units listing is compiled and in the tree: **38,704
units — 3,031 counties, 19,489 municipalities, 16,184 townships**
(`government-units.generated.ts:9-20`). 19,480 places join to a real municipal
government today, and 31,560 of 32,350 places (97.6%) reach a county.

So the municipal layer is not missing its _facts_. It is missing its _rules_.
Of 144 municipal governments read in depth, exactly **one** — Charlottesville —
produces a rule pack a measure can move through. The other 143 are refused by
`municipalRulePackFor` naming the specific field the instruments never
established.

### 2. Every township in America is joined to nothing

**Zero of 16,184 township units carries a `placeGeoid`.** Town of Easton CT,
Town of Center Harbor NH — real, functioning, general-purpose governments the
game holds records for and cannot reach from the place a player lives in.

This is why the town-meeting states look ungoverned: Connecticut reads 30 of
215 places governed, New Hampshire 13 of 100, Maine 23 of 155, Vermont 39 of
180, Rhode Island 8 of 36. Those are not states without local government; they
are states whose local government is filed as a township.

It is a **join defect, not a research gap** — but it is not a cheap one. The
link comes from a `census_place_geoid` column in the acquired listing itself
(`src/source/domains/government-units/normalize.ts:154`), which is blank on
every township row. I tested the obvious repair — state FIPS + the
`publisherPlaceCode` each township does carry — and it resolves **2 of 16,184**,
both coincidences. The Government Units place code is a different code space
from the Gazetteer GEOID. Closing this needs the Census crosswalk acquired as a
source, not a code change.

### 3. The 1,222-line municipal file is gated shut on purpose, not disconnected by accident

`src/simulation/municipal-election-rule-packs.ts` compiles real municipal
election law for 51 jurisdictions and is imported by nothing but its own test.
It is tempting to read that as free coverage waiting to be plugged in. It is
not.

Every value carries verification `secondary-synthesis-only`, and
`MUNICIPAL_RULES_AUDIT_GATE` (`src/simulation/municipal-election-rules.ts:485`)
says exactly what that forbids:

> Candidacy, election and player-facing surfaces must not read it as settled
> until an independent municipal-election source audit promotes values to
> 'primary-text-read'.

Wiring it to candidacy as sourced law would break that gate directly.

Two things also worth saying plainly. There is **no name mismatch** — the
reported `municipalRulePackFor` / `municipalRulePackById` confusion is really
two _different_ functions that share a name in two modules
(`municipal-election-rule-packs.ts:1218` takes a USPS code;
`municipal-government.ts:565` takes a government record), plus two different
`municipalRulePackById`s. Nothing is failing to import; the collision means a
wrong import would never announce itself. And the wave covers 51
jurisdictions — **Puerto Rico is not among them**, so PR is outside this corpus
as well as outside the legislature packs.

There is an honest route to using this corpus, and it is the range: a
51-jurisdiction synthesis is a legitimate description of the **national spread**
even where it is not settled law about any one town. That uses it as the owner's
rule intends — rules drawn nationally, never a neighbor's law borrowed — and
respects the gate, because the range never claims to be what this town's
statute says.

### 4. The national range does not exist, and the pattern to build it does

Nothing in the tree draws a value from a national spread. The nearest thing,
`STATE_EXECUTIVE_GAME_PROFILE`
(`src/simulation/nationwide-world/state-executive-term-rules.ts:84`), is one
frozen constant applied identically to every state — the single national
average the owner's rule was written to rule out. The docs already admit this:
"The realistic range was agreed and never built"
(`docs/findings/2026-09-22-priority-audit-findings.md:20`).

The primitives exist (`stableHash` at `src/simulation/ids.ts:6`, `SeededRng` at
`src/simulation/rng.ts:3`), and no draw anywhere is keyed on a state code yet.

**The pattern to copy is already in the tree and it is the right one.**
`state-executive-candidacy-packs.ts` is why every town walked offers the
governorship. It works by:

- citing a real structural source that establishes only that the office exists
  (the Census Individual State Descriptions, `:85-95`);
- leaving every qualification, term and filing value `unknown` **on purpose**;
- letting eligibility read the real rule at filing time, so admitting a state's
  facts changes behavior with no edit to the file.

That is a blanket that real data replaces rather than fights, and it is the
shape the municipal layer should take.

**One caveat carried from `docs/research/OPEN-QUESTIONS.md:312-340`:** that file
gates on `isUsState`, fifty keys that exclude D.C. and Puerto Rico by
construction. A municipal range built the same way would leave both permanently
refused — the exact failure already seated in Puerto Rico.

## What this means for the build

The job is not one blanket. It is, in order of what it buys the player:

1. **A municipal candidacy blanket** over the 19,480 places that already have a
   government — a mayor and a council, established structurally, every
   qualification unknown and read at filing time. This is the governorship
   pattern applied one level down, and it needs no new research.
2. **The national range instrument**, keyed on the state code so it is stable
   per state across saves, drawn from the 51-jurisdiction spread, always
   overridden by real law.
3. **The township crosswalk**, filed as research — it unlocks 16,184 real
   governments and cannot be done from inside the repo.
4. **Puerto Rico**, which is missing from the legislature packs, the municipal
   election wave and `isUsState` alike, and will stay missing unless it is named.

## Not this lane's, deliberately

State legislatures are the nationwide lane's ground and PR #283 is theirs. #283
is **open and not merged** — the tree still carries nine hand-written packs
(`legislature-rule-packs.ts:2534-2544`) and
`docs/systems/nationwide-rule-coverage.md:9-11` still reports "with a compiled
legislative pack: 9".

One reconciliation worth recording: the reported defect where a generated
pack's drawn minimum age is recorded and never applied **does not reproduce on
main**, because nothing on main draws a minimum age at all — `minimumAge` is
sourced or unknown everywhere (`candidacy-packs.ts:63,171-173,278`). That
defect belongs to #283's head, which is where generated packs live. It is not
fixed; it is somewhere else.
