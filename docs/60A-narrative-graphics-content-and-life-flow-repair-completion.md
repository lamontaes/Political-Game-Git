# 60A — PR #81 Narrative, Graphics, Content and Life-Flow Repair — Completion

Canonical completion report for
`60_CLAUDE_PR81_NARRATIVE_GRAPHICS_CONTENT_AND_LIFE_FLOW_REPAIR_MEGA_PATCH`,
under its CURRENT LAUNCH OVERRIDE of 2026-09-04.

---

# OMNIBUS EXECUTIVE SUMMARY — ONE PAGE

Packet 60's addendum of 2026-09-04 made this an omnibus run: one implementation
wave plus three exhaustive print deliverables. All four are done. Nothing was
merged.

**The four documents**

| Doc            | What it is                                                            | Drive                                                                                                                                |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **60A** (this) | What was built, validated and left unmerged                           | [1WijsgrT0Ar_VuZy-xyCFAP-kPmKid6R4uNfNO41SZPo](https://docs.google.com/document/d/1WijsgrT0Ar_VuZy-xyCFAP-kPmKid6R4uNfNO41SZPo/edit) |
| **60B**        | Full visual, UI and graphics coverage audit — print edition           | [1nahTWoRoklCpM2kvWwwuYQiqmXqrt6tLA72_lc8N36Q](https://docs.google.com/document/d/1nahTWoRoklCpM2kvWwwuYQiqmXqrt6tLA72_lc8N36Q/edit) |
| **60C**        | Full dialogue, conversation, branching and copy audit — print edition | [1hOZ-bE-_gB6fhqKvEFJ4biN47Fd3-LDeXATpBlDoRcs](https://docs.google.com/document/d/1hOZ-bE-_gB6fhqKvEFJ4biN47Fd3-LDeXATpBlDoRcs/edit) |
| **60D**        | Engine and systems field guide — owner print edition                  | [1Ay9c2BtbucI4WtPcrLA73oJPbTUgSXYv4yBV5Eu84DI](https://docs.google.com/document/d/1Ay9c2BtbucI4WtPcrLA73oJPbTUgSXYv4yBV5Eu84DI/edit) |

Repo copies: `docs/60A-…`, `docs/60B-…`, `docs/60C-…`, `docs/60D-…`.

**What the implementation wave delivered.** PR #81's Pennywise and adaptive
machinery re-homed onto accepted main `6311dd6` as its own first commit; the
calibration rebuilt as the opening of a life that stops on an information-gain
floor (19 / 22 / 37 questions measured for three answer patterns); a narrative
thread index that never infers a link from adjacency; nine multi-stage episode
families (32 stages, 87 options) that bind real people and branch on the exact
option chosen months earlier; connective time-passage narration; a journal;
an options screen; and six mandatory play-proof paths proven deterministically.
`npm run validate` green (1,423 tests / 88 files); 134 browser tests passing.

**What the three audits found, in one line each.**

- **60B.** The production game renders no scene art at all — every illustrated
  surface ever built lives behind `?view=office-fixture`. Exactly **one**
  production-class asset is released in the whole game (an office plate a player
  cannot reach), while **25 approved production character masters sit
  unreleased**. There are 372 hex literals and zero colour tokens, no `:active`
  state on any control, and zero ARIA attributes in the entire production UI.
- **60C.** Of five conversation subjects, **one is reachable in play**, and of
  fifteen intents **two** cause an NPC to actually decide anything — both on a
  subject the player cannot reach. Audibility is the hard-coded literal
  `"normal"`. The authored copy itself is strong: zero interior-state
  assertions and zero duplicate descriptions across 436 options.
- **60D.** Of 58 record-writing functions in the simulation, roughly 22 are
  reached in ordinary play. **Vitality, incidents, mind, politics, evidence,
  world metrics and policy semantics are all built, integrity-checked, and
  reached by nothing a player can do.** Nobody in this game can die.

**The one honest gap this wave carries.** Two cold starts still produce lives of
very similar shape. The cause is upstream in `generateQuickCharacterHistory`,
which this wave does not own. It is pinned as a failing-when-fixed test rather
than tuned away.

**The single highest-value next action.** Release the 25 banked character
component masters and merge PR #86. Neither costs new art, and together they are
the difference between a game that shows two capital letters in a box and a game
that shows a person in a room.

---

## Exact state

|                       |                                                                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository            | `lamontaes/Political-Game-Git`                                                                                                                                                                                 |
| Accepted base         | `6311dd688331985d5682b39910bf2b917d46d11b` (merge of PR #82)                                                                                                                                                   |
| Base verified         | Fetched live from GitHub before editing; `origin/main` was at that exact SHA and had not moved                                                                                                                 |
| Branch                | `claude/pr81-narrative-graphics-lifeflow-t8j8oe`                                                                                                                                                               |
| Head (implementation) | `479dbdb55373f7a1980651e49eebd4a3d7c42d9a` — the last code commit. This report and one scratch-file removal follow it, so the branch tip is later; a self-referential SHA is not something a report can carry. |
| Pull request          | [#87](https://github.com/lamontaes/Political-Game-Git/pull/87), draft, **left unmerged**                                                                                                                       |
| Donor re-homed        | PR #81 at `f1a29f67e621e3ee7c99fc0b5228f4f552c68464`, cherry-picked as the first commit                                                                                                                        |
| Diff                  | 50 files changed, ~23,000 insertions                                                                                                                                                                           |

### Commits

| SHA       | Subject                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------- |
| `461cbb1` | Notice what a player cares about, then put it in tension _(the #81 cargo, re-homed unmodified)_ |
| `601bdf1` | Hold Packet 26's boundary to the range Packet 26 shipped                                        |
| `b13381d` | Tell one life instead of dealing a hand of cards                                                |
| `d860887` | Open a life instead of administering a survey                                                   |
| `7933706` | Prove the life, rather than assert it                                                           |
| `f761e4e` | Say in the documents what the wave actually built                                               |
| `479dbdb` | Let a reviewer regenerate the proof instead of trusting a paste                                 |

The #81 cargo is its own first commit deliberately: what arrived from the donor
and what this wave changed are separable in the history rather than mixed into
one diff.

## Validation actually run

| Command                                    | Result                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `npm run validate`                         | **Passed.** format, lint, typecheck, tests, build, deterministic demo replay, art validation |
| `npm run test`                             | **1423 passed** across 88 files, 0 failed                                                    |
| `npm run test:e2e` (full Playwright suite) | **134 passed**, 0 failed, 10.3 min                                                           |
| `tests/e2e/narrative-life.spec.ts`         | 11 passed, run twice consecutively for stability                                             |
| `npm run report:life`                      | Byte-identical across two runs                                                               |

The browser needed a local `executablePath` override because the environment
ships Chromium build 1194 and `@playwright/test@1.62.1` expects 1234. That
override was a scratch config, used and deleted; `playwright.config.ts` is
unchanged and CI is unaffected.

---

# 1. What the packet asked for, and what happened

## A / B / H — Title, menus, and development leakage

Done. The title screen is **Our Civic Duty** with no tagline and five controls
— New Game, Continue, Saved Games, Options, Quit. Quit is present and
disabled, and its note says "Not available in this build" without ever
mentioning a browser to a player.

Setup copy follows the authority's direction: _Choose a starting place_,
_Your character_, _Starting age_, _How you want to begin_ (_Start in childhood_
/ _Begin later_), _Your starting path_ (_Everyday life_ / _Legislative staff_),
_Who you live with_, _Before the story begins_.

Removed from player-facing play:

- "This character does not work in a legislature." — the surface is simply
  absent now rather than reworded.
- Raw seed and replay address — moved to a collapsed `Advanced — reproducing
this world` disclosure.
- "Keep this life" / "Leave" — now _Save this life_ / _Main menu_. Save
  functionality is unchanged and its persistence tests still pass.
- "Lexington-Fayette" on player screens. `LifePlace` gained a `formalName`
  field; the merged city-county's filing name stays available for a legal or
  data view and is searchable, and a resident is told they live in Lexington.

`tests/e2e/narrative-life.spec.ts` asserts each of these by regex against the
rendered screen.

**Graphics (Section I) is not in this PR, deliberately.** The launch override's
carve-out is explicit: "DO NOT duplicate PR #86's graphics bank, asset intake,
environment, scene registry, title-tableau, surface-binding, or graphics-runtime
work. This overnight wave owns gameplay/narrative/adaptive life, not a second
graphics pipeline." PR #86 is READY FOR AUDIT and owns exactly the surfaces
Section I describes. `tests/narrative-wave-ownership-boundary.test.ts` proves
nothing here touched them. See §5 for the seam left for #86.

## C — Calibration as the opening of a life

Done, and this is where most of the new authored content is.

**`src/simulation/setup-opening-bank.ts` — 27 new items.** Registers:

| Register                           | Items  |
| ---------------------------------- | ------ |
| `lived-personal`                   | 9      |
| `lived-relational`                 | 9      |
| `lived-moral`                      | 9      |
| `civic-lived`                      | 6      |
| `policy-lived`                     | 5      |
| `policy-docket` (research-derived) | 15     |
| **Total bank**                     | **53** |

Against a design target of 30–50, `shortOfMinimumBy` is now **0**. It was 4.

The three fixed openers changed. They were a civic organization's policy
initiative, a professional event and an inside-or-outside question about an
institution — a reasonable start to a political survey and a poor start to a
life. They are now `kitchen_late`, `marcus_and_the_trip_fund` and
`priya_reference`: a kitchen at eleven at night, a hallway, and a reference
somebody wrote a line of themselves. The old three keep their content and stay
in the pool; only their fixed position is gone.

**The deep path has no length.** It stops when the marginal information a
remaining item would carry falls below `INFORMATION_GAIN_FLOOR = 0.9`. The
stopping measure is deliberately _not_ the ranking score, which is
`magnitude / (1 + weight)` and never reaches zero, so it could never end
anything. Instead an axis contributes only while it is under-observed and
contributes nothing past `SUFFICIENT_DIMENSION_WEIGHT`; once every axis an item
touches is covered, only an unresolved ambiguity keeps the run going.

Measured, on one bank, one seed, three answer patterns:

| Answer pattern       | Questions asked | Why it stopped         | Uncovered axes |
| -------------------- | --------------- | ---------------------- | -------------- |
| always first option  | **19**          | information-gain-floor | 0              |
| always middle option | **22**          | information-gain-floor | 1              |
| always last option   | **37**          | information-gain-floor | 1              |

**Register widening works.** Every run opens on three lived registers and only
then reaches civic and policy; the policy-docket items are ranked last and
appear only at the tail. `pennywise-adaptive-life.test.ts` pins that the first
five items of a deep run are lived registers.

**Removed:** the "1 of 26" progress line, replaced by a coarse phase
(_Somewhere to start_ / _A little wider_ / _Nearly there_) with no denominator;
and "I would rather not say", replaced by the _Begin life_ control that was
always the honest exit. The `null` answer path stays in the engine because
saves recorded before the change contain skips and must replay identically.

**Copy rules, as tests.** Options in the new bank are 5–46 characters, and a
test caps them at 60 and rejects self-explaining connectives. The prior floor
of 15 characters was itself a rule against what the authority asked for — "Say
yes" is seven characters and is exactly the register wanted.

**Playtest verdicts acted on individually:**

| Verdict                                                              | Action                                                                                                                                                                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q4 family-vs-opportunity — generic abstraction                       | `family_or_opportunity` keeps its copy, gains verdict `playtest-abstraction-flagged`, ranked behind everything that passed. Lived replacements authored.                                                                         |
| Q5 rule-consistently-applied-but-unfair — abstraction                | Same treatment for `unfair_rule`.                                                                                                                                                                                                |
| Q25 "fifty-million-dollar", "central ministry"                       | **Corrected in place.** Now "$50 million" and "seek federal waivers". A "central ministry" is not a thing any American jurisdiction has, and leaving a factual error standing to preserve a provenance claim is the wrong trade. |
| "ten-million-dollar"                                                 | **Corrected in place** to "$10 million".                                                                                                                                                                                         |
| Q14 housing pressure, Q23 protest/order, Q24 safety-code — excellent | Untouched.                                                                                                                                                                                                                       |

**On authority.** `setup-questionnaire-bank.ts` carried a standing rule that the
implementing lane may not write questionnaire copy. Packet 60 Section C reverses
it explicitly, and Section M says the same in one line. Rather than quietly
violate the old rule, the module documents the supersession by name, and the
new copy lives in its own file where every item names the packet and section it
was written against — so a reader can tell at a glance which half of the bank a
piece of copy came from.

**Americanisation.** The first draft of the new bank used pounds, councils,
councillors, catchment areas, lorries, tills and bins. That is the same class of
error the authority names with "central ministry" — non-US institutions in a US
setting — and all of it was corrected before commit.

## D / E / F / G — Continuous narrative, childhood, adult cadence, retrospective

Done. Four modules, in the order they depend on each other.

**`src/simulation/narrative-threads.ts` — an index, not a second history.**
Every thread groups records already in `world.history`, and every grouping is
justified by an identity those records explicitly carry:

| Basis                 | Example                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `shared-person`       | both people named among an event's participants; a relationship interaction between the pair; a kinship or partnership record |
| `shared-organization` | the same organization on the work relationship, enrollment or participation                                                   |
| `shared-record`       | the obligation or incident the event names                                                                                    |
| `shared-stable-key`   | the prefix a commitment and its follow-ups share, written by one writer                                                       |

**Temporal adjacency is never a link.** There is no path in the module that
draws an edge from "these both happened in March", and where the repository
records no relationship the index reports none. Every anchor names its store,
record id, stable key, date and sequence, so the grouping is checkable rather
than trusted — `narrative-life.test.ts` verifies that every cited record exists
in the world it was cited from, and that a `shared-person` thread has at least
one record genuinely naming both people.

Threads are allowed to be over. `standing` is one of opening / running /
pressing / dormant / settled / moot, and `standingReason` says why in the
record's own terms.

**`src/simulation/life-episodes.ts` — composition, not scripting.** An episode
family is stages, requirements, roles and exits; a beat is instantiated by
binding roles to people the world already contains, or it is not offered. Four
rules, enforced by the types:

- every requirement is answered from a canonical record, and the records that
  answered it come back with the beat;
- **causes stack and stay separable** — `causalInputs` is a list, one entry per
  requirement, so a beat cannot collapse into a single "because dad" tag;
- **no destination is authored** — escalation, recovery, dormancy, substitution
  and nothing-at-all are all reached the same way, by later requirements
  holding or not holding;
- **the player model ranks and does nothing else** — it is not an input to any
  function in the file.

A played beat writes ordinary canonical records tagged `episode:`,
`episode-stage:` and `episode-instance:`. Those tags are the entire mechanism by
which a later stage knows an earlier one happened. There is no episode store.

**`src/simulation/episode-bank.ts` — 9 families, 32 stages, 87 options.**

| Family                                      | Stages |
| ------------------------------------------- | ------ |
| `home.someone-is-not-all-right`             | 5      |
| `political.what-your-name-is-for`           | 5      |
| `civic.the-thing-nobody-else-turned-up-for` | 4      |
| `growing-up.a-friend-over-years`            | 3      |
| `school.the-thing-you-got-blamed-for`       | 3      |
| `home.the-week-that-does-not-balance`       | 3      |
| `work.where-you-stand-there`                | 3      |
| `money.the-thing-you-are-behind-on`         | 3      |
| `care.the-person-you-look-after`            | 3      |

7 of 9 branch on an earlier answer. 4 of 9 have a terminal stage where every
option leaves nothing behind. 30% of all authored options have
`aftermath: null` — a floor, because a bank where everything comes back has
promised the player a payoff for every decision.

`home.someone-is-not-all-right` is the generalized version of the packet's own
example. What is deliberately absent is the ending: no stage kills anybody, no
stage guarantees recovery, and no stage must follow another. Death, recovery,
estrangement and no escalation at all are reachable or unreachable according to
what is actually on the record.

`political.what-your-name-is-for` stops short of standing for anything.
Candidacy, committees, fundraising and elections are PR #85's.

**`src/presentation/life-narration.ts` — the time between the moments.** Every
sentence is derived from a record and carries the records it came from. There is
no branch that emits a contentless line: a person has a place, a household and
an age, so a quiet stretch is described by what the life actually contained.

Age is never a beat — a birthday appears as a clause on the elapsed sentence,
never as a sentence of its own. Quiet time passes unevenly (31 / 47 / 78 / 124
days, chosen deterministically from the date) because a fixed 45-day step made
four consecutive quiet gaps read identically.

The banned sentences are gone and a test keeps them gone: "Nothing this year
that anyone would tell a story about.", "Let the year go by — Some of them do.",
and the shape they belong to.

**`src/presentation/life-story.ts` — one ranking.** Formative bank, adult bank
and composed beats are ranked together, so a continuation competes with a
stranger rather than replacing it. `SituationCandidate.key` was widened to
`LifeSituationKey | \`episode:${string}\`` for exactly this reason: two rankings
would let a composed continuation lose to a card because they were chosen by
different code.

**`src/presentation/life-record.ts` — the journal.** WHAT YOU REMEMBER was an
always-visible list that grew with every beat until it was most of the page —
a debug log with a friendly heading. It is now behind a control, in chapters by
age, with people listed as people and open questions listed as open questions.
Nothing underneath changed; every line still comes from the same canonical
records. Lines too short to be an account of anything are suppressed rather than
rewritten, because a generated replacement would be the module inventing a
memory.

Episode choices reach the adaptive model at `enacted` strength like any other
played choice. Half of what a player did being invisible to the layer whose job
is noticing would have been the obvious next defect.

## J — Legislation

PR #79 is not accepted, so per the packet's instruction legislative bargaining
integration is **out of this wave and not reimplemented**. The
`commitment-seam.ts` that arrived with the #81 cargo is preserved unchanged,
including its closing note on how to converge with #79 when it lands. Political
scenes use the same illustrated/narrative presentation path as ordinary life
because they go through the same story surface.

## L — Profile-level political outlook

Not implemented, as instructed. It is banked as a future contract and was not
on this wave's critical path.

## O — Start Anywhere, reviewable content, causal composition, visible dynamism

**Start Anywhere** — the place selection is now the real long-term interaction:
a search field over a browsable list, with state/locality identity on each row
and the `LifePlaceProvider` coverage note shown honestly when nothing matches.
The formal jurisdiction name is searchable although not displayed. PR #77 is not
accepted, so **no unaccepted source bytes were borrowed and no rules were
fabricated**; the provider seam is unchanged, so binding a national corpus later
is a data change rather than a redesign.

**Reviewable content** — the authored content is declarative data in
`episode-bank.ts` and `setup-opening-bank.ts`, read by the composer and by
nothing else, so what the game can say is readable without reading the code that
says it. It declares no schema of its own, exports no browser and has no export
format: **adopting it into PR #83's registry is a mechanical change in one
direction.** Rebuilding that registry here is carved out.

**Causal episode composition** — see §D above. This is the substantive answer to
"dynamic does not mean random card selection".

**Visible dynamism** — see §3, which includes a gap stated plainly.

## M — Human verifiability

See §2 and §3.

---

# 2. The Pennywise proof

`npm run report:life -- <seed> <answer-index> <beats>` regenerates all of this.
Byte-identical between runs.

### Before and after, per answer

From `report:life proof-report 0 3`, the first four of nineteen:

```
1. `kitchen_late` (lived-personal) — chose `sit-down`, selected by fixed-opener
   - personal-ties:       0.000 → 0.500  (weight 0.00 → 0.25)
   - care-obligation:     0.000 → 0.350  (weight 0.00 → 0.25)
   - privacy-preference:  0.000 → -0.200 (weight 0.00 → 0.25)
2. `marcus_and_the_trip_fund` (lived-relational) — chose `keep-it`, fixed-opener
   - civic-order:         0.000 → -0.350 (weight 0.00 → 0.25)
   - privacy-preference: -0.200 → 0.100  (weight 0.25 → 0.50)
4. `ray_car` (lived-personal) — chose `say-thursday`, selected by disambiguation
   - next best was `career_evenings`
   - decision-style:      0.000 → 0.400  (weight 0.00 → 0.23)
   - security-stability:  0.000 → 0.300  (weight 0.00 → 0.23)
```

Item 4 is the disambiguation case the authority asks about by name: it was
chosen because removing the disambiguation term changes the winner, not because
it covered the most unobserved axis.

### What remained unresolved, and why it stopped

```
Stopped because: information-gain-floor. Best remaining was worth 0.87.
Dimensions still carrying no observation: none.

## Explanations still level
- `kitchen.why-sit-down` — openness 0.93. Sitting down can be about her or
  about the furnace, and the choice does not tell them apart.
- `career.debate-or-family` — openness 0.61. Going could be about getting
  further, or about owing the work an answer.
```

### A/B on the same world seed

`narrative-life.test.ts`, fixture `ab-proof`, age 34, deep calibration, answers
differing by option index:

| Claim                                                 | Result                                    |
| ----------------------------------------------------- | ----------------------------------------- |
| Same `worldSeedFor`                                   | identical                                 |
| Same person, same name, same cast, same kinship count | identical                                 |
| Model means differing by more than 0.1                | **more than 2 dimensions**                |
| Questions asked                                       | **different counts** between the two runs |
| Candidate set for the next situation                  | identical                                 |
| Candidate _scores_                                    | **every candidate scored differently**    |

A political answer changes what is asked and what is offered. It never changes
who the character's family is.

### Gameplay outweighing setup

Fixture `reversal`: calibrated one way, then played sixteen beats the other way.
The setup answers stay on the trail with their ordinals — nothing is deleted —
`observedBy.setup` is unchanged, `observedBy.enacted` rises, and dimensions are
either reversed in sign or strengthened by more than half again. Evidence
weights are 0.25 / 0.6 / 1.2, so two or three consequential choices carry an
estimate past neutral.

### Not shown to a player

`src/presentation/life-opacity.test.ts` holds three things shut: nothing that
renders imports `life-diagnostics`; no rationing vocabulary (`stakes`,
cross-pressure, `dormant`, thread or instance keys, salience, weight, dimension)
appears on any projected surface across three seeds and three ages, nor in the
journal, nor in a thread recap; and no authored line names an axis, a tier or a
political label.

---

# 3. The six mandatory play-proof paths

All in `src/presentation/narrative-life.test.ts`, with exact seeds. Setup
otherwise: `placeKey: "kentucky"`, `household: "shares-a-home"`,
`questionnaire: "skipped"` unless noted.

### 1 — A childhood thread appears, returns later, and turns on an earlier choice

Seed `proof-1-asked`, age 10, `play-formative-years`, chooser prefers
`ask` → `give`.

`home.someone-is-not-all-right/noticing` opens with the household companion
bound. Later, `.../asked-directly` runs with **the same person**, at a later
date. It requires `after-choice noticing=ask` and `days-since-stage noticing≥60`.

The same seed with chooser `tell-someone` **never reaches** `asked-directly` —
proved by assertion, not by absence of observation — and its recorded stage list
shows `noticing` with `optionKey: "tell-someone"`.

Linking records: the event written by `noticing` carries
`episode-instance:home.someone-is-not-all-right[household-companion=<id>]` and
`choice.ask`; the later beat's `causalInputs` cite that event's id, the
household membership record that bound the role, and the age check.

### 2 — A quiet stretch is narrated

Seed `proof-2`, age 41, six consecutive time-passes, no decisions. Elapsed
**more than 200 days**. Every sentence is attributable: a `sources` entry per
sentence, and every non-elapsed, non-place sentence cites at least one record.
None of the banned sentences appears. Seed `proof-2b` shows the birthday
arriving as a clause rather than a sentence; `proof-2c` shows six gaps producing
more than one distinct paragraph.

### 3 — An adult thread stays playable across beats

Seed `proof-3`, age 36, 18 beats. At least one episode instance reaches a second
stage with a later `lastPlayedAt` than its first. At least one person has more
than one appearance, and the journal names them with a count. Every open-thread
sentence is checked to contain no machinery vocabulary.

### 4 — Civic and personal coexist

Seed `proof-4`, age 33, 22 beats. Thread families include `civic` **and** at
least one of household / kin / companionship / care simultaneously. The civic
episode reaches more than one stage. More than one kind of scene appears in the
run, so composed beats and authored banks are mixed rather than one replacing
the other.

### 5 — An important-looking choice comes to nothing, and still counts

Seed `proof-5`, age 35. The test finds a beat whose stage is **not** `ordinary`
tier and which offers an option the author marked `aftermath: null`. Taking it:
`futureDueItems.length` is **unchanged** — nothing was scheduled — while the
player model's trail grows and `observedBy.enacted` rises. Valid evidence, no
consequence.

### 6 — A low-key earlier fact decides a later one

Seed `proof-6`, age 10. "Say nothing and keep track" is the least dramatic
option at the opening beat: no confrontation, no disclosure. It is also the only
option that unlocks `kept-quiet-and-it-continued`, and nothing in the
presentation of the first beat said so. The same seed choosing `cover` never
reaches that stage.

### Visible dynamism — and the gap

**Proved:** two seeds played eight beats each diverge structurally — different
thread families, different available beats, or different episode instances — and
have different live-thread counts. `traceStorySelection` shows the exact records
that made each beat eligible.

**Not proved, and stated plainly as the authority instructs:** at the moment a
life is _created_, two seeds produce the same **shape** and differ only in their
names — same thread families, same counts, same two eligible beats.

The cause is upstream and specific. `generateQuickCharacterHistory` in
`character-history.ts` writes one fixed template for every summarized life: one
parent, one peer, one teacher, one household, two schools, one civic club, one
teen job. The seed decides the names inside that template and nothing about its
shape. The narrative layer is reporting that faithfully — it is not failing to
notice a difference; there isn't one.

Varying it is a change to an accepted Stage 6 writer, which AGENTS.md freezes
and this wave does not own. So it is **pinned as a test that fails the day
somebody fixes it**, rather than tuned until it passed:

```
it("still gives two cold starts the same shape, which is a known upstream gap")
```

Accordingly, this report does not describe the _generated_ life as dynamically
composed. It describes the _played_ life as dynamically composed, which is what
the evidence supports.

---

# 4. Carve-outs

`tests/narrative-wave-ownership-boundary.test.ts` measures this branch against
`6311dd6` and fails naming any path belonging to another branch. It passes.

| Branch        | Owns                                                                                                       | This wave                                                                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#83**       | generic content-bank registry, Content Browser, content export                                             | Not rebuilt. Content is plain typed data declaring no schema of its own, with no browser and no export format. A clean adoption seam.                                                                                  |
| **#84**       | causal-trace / observer inspector, trace export, multi-seed harness                                        | Not rebuilt. What ships is `life-diagnostics.ts` — pure functions returning data and Markdown, no screen, no `?view=` route. A test asserts this wave added no file under `src/ui/` and did not touch `src/App.tsx`.   |
| **#85**       | campaign, candidacy, committee, fundraising, election results                                              | Not rebuilt. `election-contests.ts` untouched. The political episode family stops at "meet the party" and never reaches a ballot.                                                                                      |
| **#86**       | graphics bank, asset intake, environment, scene registry, title tableau, surface binding, graphics runtime | Not touched at all. `src/authoring/`, `src/environment/`, `art/`, `scripts/art-asset-factory/`, the scene/pose/raster/character presentation modules and the graphics player components are all in the forbidden list. |
| **#77 / #79** | national places / legislative bargaining                                                                   | Consumed nothing unaccepted; neither blocked this wave.                                                                                                                                                                |

**Provenance for #84.** Every new narrative and Pennywise record carries honest
explicit link fields: `ThreadAnchor` names `store`, `recordId`, `stableKey`,
`at`, `sequence` and `role`; `EpisodeCausalInput` names the requirement and the
anchors that satisfied it; `ThreadLinkBasis` names the identity the grouping
rests on. The inspector can register these later **without inventing an edge**,
because where no link is recorded the projection reports none.

---

# 5. Remaining defects, gaps and queues

## Known gap — carried, with an owner

**Cold-start life shape is uniform.** Cause, evidence and reasoning in §3.
Owner: whoever owns `generateQuickCharacterHistory` and the Stage 6 baseline.
Pinned by a failing-when-fixed test. This is the one place where the authority's
instruction to "state the remaining gap plainly" applies, and it is stated.

## Content debt

- **17 of 53 calibration items are ranked last**: 15 `policy-docket-flagged`
  (legible as a policy docket) and 2 `playtest-abstraction-flagged`. They are
  reachable only after the rest is exhausted, and a long run does reach the
  tail. Re-authoring them as lived scenes would remove the tail entirely.
- **Episode role coverage.** `colleague` binds only where two people share an
  active organization; in a generated adult life that is rare, so
  `work.where-you-stand-there` runs less often than the other families. Not a
  defect in the family — the requirement is honest — but the work generator
  gives it little to bind to.

## Graphics — the seam left for #86

This wave adds no art and no scene binding, per the carve-out. What it leaves is
the thing #86's runtime needs: every beat carries its family
(`NarrativeThreadFamily` — household, school, work, civic, political, care,
money, incident, kin, companionship, promise), its bound cast with real person
ids, and its place, so a scene family and a set of composited people can be
chosen from the beat without any new plumbing. Binding that is #86's to do.

The garment / gray-mannequin rejection is untouched by this wave: no character
component is promoted, nothing is dressed, and nothing here makes an unfitted
candidate reachable from runtime.

## Not attempted

- Section L profile-level political outlook — banked as instructed.
- Legislative bargaining integration — out, per the packet, while #79 is
  unaccepted.
- Nationwide place data — out, per the packet, while #77 is unaccepted.

## One repair to a check on accepted main

Packet 26's ownership boundary (`tests/authoring-ownership-boundary.test.ts`)
was written while PR #82 was in flight and measured the **working tree**. That
was correct then and wrong the moment the packet landed: on `main` it stopped
describing Packet 26 and started asserting that whatever branch happens to be
checked out stays inside Packet 26's surfaces — which no later branch agreed to,
and which this wave's own routing forbids. The range is now closed at both ends
(`b986fbe..6311dd6`), so it keeps the claim it was written to make. The
in-flight shape the CI harness exercises is unchanged.

`tsconfig.node.json` gained no changes: adding the presentation tree to it in
order to typecheck a CLI turned out to drag in `import.meta.glob` and a set of
pre-existing errors in test files belonging to other systems, so the report
script lives in `scripts/` with its logic in a typechecked module instead.

---

# 6. Acceptance state

**Not accepted. Left unmerged for independent audit and human play**, as the
packet requires.

What a human should do with it:

1. `npm run dev`, New Game, take the **Full calibration**. It should read as a
   life opening, not a survey, and it should stop on its own.
2. Play twenty beats of an adult. Watch whether the time between them is told,
   whether people come back, and whether anything that came back turned on
   something you did earlier.
3. Start a ten-year-old and play to eighteen. Watch whether the quiet years say
   anything.
4. Open the journal. It should read as a life, not a log.
5. `npm run report:life -- <your seed> 0 6` and check the trace against what you
   saw.

Passing automated tests are not human visual acceptance, and this report does
not claim they are.

---

# 7. The omnibus deliverables

The addendum of 2026-09-04 added three required print documents to this run.
All three are written, published to the same Drive folder as this report, and
carried in the repository alongside it. Each labels every claim with one of the
five states the addendum requires, and none describes an open-PR capability as
shipped.

| Document                                                       | Drive id                                                                                                                               | Repo copy                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 60B_CLAUDE_FULL_VISUAL_UI_AND_GRAPHICS_COVERAGE_AUDIT          | [`1nahTWoRoklCpM2kvWwwuYQiqmXqrt6tLA72_lc8N36Q`](https://docs.google.com/document/d/1nahTWoRoklCpM2kvWwwuYQiqmXqrt6tLA72_lc8N36Q/edit) | `docs/60B-full-visual-ui-and-graphics-coverage-audit.md`          |
| 60C_CLAUDE_FULL_DIALOGUE_CONVERSATION_BRANCHING_AND_COPY_AUDIT | [`1hOZ-bE-_gB6fhqKvEFJ4biN47Fd3-LDeXATpBlDoRcs`](https://docs.google.com/document/d/1hOZ-bE-_gB6fhqKvEFJ4biN47Fd3-LDeXATpBlDoRcs/edit) | `docs/60C-full-dialogue-conversation-branching-and-copy-audit.md` |
| 60D_OUR_CIVIC_DUTY_ENGINE_AND_SYSTEMS_FIELD_GUIDE              | [`1Ay9c2BtbucI4WtPcrLA73oJPbTUgSXYv4yBV5Eu84DI`](https://docs.google.com/document/d/1Ay9c2BtbucI4WtPcrLA73oJPbTUgSXYv4yBV5Eu84DI/edit) | `docs/60D-our-civic-duty-engine-and-systems-field-guide.md`       |

**60B** covers the seven-route map, six screens, control-state matrix,
typography, colour, motion and accessibility, the 111-asset manifest census,
scenes, poses and raster tiers; a coverage/disposition matrix over 62 numbered
visual requirements sorted into categories A–E; a P0/P1/P2 backlog; and a final
"IF I SAT DOWN TO GENERATE ART TOMORROW" with exact generation specifications.

**60C** covers the conversation architecture field by field, a complete
dialogue-path inventory with the four authored banks counted exactly, the nine
episode families stage by stage, five plain-text branch diagrams tracing
action → listeners → claim/knowledge/perception → effect → later callback with
UNKNOWN marked wherever no link is recorded, a measured copy audit, "WHAT OUR
DIALOGUE SYSTEM CAN DO TODAY", "WHAT IT CANNOT DO YET", "TOP 25 DIALOGUE
IMPROVEMENTS BY PLAYER VALUE", and 15 content-expansion rules.

**60D** is the owner's field guide: thirteen plain-English chapters (including
"WHAT HAPPENS WHEN I CLICK ADVANCE TIME?", "HOW NPCS KNOW THINGS", "HOW PENNYWISE
LEARNS ABOUT THE PLAYER", "HOW THE GAME CAN CREATE A 50-YEAR LIFE WITHOUT A
SCRIPT", "THE ENGINE'S UNUSED MUSCLE", "WHAT WOULD BREAK IF WE DID THIS WRONG?"
and "HOW I CAN TEST THIS GAME WITHOUT READING CODE"), eight plain-text diagrams
A–H, a catalogue of 44 named systems described with the same eleven points each,
and a glossary. It is written to be read without opening any source file.

One defect was found by the audits and fixed inside this wave rather than filed:
five classes this wave shipped unstyled (`game-story`, `game-passage`,
`game-journal`, `game-journal-toggle`, `game-search`) plus two pre-existing ones
(`game-day`, `game-saves-damaged`). `src/player/player.css` gained ~180 lines,
one e2e assertion was made case-insensitive for the resulting uppercase
transform, and `npm run validate` was re-run green.

---

_Report written 2026-09-04 against implementation head `479dbdb`. The branch
tip is later: it carries this report and the removal of a Playwright scratch
config that should never have been committed._
