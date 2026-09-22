# Modularity, depth and interaction audit

Measured 2026-09-22 against **main at 273fd2b8**, with a second reading of
**origin/codex/build-6146df3-source at 6146df35** — the build the owner plays —
wherever the two differ. Every claim below that says "measured" was produced by
running the path in this container: `vitest`, `tsc --noEmit`, and small probe
scripts written against the real modules and deleted afterwards. Claims that are
a reading of source and not a run are labelled **read, not run**.

No result here is CI-verified. Every run above was local, in this container. The
branch carrying this document is pushed, but its validation runs were cancelled
deliberately: CI has two job slots repo-wide and main needs both, so a
documents-only run was not worth starving it.

---

## The one-paragraph answer

The game already contains a real, shipped, player-reachable mod loader. A JSON
content pack installs into a live saved life from the Options screen, is
validated at load with a named reason for each refusal, is namespaced so it
cannot overwrite built-in identities, and survives a save round trip. It was
installed and round-tripped in this audit. Its entire vocabulary is **one thing**:
an ordinary life scene with a premise, two or more choices, a line of prose per
choice, and a number of minutes. A pack cannot change money, a relationship, a
trait, a job, an office or anything else, and a field the API does not know is
refused rather than ignored. So the honest statement of where the game stands
against RimWorld and The Sims is not "not modular yet" — it is **the loader
exists and the effect vocabulary is empty**. That is a much shorter distance than
it looks, and it is the one gap that changes the answer for every other system.

---

## Part 1 — How modular is it actually

The test used is the one that matters: **to add one new instance of the thing a
system is about, how many files must a person edit, and is any of it a
hand-written list, union or switch someone must remember to update?**

Three states are distinguished throughout:

- **Data-driven** — a third party adds content without touching code.
- **Developer-extensible** — one or two edits by someone with the repo open.
- **Closed** — the vocabulary is a hand-written union and the effect is
  hardcoded at each consumer.

### The scoreboard

| System                                           | Add one instance costs                                                                 | State                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------ |
| Source domains (`src/source/domains/`)           | **1 new directory, 0 edits elsewhere** — measured                                      | Data-driven (developer)  |
| Map geometry packs                               | 1 `.generated.json` dropped in `src/maps/geometry/states/` — glob-loaded, read not run | Data-driven (build time) |
| Runtime content packs (ordinary-life scenes)     | **1 JSON file, no repo access at all** — measured                                      | Data-driven (true mod)   |
| Municipal legislature packs                      | Corpus record; registry is generated                                                   | Data-driven (corpus)     |
| Life path / education opportunities              | 1 array entry, 1 file                                                                  | Developer-extensible     |
| Episode families (life scenes with requirements) | 1 array entry, 1 file                                                                  | Developer-extensible     |
| Episode _fact keys_ (new precondition)           | Union + producer, both in `life-episodes.ts`                                           | Developer-extensible     |
| People traits                                    | **1 file, 1 edit — measured** (see the correction below)                               | Developer-extensible     |
| Future-transition handlers (the scheduler)       | 1 import + 1 line, or a composed registry from outside                                 | Developer-extensible     |
| Decision consideration sources                   | 0 central edits — the type is open                                                     | Developer-extensible     |
| State legislature rule packs                     | Hand-written object + 1 array line, 1 file (2566 lines)                                | Developer-extensible     |
| Campaign/party activity forms                    | Union + parallel array + `Record` entry, 2 files                                       | Closed-ish               |
| Art candidate generations                        | **~7 edit points across 3 files — measured**                                           | Closed                   |
| A new entity kind                                | 1 line in a 142-member union                                                           | Closed                   |
| A new system's state                             | 1 field in a 125-field `HistoryStore` interface, `schemaVersion` bump                  | Closed                   |

### The best thing in the repository

`src/source/domains/` is genuinely discovered by directory listing.
`scripts/source/registry.ts` reads the directory and refuses any directory that
does not export a `sourceDomain`, so a domain joins acquire / compile / manifest
/ validate / replay **by existing**.

Measured: `listDomainNames()` returned 25 domains and `loadDomains()` loaded 25.
A scratch 26th domain directory was created with nothing but an `index.ts`;
both counts went to 26 and the new domain appeared in the gated list, with **no
edit anywhere else**. The directory was then removed. This is the pattern the
rest of the codebase should be measured against, and it was built here already.

### The correction to the trait anchor

The briefing for this audit carried two anchors. One of them is materially
wrong, and it changes the size of the trait work.

**Claim as relayed:** the mind catalog holds an exact allow-list that rejects any
trait it was not told about in advance, so adding a trait means a second
hand edit there.

**Measured:** it does not, for this trait set. `assertLifeMindContent` in
`src/simulation/life-mind-content.ts:98` builds its allow-list from
`peopleTraitDefinitions()`, which is derived from the `PEOPLE_TRAITS` array. A
sixth trait, `patience`, was added to `src/simulation/people-trait-definitions.ts`
and to nothing else. Then:

- `tsc -p tsconfig.app.json --noEmit` exited 0.
- An opening life was generated, `ensurePeopleTraits` was run over an NPC, and
  the new trait came back with a real seeded record
  (`personality-tendency_372fcb19716863c4`) alongside the original five.
- `assertProductionCatalogBoundary` on that world threw nothing.

So the cost of a sixth trait is **one file, one edit** — much better than
reported. The allow-list is a real wall for a trait set defined somewhere other
than `PEOPLE_TRAITS`, which is what the legislation lane hit; it is not a wall
for this one.

### The other anchor, restated precisely

`PREPARED_FAMILIES` is no longer a spread of generation-named static imports; it
resolves through `import.meta.glob`. The edit cost is still real. Adding
`engine42` requires, on main:

1. `src/presentation/private-candidate-manifests.ts:22` — the `CandidateEngine`
   union.
2. `src/presentation/private-candidate-manifests.ts:46` — the hand-written
   `{engine29,engine34,...}` brace list inside the glob pattern.
3. `src/presentation/engine-people29-data.ts` — a `candidateRegistry("engine42")`
   const, a spread into `PREPARED_FAMILIES`, and a spread into
   `ENGINE_PEOPLE29_TEMPLATES` (three points).
4. `src/presentation/engine-people29-review.ts` — a const and an entry in the
   `candidateGenerations(...)` list (two points).

Seven edit points, three files. Two of them are the classic remember-to-update
shape: a closed union and a brace list that must agree with it.

**This differs on the played build.** `codex/build-6146df3-source` adds
`src/presentation/runtime-art.ts`: a content-addressed artwork snapshot
(`ocd-runtime-art/v1`) fetched at runtime from `/__content/manifest.json`,
validated on its schema and its id, and overlaid on the bundled glob. That is a
second genuine mod seam — installable art that does not require a rebuild — and
it exists **only on the build he plays**, not on main.

### The closed-vocabulary census

Measured across 864 non-test source files: **471 closed string-literal unions of
three or more members.** The largest are `EntityKind` (142 members,
`src/simulation/types.ts`), `AdultLifeSituationKey` (35), `LifeHistoryRecordFamily`
(29), `LegislativeActionKind` (22) and `EpisodeFactKey` (22).

This is the honest shape of the codebase. It is not sloppy — most of these unions
are how the game refuses to guess, and `EntityKind` is only a type-level
constraint on `createStableId`, not a runtime gate. But 471 of them is the
measure of the distance to "a third party adds content without touching code".

### The ceiling under all of it

`World` has 23 top-level fields and `schemaVersion: 15`. `HistoryStore` has
**125 hand-declared record arrays** — one per system, each its own typed field on
one interface. Every system that wants durable state adds a field there. That
interface, not any individual catalog, is the real modularity ceiling: a mod
cannot add state, because there is nowhere for a mod's state to live.

### The registry that exists but does not drive the game

`src/content/content-registry.ts` is a proper registry: adapters register, the
index is built deterministically, a duplicate bank id throws, and the header
explicitly says nothing counts and a bank arriving later is ordinary. It is
exactly the right shape.

It is consumed by two things: `src/ui/ContentBrowserView.tsx` and
`src/cli/content-export.ts`. **No gameplay path reads it.** It is a review index
over content that is wired elsewhere by hand. Worth knowing before anyone
mistakes it for the content spine.

---

## Part 2 — How deep the systems are

### The decision engine is the real spine, and it is deep

`evaluateDecision` is called from **23 non-test modules**. A decision is a
subject, options, weighted considerations and constraints, each consideration
carrying a `sourceType`, a direction, an importance, a confidence, an
explanation in words, and source references back to what it rests on. Traces can
be durable. `assertNpcAutonomousApplication` exists to police that NPCs apply
their own decisions.

`DecisionSourceType` is `` `${DecisionSourceNamespace}:${string}` `` over seven
fixed namespaces — `mind`, `belief`, `information`, `social`, `context`,
`institution`, `domain`. **There is no central list of source types to update.**
Roughly 70 distinct ones are in use. This is the most genuinely open extension
point in the game and it should be the model for the rest.

### Where the depth is real

- **Legislative procedure.** `RuleValue<T>` is a three-way known / unknown /
  not-applicable with a required explanatory note on every unknown, and
  `requireKnown` throws differently for the two absences so a caller cannot
  conflate them. Nine state packs and the Charlottesville municipal pack are
  compiled from cited constitutional and statutory text, field by field, each
  with its own source and verification status.
- **Episodes.** Families, stages, roles, requirements, options — all data, with a
  requirement vocabulary that can ask for a fact, the absence of a fact, an age
  floor, an age ceiling, a role, a role filled by someone of at least an age, a
  time-of-day window, and a prior stage. That is a real authoring language.
- **Offices are derived, not listed.** `supportedCivicOfficesFor` reads the
  accepted executive rule packs for a place and yields the offices from them.
  There is no hardcoded office table. Add a state's executive pack and its
  offices appear.

### Where it is shallow, stated plainly

- **Traits never change.** `recordTraitChange` exists, takes a justifying event
  and a required reason, and refuses a drift with no cause. Measured: it has
  **zero production call sites** — the only callers in the whole repository are
  three test files. A person's temperament is seeded once from their own stream
  and is frozen for the life of the save. The machinery for "experience changes
  who you are" is built and nothing drives it.

  **Now a requirement, not a finding.** The owner, 2026-09-22: "every character
  should be able to change with varying levels of resistance." Measured: there
  is no resistance concept anywhere in the simulation — the only match in the
  tree is an unrelated episode key, `early.home.chore-resistance`.
  `recordTraitChange` takes a justifying event and a reason and applies the new
  value outright; nothing weighs how hard this person is to move, and nothing
  makes one person harder to move than another. So this is a design gap on top
  of a wiring gap: the call sites are missing, and the function they would call
  does not yet model what he asked for.

- **The player has no temperament, at all.** Measured: after `ensurePeopleTraits`
  over the controlled person, all five traits came back with `recordId: null`.
  `traitConsiderations` requires a non-null `recordId`, so **the played
  character's own traits contribute exactly nothing to any decision, ever.** This
  is deliberate, and more precisely than it first looks: `validateMindProvenance`
  (`src/simulation/mind.ts:851`) refuses a trait record for the controlled
  person **whose provenance is not `player-choice`** — not one for the player as
  such. The seeding path writes `authored` provenance, which is why it skips
  you. The game declines to author your temperament; it does not decline to let
  you have one.

  **Now a requirement.** The owner, 2026-09-22: "obviously you as a character
  need your own. it's how you are portrayed to people." That reasoning matches
  the guard rather than overriding it — your traits should come from what you
  choose, which is what `player-choice` provenance is for. So this is not a
  design to reverse but a seam built for exactly this and never filled: what is
  missing is a path that records your traits from your own choices, and
  consumers that read them when other people size you up.

- **A trait's effects are not data.** `traitConsiderations` takes an array of
  `TraitLean` written as a TypeScript literal at each call site, and
  `TraitLean.trait` is typed `PeopleTrait` (`src/simulation/people-traits.ts:235`)
  — the closed five-member union. A trait cannot say what it argues for; each
  consumer says it, and can only say it about those five. So the sixth trait that
  costs one file to define costs one edit _per situation it should matter in_,
  no third party can reach any of them, and until then it is inert. Measured: the new `patience` trait produced zero
  considerations everywhere. _What it would take:_ move the leans into the trait
  definition, or into the content that raises the decision — this is the single
  change that turns the trait system into a trait framework.
- **Coverage is the shallow part of government, not the model.** Executive
  authority packs: federal plus five states (KY, NE, AK, MN, IL). Legislature
  packs: nine states. Municipal: **1 admitted of 144 in the inventory.** The
  model is deep; it is instantiated thinly, and the file says so honestly with an
  explicit `UNRESEARCHED_JURISDICTIONS` list.
- **A mod can spend time and say a sentence.** See Part 3.

---

## Part 3 — How the systems actually interact

### The mod seam, measured end to end

`RuntimeContentPack` (`src/simulation/runtime-content-packs.ts`) is a real
runtime extension API:

- Declared `api: "ordinary-scenes-v1"`, versioned `major.minor.patch`, with
  dependencies between packs and a topological install order.
- Every id must start with `mod.`, so built-in identities cannot be overridden.
- Every scene and duration key must sit inside its own pack's namespace.
- Text is length-bounded and control characters are refused.
- Packs are stored on the world and travel with the save, under a distinct
  snapshot format version.
- The import UI (`src/player/ContentPackWorkspace.tsx`) is mounted in
  `PlayerGame.tsx` under **Options** — normal play, not a developer route — and
  states plainly that importing spends no game time and that the life is
  unchanged if the file is bad.

Measured in this audit: a pack with one scene and two choices was written as
JSON, installed into a generated life through `importContentPack`, appeared in
`runtimeLifeScenes`, and came back intact through
`serializeWorld` → `deserializeWorld`.

Also measured: the same pack with an `effects: [{ kind: "money", minor: -500 }]`
on a choice was **refused** — `Content pack has missing or unsupported fields.`

That is the whole finding. A choice may carry a `label`, an `aftermath` line of
prose, `elapsedMinutes`, and an `approach` of `ask` / `listen` / `direct`. It
cannot touch money, relationships, knowledge, traits, jobs, health or the world.
Against the standing requirement that content be able to say _"in this kind of
decision, argue this much for options of this shape"_, a pack today can only
declare that it exists.

Unknown fields are **refused**, not ignored with a stated reason, so a pack
written for a later API cannot load at all on an earlier build.

**Decided by the owner, 2026-09-22, in his own words: "ignore it and say so.
that shouldnt hold the game back."** So strict refusal is wrong here. A pack
carrying something this build does not understand should load, the unknown part
should be skipped, and the game should say which part was skipped and why. The
`shape()` helper inside `assertRuntimeContentPack` is where that changes: today
it throws when a key is neither required nor optional. This is a requirement
now, not an open question, and **failing soft with a stated reason is the
standard the effect-vocabulary work has to meet** — it is what lets a pack
written for a later vocabulary keep working on an older build instead of
bouncing.

### Can a mod pack supply policy propositions? No, and the lock is threefold

Asked by the playtest lane after a Springfield, Illinois walk found the policy
catalogue built but unreachable. Measured here 2026-09-22 against
`claude/project-thread-4y594d` at `7e52b6b6`, whose `src/simulation/` is
unchanged from main at `273fd2b8`. Run, not read.

The short answer: **a pack cannot supply a proposition, and removing the
production boundary alone would not let it.** There are three separate locks and
each one is sufficient by itself.

**Lock 1 — the pack vocabulary has no room for one.** `assertRuntimeContentPack`
admits exactly nine top-level keys, of which `scenes` and `durations` are the
only content. Measured refusals, all with the same message
`Content pack has missing or unsupported fields.`:

- a pack carrying a top-level `propositions` array;
- a pack carrying a top-level `policyCatalog` object;
- a valid scene carrying a nested `propositions` array.

The same pack without them was accepted. This is the empty-effect-vocabulary
finding above in a second place: the seam admits prose, not facts.

**Lock 2 — nothing reads a pack into a catalogue.** `runtimeLifeScenes` is the
only consumer of installed pack content in the whole tree. Measured: after
installing a valid one-scene pack into a world holding
`createProductionPolicyCatalog()`, `runtimeLifeScenes` returned 1 scene and
`policyCatalog.propositionOrder` was still length 0. A pack lands on
`world.contentPacks` and goes nowhere else. Even a pack permitted to carry a
proposition would deposit it where no reader looks.

**Lock 3 — the production boundary counts, and it counts more than
propositions.** `assertProductionCatalogBoundary` throws when any of nine
catalogue lists is non-empty. Measured with one authored proposition in an
otherwise production world:
`A production world carries no policy domain definitions until sourced ones
exist; found 1.`

Note which label that names. It refuses at `domain`, not at `proposition` —
because a proposition cannot stand alone. `assertPolicyCatalogIntegrity` requires
every proposition to reference an issue in the same catalogue, and every issue a
domain. Measured: a catalogue holding one proposition and no issues was refused
with `Policy proposition references a missing issue`. So the catalogue is a
connected graph, and "unlock propositions" is really "unlock domains, issues and
propositions together". The empty production catalogue itself passes the
boundary, as it should.

Confirmed from a second direction by the playtest lane, and re-checked here:
the boundary is not a construction-time check. `world.ts:549` calls it from
`validateWorldIntegrity` whenever the world's lineage is `production`, so a
production world carrying a proposition fails validation however it arrived —
built, edited later, or deserialized from a tampered save. There is no route
that sneaks one past by loading rather than creating.

**What this costs, and why it is worth naming.** The three writers the playtest
lane identified — `evaluatePoliticalBeliefFormation`
(`src/simulation/political-belief-formation.ts:80`), `recordPublicPosition`
(`src/simulation/politics.ts:137`) and `recordCampaignCommitment`
(`src/simulation/politics.ts:174`) — were re-checked here: outside tests, the
only file in the tree that calls any of them is `src/simulation/demo.ts`. That
half of the finding holds.

So the shortest route is **not** a small check. It is three changes that have to
land together: an extension to the pack vocabulary that can carry a policy
graph; a reader that installs pack-supplied definitions into the world's
catalogues; and a deliberate relaxation of `assertProductionCatalogBoundary`
that distinguishes _authored fiction a player chose to install_ from _synthetic
fixture substrate_, which is the distinction the boundary was written to
enforce and the one that makes the relaxation safe rather than a hole. The
boundary's own comment already anticipates being "relaxed deliberately in the
same change rather than drifting open".

That third change is where the owner's standing rule does real work. Pack
identities are already forced into the `mod.` namespace, and packs already
declare `authority: "authored-fiction"`. A boundary that counted
`authority: "authored-fiction"` definitions separately from unattributed ones
would let installed content populate the catalogue without ever letting a
synthetic corpus back into a save — content as data, discovered not imported,
with provenance kept in the record and off the player's screen.

### The two personality systems, confirmed independently

This was established by another lane tonight; it was re-measured here and holds.

- `PEOPLE_TRAITS` (five traits, −2..+2) is read by **10 decision-producing
  modules**: `people-contact`, `people-study`, `people-study-plan`,
  `people-promise`, `people-family-plan`, `claim-contradictions`,
  `living-world/party-chapters`, `life-callbacks`, `childhood`,
  `contextual-scene-producers`.
- `LIFE_MIND_IDS` (two tendencies, three values) is read by exactly **two**
  modules: `life-personality.ts`, which writes it, and `life-conversation.ts`,
  which renders dialogue from it.
- The intersection of those two sets is **empty**. They share the mind store and
  no consumer.

### The twelve decision callers that read no personality at all

31 files call `evaluateDecision`; 23 of them are production. One of those is
`decisions.ts`, the engine itself. So **twelve production modules decide
something and read no temperament at all**:

`legislative-bargaining`, `legislative-member-decisions`, `press/desk`,
`press/matters`, `press/responses`, `press-interview-producers`,
`political-belief-formation`, `living-world/party-evolution`,
`campaign-opponents`, `campaign-life-activities`, `civil-personnel-actions`
and `run-b-conversation`.

Read the source types they do use and the shape is clear: bargaining reasons from
`context:section-in-the-bill`, `context:offer-below-request`,
`context:analysis-in-hand`, `context:earlier-refusal`,
`context:inducement-offered` and `social:working-history`; member votes from
`institution:stated-commitment`, `context:local-beneficiary-in-bill`,
`context:stated-fiscal-limit` and `social:working-relationship`. These are good,
real, institutional reasons. They are simply reasons about the _situation_, with
nobody's temperament in them. **Two legislators identical on the record and
opposite in every trait vote and bargain identically.**

This is the "systems that look connected and are not" shape the briefing
predicted, and it is the largest instance of it.

**It is not, however, cheap to close, and an earlier version of this document
said it was.** That claim contradicted this document's own Part 2 finding two
pages up. `TraitLean.trait` is typed `PeopleTrait`
(`src/simulation/people-traits.ts:235`) — the closed five-member union. So
wiring `legislative-member-decisions.ts` to `traitConsiderations` today would
not connect two systems; it would hardwire those exact five traits into
legislative bargaining, which is the thing the owner ruled out when he asked for
the trait system itself rather than those five. Writing those ten lines would be
building the wrong thing faster.

The modular-legislation lane, which re-measured this rather than taking it on
trust, reports a replacement framework on `origin/claude/people-and-life-4qpuwb`
at 7af87594 — not on main and not measured here — under which a decision
publishes a declaration and a trait pack refuses a lean whose scopes do not
include the consuming decision's scope. That refusal is the point: closing these
twelve is then a decision, per trait, about whether it is readable in a
government scope, not a mechanical pass. The same lane reports two live blockers
under it, also unverified here: `leansForDecision` returns a qualified string
key while `personTrait` reads only the enum, so there is no bridge; and
`loadTraitPacks` has one production caller, `life-mind-content.ts:105`, for
content validation only, so nothing loads a registry during play.

So the honest statement is the one this document makes everywhere else: the gap
is that a trait cannot declare what it argues for. The twelve silent modules are
that gap's largest symptom, not a separate wiring oversight.
_(Corrected 2026-09-22 after the modular-legislation lane checked this against
live code; the type and the counts above were re-verified here on main.)_

### Coupling nobody intended

- **The content registry couples review to gameplay content by import, but
  nothing couples gameplay to the registry.** Nine adapters reach into nine
  gameplay modules to describe them. Change a gameplay catalog and the reviewer's
  index changes; change the registry and play does not. The dependency runs one
  way only, which is correct, but it means the index can silently stop describing
  what the game actually runs and no test of play would notice. _(Read, not run.)_
- **`openingChoiceMinutes` special-cases the `mod.` namespace.** It branches on
  `definition.key.startsWith("mod.")` to preserve the frozen API contract, so the
  duration rule for modded scenes and for built-in scenes is different code. That
  is a deliberate, commented freeze, but it is a place where the mod API has
  already leaked into a gameplay function, and a second such leak is how a mod
  API stops being a contract.
- **The scheduler seam is open, and opening it further is not yet safe.**
  Every system that acts on its own over time registers a
  `FutureTransitionHandler`, and registries compose:
  `composeFutureTransitionHandlerRegistries` is exported from
  `src/simulation/future-transitions.ts:135` and is already used from five
  modules outside it, including `src/presentation/life-time-handlers.ts:19`,
  which layers a caller's own registry ahead of the ordinary one. The
  composition root at `src/simulation/campaigns.ts:1777` composes fourteen
  things, thirteen of which are already factored out as `create*Registry()`
  calls or exported `*_HANDLERS` arrays, with one inline block of about ten
  entries left. So this is a composition root, not a monolith, and a module
  that wants to add a handler can.

  The real finding is in how composition resolves, at
  `future-transitions.ts:137-148`. **A shared key resolves first-match-wins by
  argument order, with no duplicate detection** — the loop returns the first
  registry that answers and nothing checks whether a later one also claimed the
  key. And **`routine` is single-valued**: `registries.find(r => r.routine)`
  takes the first, and every other registry's routine is silently dropped. Both
  are safe today because one author controls the argument order in one place.
  Both become silent shadowing the moment third-party content can register: a
  pack could take over mortality or election day, or lose its routine entirely,
  and nothing would say so.

  This is the same shape as the headline. The extension point exists; what is
  missing is the part that would make extending it safe. _What it would take:_
  duplicate detection that names the two claimants, and a decision about what
  more than one routine means.

  **The owner's fail-soft rule does not reach this, and the distinction is the
  point.** Skipping an effect a build does not know is failing soft; two packs
  silently fighting over election day is failing **silently**, which is the thing
  his rule forbids. A collision here has to be said out loud, not absorbed.

  **Answered 2026-09-22 — skip the second and say so; do not refuse the second
  pack.** Recorded as a decision with its reasoning rather than as settled fact:
  it was taken by the coordinating session applying the owner's standing rule
  ("Ignore it and say so. That shouldn't hold the game back."), and he has not
  confirmed it himself yet. The reasoning: a collision on one key is exactly the
  unknown-content case, so the piece is skipped, the reason is stated, and
  everything else that pack brought keeps working. Refusing the whole pack makes
  one overlap cost the player every other thing in it, which is the failure
  shape ruled against each time it has come up, and it is not the RimWorld
  behaviour named as the target.

  Two conditions carried with it, both of which this audit endorses on its own
  evidence. The skip must be **visible** — named on a surface a player or modder
  can read, carrying both pack names and the key, not silently logged; a
  silent skip is precisely the defect shape recorded elsewhere in this document.
  And the resolution **order must be stated and stable** rather than incidental,
  so the same two packs resolve the same way on every load and a modder can
  predict which one wins. Today the order is argument order at one composition
  root, which is stable only because one author controls it. _(Corrected 2026-09-22 after the fix-main lane re-measured
  an earlier, wrong version of this finding; every claim above was re-verified
  here.)_

---

## What this means for the standard

Against "modder-friendly like RimWorld and The Sims", the position is:

1. **The loader is real and shipped.** That is the hard part and it is done.
2. **The effect vocabulary is empty.** A pack can spend minutes and print a
   sentence. This is the gap that makes everything else look worse than it is.
   And by the owner's decision of 2026-09-22, whatever fills it must fail soft:
   a pack naming an effect this build does not know loads anyway, skips that
   part, and says which part and why.
3. **The state schema has no room for a mod.** `HistoryStore`'s 125 fields and
   `schemaVersion: 15` mean mod state has nowhere to live. Until there is a
   namespaced place for it, a mod cannot remember anything.
4. **Effects are written at consumers, not declared by content.** The trait leans
   are the worked example: a trait cannot say what it argues for. Fixing that one
   pattern is what turns registration into modding.
5. **The good patterns already exist in this repository.** Directory-discovered
   source domains, the open decision source type, `RuleValue`'s honest unknowns,
   offices derived from packs. Nothing here needs inventing; it needs applying.

---

## Defects found, with their owners

Recorded, not fixed — this was an audit.

| Finding                                                                                                                                                                | Evidence                                                                                                                                               | Suggested owner                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Traits never change, and resistance is not modelled at all — now an owner requirement, not a finding                                                                   | Measured: `recordTraitChange` referenced only by 3 test files; no resistance concept in the tree                                                       | People and life                                    |
| The played character has no trait records — now an owner requirement; `mind.ts:851` already permits it under `player-choice` provenance                                | Measured: all five `recordId: null` after `ensurePeopleTraits`                                                                                         | People and life                                    |
| No legislative module produces a `mind:personality` consideration, and `TraitLean` is typed to the five hardwired traits so wiring one today would hardwire those five | Measured: 12 of the 23 production `evaluateDecision` callers read no trait, the engine aside; `people-traits.ts:235`                                   | Modular legislation with people and life           |
| Content packs refuse an unknown field instead of skipping it with a stated reason — the owner has decided it should fail soft                                          | Measured: `Content pack has missing or unsupported fields.`                                                                                            | Whoever owns the pack API                          |
| Policy propositions cannot be supplied by a mod pack, and three separate locks each prevent it on their own                                                            | Measured: pack shape refuses `propositions`; `runtimeLifeScenes` is the only pack reader; `assertProductionCatalogBoundary` refuses at `policy domain` | Whoever owns the pack API with modular legislation |
| The content registry indexes content no gameplay path reads                                                                                                            | Read: 2 consumers, both review surfaces                                                                                                                | Hardcoded-content audit                            |
| Registry composition resolves a duplicate key first-match-wins with no detection, and drops every routine but the first                                                | Read: `src/simulation/future-transitions.ts:137-148`                                                                                                   | Fix main                                           |

## Corrections, including this audit's own

- The mind catalog allow-list does **not** block a sixth people trait. Measured.
- `PREPARED_FAMILIES` is a glob, not a static-import spread; the cost is ~7 edit
  points across 3 files, and the union plus brace list are the fragile part.
- The played build carries a runtime art snapshot layer that main does not, so
  any claim about art modularity must say which tree it was measured on.
- **"Cheap to close" on the twelve personality-blind decision modules was
  wrong**, and is corrected above. It contradicted this document's own finding
  that a trait's effects are not data: `TraitLean` is typed to the five
  hardwired traits, so wiring a legislative module to it would hardwire those
  five rather than connect anything. Caught by the modular-legislation lane.
- **My own first version of the scheduler finding was wrong** and is corrected
  above. It called `campaigns.ts` a monolith through which all autonomous
  wiring passes. Thirteen of its fourteen arguments are already factored out,
  and `composeFutureTransitionHandlerRegistries` is exported and used from five
  other modules. Caught by the fix-main lane; the better finding underneath it
  is the silent resolution of duplicate keys.
- **This document drifted from its own published copy, twice, within minutes.**
  The fail-soft boundary and three rows of the table above were written straight
  into a Drive render and never back into this file, so the two disagreed until
  they were reconciled at c8c96e72. That is precisely the failure this document
  reports against the content registry — an index that quietly stops describing
  what it indexes — committed here by its own author, and it went unnoticed
  because a silent no-op replaced nothing rather than failing loudly. **The rule
  taken from it: write the repository copy first and render from it, never edit
  during the upload. A render is a copy, not the source.**

Three of this audit's four own errors were the same kind: a claim established by
reading rather than by running the path — the exact failure it was commissioned
to avoid. The fourth was the same shape one level up: a change made to the
published copy without running it back through the source. All four are recorded
here rather than edited away, because a document whose method claim is "measured,
not inferred" is worth nothing if its exceptions are invisible.
