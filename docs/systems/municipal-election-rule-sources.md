# Where the municipal-election rule packs come from

`src/simulation/municipal-election-rule-packs.ts` carries fifty states and the
District of Columbia. This page records what was actually read, so the
`verification` field on every source can be checked rather than trusted.

**Nothing in this wave is audited law.** Every value carries verification
`secondary-synthesis-only`. That is not a hedge; it is the literal state of the
evidence, and it is the reason this corpus is not wired into any candidacy,
election or player-facing surface yet.

## The two verification states

`primary-text-read` means the operative text of the cited instrument was read
and says what the pack claims. **No value in this wave has it.**

`secondary-synthesis-only` means a research synthesis reports the value and
names the instrument, but the instrument itself was not opened here. The
citation is the synthesis's claim about the law, not this repository's. Every
value in this wave is in this state.

Promoting a value between the two is the whole of the independent audit this
lane is handing off. It is an act performed against an instrument, never a
relabelling.

## What was read

One document, in full, on 2026-09-06:

| Field         | Value                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| Packet        | `92O_NATIONAL_MUNICIPAL_ELECTIONS_DIRECT_DEMOCRACY_COMPLETION — 2026-09-05` |
| Drive file id | `1dfhiTj8FM4vUOYud7kbyU_B3ZDKnZQJ9`                                         |
| Research lane | Antigravity (Google DeepMind)                                               |
| As-of         | 2026-09-05                                                                  |
| Jurisdictions | 51 (50 states + DC)                                                         |

The packet's sections 1 through 8 were read in full, including all 51 state
profiles, its section 6 TypeScript proposal, its section 7 conflict catalogue
and its section 8 citation registry. Its companion 356 KB JSON artifact was
**not** available to this lane and was not read; every value here comes from the
prose document.

`data/municipal-elections/92O-national-state-baseline.json` holds the extracted
corpus verbatim — every field as the packet serialises it, every citation, and
the conflict register below. Nothing is interpreted in that file. The
interpretation lives in one table, `READINGS`, in the packs module.

## Why the packet's own TypeScript proposal was not adopted

Section 6 of the packet proposes a flat `StateMunicipalFramework` interface:
`recallAuthorized: boolean`, `recallSignatureThresholdPct: number | null`, and
so on. That shape cannot be used here, for two reasons that are settled
repository law rather than preference.

First, it collapses epistemics. `number | null` merges "the source resolved no
threshold" with "this mechanism has no threshold to resolve", and
`legislature-rules.ts` already establishes for this codebase that `unknown` is
not zero, not none and not absent. A prohibited recall and an unresearched
recall are not the same fact and must not share a representation.

Second, a boolean cannot express what American municipal law most often says.
For fourteen jurisdictions the packet's own prose says citizen initiative
exists _only_ in certain municipal forms — Kentucky's Commission and City
Manager cities, Tennessee's Manager-Commission charters, Texas home-rule
charters — while the serialised boolean reads `true`. Compiling that boolean
would assert a statewide right the source does not claim. Those jurisdictions
compile as `locally-selectable` instead.

The vocabularies in section 6 were adopted where they hold. One did not: the
proposed `MunicipalTimingModel` enum omits seven timing values the packet's own
state profiles use. The profiles govern.

## What the wave resolves

Counts are of the 51 jurisdictions.

**Ballot structure — resolved for all 51.** 30 nonpartisan-mandatory, 8
nonpartisan by default with a partisan option, 6 partisan-mandatory, 3 partisan
by default with a nonpartisan option, 4 left to the charter.

**Election timing — 33 resolved to a single model, 18 locally-selectable.** A
state that offers its municipalities a menu of dates has resolved the menu, not
the date, and the pack says so.

**Runoff rule — 45 resolved, 6 locally-selectable** (Alaska, Florida, Iowa,
North Carolina, New Jersey, South Carolina). 28 of the resolved 45 are pure
plurality, and every one of those carries a **not-applicable** majority trigger
rather than a null: a plurality election has no share to clear.

**Recall doctrine — resolved for all 51.** 14 two-question standalone, 13
yes/no retention, 5 simultaneous incumbent replacement, 2 judicial removal only
(Iowa, Virginia), 17 prohibited under state general law.

**Vacancy rule — resolved for all 51.** 42 council appointment with a
special-election threshold, 5 mayoral appointment with council consent, 2
mandatory special election, and 2 — Indiana and Ohio statutory cities — where a
closed caucus of the vacating officer's party precinct committeepersons fills
the seat with no vote by council or citizens.

**Election administration — resolved for all 51.** 33 county-board coordinated,
13 municipal-clerk administered, 4 hybrid, 1 state board (the District).

**Home rule foundation — resolved for all 51.** 30 constitutional home rule, 13
statutory optional charter, 7 strict Dillon's Rule, 1 federal home rule act.

## What the wave deliberately leaves unresolved

Thresholds are the honest weak point, and they are unresolved on purpose rather
than filled in.

A percentage without its base is not a threshold. Fifteen percent of registered
voters and fifteen percent of the votes cast for mayor differ by roughly an
order of magnitude, and the packet carries an explicit base **only for recall**.
For initiative and protest referendum the base sits in prose, and where that
prose names none the threshold stays `unknown` with the source's own words in
the note.

A tiered or ranged requirement is also not resolved. California's initiative is
10% for a regular election and 15% to force a special one; Kansas is 25% in
second- and third-class cities and 40% in the first class; Utah is 8%, 11.5% or
16% by population. Each of those is `unknown` at the state baseline, with the
tiers quoted. Utah's is the most likely to be promotable, since population is a
fact the places corpus already carries.

An absolute count of signers is `not-applicable`, not `unknown`. New Hampshire
warrant articles need 25 registered voters and Connecticut's need 20 or 50 —
there is no percentage missing there, because there is no percentage.

Local charter variation is never inferred. A pack states general law. Where the
packet records that a named charter departs from it — Chicago's mayoral recall
under 10 ILCS 5/21A, Portland's 2024 single-transferable-vote council, Fargo and
St. Louis approval voting, the eleven ranked-choice cities — none of it is
compiled. Those are a later wave with its own authority.

## The corpus's own internal conflicts

The packet contradicts itself in ten identified places. Every one is recorded in
`data/municipal-elections/92O-national-state-baseline.json` under `conflicts`,
surfaced at runtime as `MUNICIPAL_CORPUS_CONFLICTS`, and resolved deliberately
rather than silently. The load-bearing ones:

- **Recall grounds on prohibited states.** All 17 prohibitions also serialise
  `Grounds Required: True`. A mechanism that does not exist cannot require
  grounds; the packs record not-applicable.
- **Iowa and Virginia.** Serialised `Authorized: False` with a doctrine of
  judicial removal _and_ a petition threshold (20% and 10%). Those percentages
  gate a judicial removal petition, not a recall election. The doctrine compiles;
  the recall-election threshold does not, and the numbers are preserved here.
- **New York's referendum window.** No referendum, no protest referendum, and a
  45-day window. A window without a mechanism resolves nothing; New York's
  permissive referendum under MHRL § 24 is a different instrument the packet
  does not develop.
- **Prohibition count.** Section 1.2 names 14 jurisdictions where recall is
  barred or judicial-only. The state profiles serialise 19, adding Illinois,
  Massachusetts, Minnesota, North Carolina and West Virginia. The profiles
  govern as the more specific layer, and their claim is about general law only —
  consistent with the packet's own note that Chicago has a recall statute.
- **Ohio's ballot.** The enum says partisan-by-default-nonpartisan-optional
  while the citation prose says mandatory partisan. Both are true of different
  layers: statutory cities are partisan, charter cities opt out under the 1912
  Home Rule Amendment. Which layer a given Ohio city sits in is local variation.
- **Kentucky's option family.** Serialised `consolidated_city_county`, a family
  the packet otherwise applies to individual metro governments. Carried verbatim
  because it is the source's own classification; no compiled electoral rule
  depends on it.

## What an independent audit should do

In rough order of leverage:

1. **Verify the 51 ballot-structure and election-timing citations at their
   instruments.** These are the highest-confidence, highest-use values in the
   wave and the cheapest to promote. Idaho Code § 50-403, Iowa Code § 376.3,
   Wis. Stat. § 5.60 and the rest are short, quotable sections.
2. **Settle the signature bases and tiers.** Five initiative thresholds are
   `unknown` because the requirement is tiered or its base is unnamed
   (California, Colorado, Kansas, Maine, Utah), and twenty-one referendum
   thresholds are `unknown` for the same reason. Each note quotes exactly what
   to go and check.
3. **Test the fifteen form-conditional jurisdictions.** Confirm that
   Connecticut, Florida, Kentucky, Massachusetts, Michigan, Mississippi,
   Missouri, New Jersey, New Mexico, North Dakota, Rhode Island, Tennessee,
   Texas, Washington and Wyoming really do condition citizen initiative on
   municipal form, and enumerate the forms. That is the difference between
   `locally-selectable` and a resolved right, and it accounts for the other
   fifteen `unknown` initiative thresholds.
4. **Re-read the four charter-determined ballot states** (North Carolina, Rhode
   Island, South Carolina, West Virginia) against the option sets their statutes
   name.
5. **Check the two party-caucus vacancy claims** — IC § 3-13-8-1 and R.C.
   § 733.31 — since they are the most consequential single rule in the wave for
   how a seat changes hands.
6. **Confirm the Iowa and Virginia readings**, which are the only two places a
   compiled doctrine departs from the corpus's own `Authorized` boolean.

An audit that promotes values must update this page in the same change, and the
matrix test that asserts every value is `secondary-synthesis-only` will fail
until it does. That failure is the intended signal, not an obstacle.
