# Director lead: work order (Oct 27, 2026)

Current as of 2026-10-27, 05:25 UTC (director lead, from the owner's 01:30 Eastern ruling: "if the circumstances are right in the simulation, they should be callable, and the English engine handles the words")

The director lead owns `src/director/` (the story director, `src/director/data/situation-types.json`, casting, scheduling, outcomes) and the scene path in `src/bench` (story, talk box). The words-and-scenes lead owns `src/english`, `data/english`, election day and printed news. We split the scene line: the director lead builds producers, the words lead words them, and the two message each other directly (owner, Oct 27; overrides "sessions never message each other" for the scene line only). The lead follows `AGENTS.md`, `.agents/rules/smart-and-look-first.md`, the skills `lead-session`, `scenes-from-life`, `scene-standard`, `words-engine` and `player-screen-text`, `docs/design/story-director.md`, `docs/design/scenes/owner-scene-examples.md` and the Oct 26-27 rulings at the top of `docs/coordination/OWNER-DECISIONS.md`. Status goes in the channel (`docs/coordination/LEADS-2026-10-24.md`, `## Director`) every two hours.

**Model and helpers.** Opus, high effort. No coding helpers by default. The five Sonnet scene researchers (A-E, below) are not helpers: they write only fact packets and pool items, never code.

**Sequence.** One PR at a time, in the order below; the next opens when the last is with a merger. When a box runs out: push what passes, set the item honestly with one Notes line, post a status block, take the next.

**Every PR.** Line 1 `Pool item: <id>`; `Lead: director`; a Done-when table with a "Scene standard" row (record written back by id, how each role was cast, two speakers differing by trait or tie, four stances, reached in ordinary play) and a "Screen text checked" line; proof in a played year (`buildBenchWorld`, every module installed, a place drawn from all 56, the seed named, the firing records named by id); a release declaration in `docs/release/changes/`. Local gate per `local-gate` on changed files with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"`. Never merge my own PR; never force-push; one head per recheck. Line changes to banks go to the words lead by message or PR comment (`Review: words` on any bank file I touch).

## The measured starting point (main at 820801c06)

- `situation-types.json` holds 67 types. 27 causes in 21 types wait on a producer that does not exist (`awaitingProducer`); 14 types have no trigger at all. 29 types can never fire: the 14 without a trigger and 15 whose every cause is waiting.
- The director scores only records that name a watched person (`ledger.ts`; the rule at `docs/design/story-director.md:225`, "a moment in someone else's life stays a journal line unless it reaches the player"). A law passing, a story printed, a price changing, a stranger's death or a national event in the news reaches no one's scene unless the record names the player or their household.

## 1. Scenes from circumstance (`director-scenes-from-circumstance`)

- **Specific.** A circumstance producer in `src/director/circumstance.ts` with its rows in `src/director/data/circumstances.json`. Each row is a kind of circumstance: the record kinds that open it, the place kinds it happens at, who has a reason to be there (a person the record names, affects or reached as news; a tie of the player's; a member, lobbyist, reporter or staffer whose office record puts them at the place), the cast score (ties, traits, the record's facts; highest score wins, record id breaks ties, no roll) and the situation type it stages. On each day the producer reads only that day's new records through `core.logByKind` (no history or world scan), resolves where the player is that day from records (home; the workplace on a work day; the body's building on a sitting day; the town in public), and writes a moment into the player's ledger whose cause is the record and whose counterpart is the person cast. The existing scheduler (`scheduling.ts`: pace, repeat window, yields, interrupt line, filter) decides scene, waiting scene or journal line; no second path. Rows at minimum: a law passed or taking effect (a constituent it reaches stops the player in the street), a printed story (someone who read it brings it up), a price change (a shopkeeper or neighbor), a hire and a death in the town, a national event in the news (someone at a place talks about it), and the capitol hallway (a member, lobbyist or reporter on a sitting day). Every one of the 29 never-firing types is given a circumstance row or a producer, or is deleted with its bank keys named to the words lead. Must not change: any `src/core2` engine; the scheduler's pace and interrupt rules.
- **Measurable.** `src/director/circumstance.test.ts` builds `buildBenchWorld` in a drawn place (place and seed printed), plays one year live with the player filed and, in a second world, serving, and asserts: each of the seven row families above stages at least one scene somewhere in the two worlds, each citing its record id and a cast person who is not the subject; no scene fires on a day with no matching record; the same test rerun with another drawn place passes. `npm run words:coverage` shows zero types with no trigger and zero `awaitingProducer` causes. `npm run speed:year` not more than 20% slower than its base.
- **Attainable.** The player's whereabouts are read from existing records (household, job and work spans, body sittings); a place kind with no record behind it yet is a registered stopgap in `src/director/data/stopgaps.json`. Lines: the words lead words the new rows; until a row has its own pieces, the type's existing pieces voice it.
- **Realistic.** Opus lead alone.
- **Time-bound.** 8 hours (to 14:00 UTC Oct 27). The 29-type sweep may land as a second PR in the same item if the first is with a merger.

## 2. The hard-coded scenes go (`director-opening-on-the-director-path`)

- **Specific.** The opening's fixed stages (`opening-sequence.ts`, `opening-story.ts`, `speech-builder.ts`, `data/opening-story.json`, `data/opening-address.json`) and every scene reached only by a fixed call (the filing visit, the polling place, office scenes called by name from `src/bench`) are staged through the director path: a record opens each one, the scheduler binds it, roles are cast from the world. The opening keeps its order (the owner: "the opening has the right structure") but every figure, picture and line is read from records; a number or a law named in code or a fixed bank slot is removed in the same PR (owner, Oct 27). The old fixed calls are deleted, and the PR counts what was removed.
- **Measurable.** A grep test fails on any direct call from `src/bench` to a scene builder other than the director's scheduled bindings; two drawn places' openings differ in figures, laws named and cast, each citing record ids; the opening test, filing-visit and polling-place tests pass on the director path; bench screenshots of the opening in both places.
- **Attainable.** Election day itself is the words lead's (its deliverable 5); I move only its staging onto the director path, after its PR lands or with its author's agreement on a shared file.
- **Realistic.** Opus lead alone.
- **Time-bound.** 6 hours, after deliverable 1 is with a merger.

## 3. The researchers' packets (rolling)

- **Specific.** Five Sonnet scene researchers write fact packets to `docs/design/scenes/from-life/<slug>.md` (`scenes-from-life` shape) and file `scene-*` pool items with the gap named and `lead: director`: A home and family; B the campaign's middle, victory and concession; C legislating; D the executive; E constituents, donors, corruption and press. Session ids arrive by message. For each item I build the producer (a circumstance row where one fits), ask the words lead for the lines by message or PR comment, and record the episode in my status block. A packet whose record does not exist becomes an engine item with the owning lead in `lead:`.
- **Measurable.** Each consumed packet names its item, the row or producer added, and the record id that fired it in a played year; the status block counts packets consumed and producers added.
- **Attainable.** A packet needing an engine record nobody keeps is not waited on: its item says so and the next packet is taken.
- **Realistic.** Opus lead builds; researchers on Sonnet.
- **Time-bound.** 2 hours per packet once deliverable 1 is on a branch.

## 4. The scene web rows

- **Specific.** Every producer row in `circumstances.json` and every live cause in `situation-types.json` carries four fields the scene-web script (`words-scene-web-from-lives`, with the words lead) reads: trigger record kind, place kind, cast rule, outcome record (what the scene writes back). An exported reader `sceneWebRows()` in `src/director/circumstance.ts` returns them.
- **Measurable.** A test asserts every row has all four fields and that each outcome record kind is one some engine writes; the words lead confirms the script reads them.
- **Attainable.** Built inside deliverable 1's PR; the script itself is the words lead's.
- **Realistic.** Opus lead.
- **Time-bound.** 1 hour, inside deliverable 1.

## Status cadence

A block every two hours in `## Director`, naming producers added, packets consumed and PRs. When usage runs out: push, set items honestly, last block, stop.
