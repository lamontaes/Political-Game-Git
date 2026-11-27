# Assignments, Nov 26, 2026 (the CTO's full write-up)

One section per running session. A session's /goal points at its section here. The section is the whole job: no follow-up goals.

**Every session follows check-in.md** (this folder):

- builders only; never block;
- read #10377 with `?since=`;
- "typecheck clean" means `npm run typecheck`;
- skip a file another session changed in 2 days (`git log --since=2.days --remotes -- <file>`), list it, and take the next.

**Branch from `train/nov26-c`** until PR #10682 lands, then from main.

**How words land** (the owner's rulings of Nov 8, 9, 11, 24 and 26, in OWNER-DECISIONS):

- in batches;
- a part counts once it passes the sameness gate and pre-grade and plays right at three drawn places;
- one words PR with its scenes before and after;
- the CTO trains it;
- he grades small batches by voice and never approves line by line.

**Game logic only** (owner, Nov 26: "I only want game logic in these files. They all have to do something"). src/ holds only code the game runs. A file nothing runs is deleted.

- **Dev mode (Advanced) is game** (owner, Nov 26: "dev mode is a part of the game... when you click advanced... so that everything can be tested in-game by playing the game... it should use everything the same. It just has different permissions"). Its panels go through the same engines and front doors as play, with permission to do more. They never use a back door.
- Tests, checks and proofs (the m0 and m1 checks), measurement tooling, test kits, fixtures and notes live outside src/.

**The engines, laid out like a real game** (the CTO's call, Nov 26; the owner: "format this like a real game... I just want you to build this correctly"):

- **Core** is the runtime: kernel, state, record, clock, plug, choice engine, starting and saving a world, and the play server.
- **The simulation engines** are people, elections, jobs and businesses, laws, budgets, legislative bodies, executives, news, clock and places, and the past.
- **Story** is what's said and what happens in a scene (the English engine, the director, scenes and words). That includes scene places like the clerk's office.
- **Screens** is the interface layer: menus, the talk box, cards, the UI kit and input. It shows what the other engines give it and writes no sentences of its own. Sentence-building in screen files today (card.ts history lines, printed-words.ts, archive-words.ts) moves into Story's composers, and the screen displays it (Story's E4).
- **Dev mode** is Advanced: the same engines, more permissions.

**The Opus finisher plugs it in** (owner, Nov 26: "I'll have it do the plugging in after they all finish... run the tests, do the fixes, and then plug it into the core, and then it'll be done"). Each engine session builds its engine to its front doors and lists what's left. It doesn't do the risky cross-engine wiring. After every engine session finishes, one Opus session runs the whole test suite, fixes what's red, and plugs each engine into the core through the plug (`CoreModule`, `registerModule`): the front-door split, the hooks and the engine list. That is when the game is done.

**Merging is the CTO's.** Sessions never merge.

**Use the advisor liberally** (owner, Nov 26, 10:47 p.m.: "be liberal with your, Fable advisor button that you can press, because it does not use Fable usage... take full advantage of it"). It costs no Fable usage. Call it before each PR, before every design choice, when a result surprises you, and before you post "done". Tonight it caught claims resting on headers, wrong counts and unproven fixes before they went out.

---

## Story (one session; the owner: "It's all just going to be called story now")

The English engine, the director, scenes and words are one engine, Story. The audit is story-2026-11-26.md in this folder (rows C1 to C11, G1 to G6, the screens, the skills). The Story split session finishes porting #10390 and Talk engines finishes its last fix, then both stop. Build on what they land.

### Engine items, in order

- **E1. One family.** Merge `director` and `english` into `story` in tests/guards/families.json. Regenerate CODEOWNERS with scripts/guards/codeowners.ts. AGENTS.md and the docs say "Story". Story also takes the screens' word files: src/bench/printed-words.ts, archive-words.ts, race-words.ts, words.ts, guide-terms.ts and budget.ts's `lineName` (screens-2026-11-27.md SC3; adjusted Nov 27).
- **E2. The pieces** (C1 to C6), in src/english, each shown before and after at three drawn places:
  - a person's name through said-as.ts (`personSlot`, `nameOnceThen`), never an id (scene-talk.ts:1759, card.ts:119);
  - pronouns the person's own (owner: "avoid the pronoun or use the person's own"; journal-words.ts:293, move-fit.ts:24);
  - spoken dates "June 7th" and written ones "June 7" (director/words.ts:68 `spokenDate` becomes day-words.ts `dateSaid`);
  - lists with no serial comma;
  - one possessive and one capital helper;
  - director/words.ts's word helpers move into src/english.
- **E3. The guard** that refuses a person's name, pronoun or date built outside src/english. It must go red on today's code first.
- **E4. Front doors.** The screens (card.ts, printed-words.ts) and every other engine reach Story only through its entries (the composers, said-as, named director entries in families.json). The reach-ins baseline goes down. `raceStanding`'s line choice (campaign.ts:511) and race-words' own list rule come with SC3's files; the list rule folds into C5's one list rule (adjusted Nov 27).
- **E5. Notes out of the game's data** (C9). The "about" and "why" strings in src/director/data/*.json move to docs (rulings into OWNER-DECISIONS first, word for word). scripts/guards/game-only.ts also checks data files.
- **E6. Skills, 15 into 3:**
  - `story`: words-engine, scene-producers, scene-pictures and press-desk-reach;
  - `story-writer`: story-writer, civic-prose, scenes-from-life, speech-writer, journal-writer and news-writer;
  - `story-check`: pre-grade, words-stamp-read and scene-standard.
    player-screen-text stays with screens, and lives goes to the people engine. Keep every owner quote and rule, with the .agents mirrors and AGENTS.md list.
- **E7. Long functions as named steps,** structure only, with the records digest identical: `planSpeech` (speech-outline.ts:2014, 992 lines), `composeBlocks` (opening-story.ts:323), `composeScene` (scene.ts:110), `householdMoments` (journal.ts:328) and printed-words' longest. Then `offerChoices` and `sayNow` (conversation.ts) after Talk engines posts "done".
- **E8. Map row 4.** The Journal's remaining moment builders take the reader's events as they are.
- **E9. The player's speech through the one planner** (C8, `SG-WORDS-player-speech-not-planned`), once the split's outline planner lands.

### Words, after E2 (so lines are built on the final pieces)

Every scene comes from a real-lives pattern (docs/story/scene-patterns.json) and the element bank (docs/story/elements/). His words already live in the repo, so read .claude/skills/story-writer/references/his-words.md and everything it indexes first. Write many versions per slot, chosen by the facts of the moment. Every scene writes back (a promise, a stand, a volunteer, a donor, a vote). Never change or delete a line he graded. No job dialogue.

- **W1. Deciding to run and announcing it,** many ways (owner, Nov 17): a word to a friend, the party office, a public moment, just asking for votes. Who heard is part of it.
- **W2. Filing:** the office, the forms, the fee or signatures, who's there, what goes wrong.
- **W3. The campaign:** door knocking, donors, volunteers, endorsements ("Campaign first", Nov 25).
- **W4. The race and election night.**
- **W5. Speeches:**
  - the addresses a player hears (outline rows in data/english/outlines.json, using only facts `planSpeech` gives; a new fact is an engine item);
  - the player's own speeches (announcement, stump, debate, victory, concession) in data/english/parts/speech-stages.json.
    One theme, a plain stand, and points that build.
- **W6. Elements for the 9,249 untied bank lines** (tests/guards/english/line-register-baseline.json `unelementedBankLines`), biggest banks first. Never delete them (his Nov 25 ruling).
- **The packet:** after each part, play three drawn lives and write docs/grading/<date>-<part>/packet.json (each scene's cast, lines numbered, replies offered and taken, what followed, element ids). Post the path on #10377 for the CTO's grading page.

**Rules:**

- No new systems: point copies at the one function.
- Never edit bank lines he graded; never loosen a check.
- Structure-only items keep the digest identical. Items that change what players read show before and after.

**Done when** E1 to E9 and W1 to W6 are each built, or listed with why they can't go. Post "Story:" every 30 minutes.

---

## Talk engines (finishing)

Its merge is done (#10664). Its last two jobs:

1. **The 13 type errors** in conversation.ts:7020 to 7098 (`shapeReply`'s `L` is inferred as `{ asks: boolean }`). Type it on the newest head (c59b72cb), prove it with `npm run typecheck`, and post `ready #10664 <head>`.
2. **The story split's talk delta.** Port onto the engine each change story/first-evening made to conversation.ts, scene-talk.ts, purpose-scene.ts and purpose-arcs.json since the merge base ea60e9eb: the reply-moves removal, reason-for and reason-against, and the planner-told address talk. The split posts the list. If it hasn't within an hour, read those four files' diffs yourself. Prove it with the dumps, the tests and the full typecheck.

**Done when** both are pushed and "Talk engines: done" is posted with the heads. Then stop. `offerChoices` and `sayNow` as steps go to Story (E7).

---

## History (finishing)

Its queue is done. Confirm its last commits (b0c8c64f) are in train/nov26-c (`git merge-base --is-ancestor`), and post the head of any later commit that isn't. Then post "History: done", naming what stays open: the outcome web's one read waits on Reach-ins' cycle cuts, and Reach-ins says when it can move. Then stop.

---

## Story split (finishing)

Port #10390 (story/first-evening; 273 files since ea60e9eb; the ledger on claude/loving-euler-mx46dm) in its pieces:

1. **Piece 0 first:** the sameness gate (scripts/sameness), the liked-lines-stay and bank-elements guards, and the packet scripts (first-evening-packet.ts, housemate-talk-counts.ts).
2. The outline planner, the address, person history and loading, the Journal, the news, and the elements data.
3. **The talk piece goes to Talk engines:** post its change list on #10377, and don't build it yourself.
4. Words as data only, in batches, under the rule above.
5. Rewrite #10390's "Done when" to that rule.

**Done when** every one of the 273 files is landed in a PR or listed with why. Then close #10390 with a pointer to the ledger and stop.

---

## Past and Day One

Files: modules/jobs.ts, modules/business.ts, jobs-elsewhere.ts, the jobs, employers, offices and century `opening-*` files, past-* and electorate-century*, plus `buildPopulation`'s job half (population.ts) for item 5. The 12 people opening files (kin, partnership, income, income-funding, personality, upbringing, key-people, private-tuition, profile, people, ties, public-schools) are the People engine's (people-2026-11-26.md; adjusted Nov 27). In order:

1. **Item 5, slice 1:** the century runs the place's own offices (mayor, council or board, county offices) from the place's office rows, from 1925. The digest may move for local seats, not state or federal. Post local results against real ones: incumbents re-elected, party splits by lean, term lengths and staggers. Then slices 2 and 3 (the local bodies' prior bills through the bill engine; the race records from the century's rows), then delete past-elections.ts and past-laws.ts.
2. **The business engine:** closures and openings to Census BDS (about 8 to 9% closing and 9 to 10% opening a year), at their cause.
3. **The small-town openings case** (jobs-elsewhere.ts): commuters apply to nearby towns' postings.
4. **The out-of-work stock** (14 to 20%, entry bursts, job-loss inflow 2.6% a month against CPS 1.3%), at its cause.
5. **Item 4, route (a):** day-one jobs as vacancies the engine's choice fills. A behavior change; the old holder tests are rewritten to the new rule, never looser.
6. **Job-loss news:** the size-by-reach `publicRecord` rule plus the story kind row in src/core2/data/press/briefs.json, on one branch. Don't land the flag until Story has the words; post the fields.
7. **Part-time legislators hold other work**, and **press owners draw a payroll** (pool items opening-part-time-legislators-hold-other-work and opening-press-owners-draw-a-payroll).

8. **Doors the screens need (adjusted Nov 27):** read-only queries in modules/jobs.ts and the business engine for positions, player applications, seekers and trading, when Screens asks on #10377 (screens-2026-11-27.md, the door list).
9. **civic-inputs.ts joins your opening files** (elections EL9; adjusted Nov 27): it generates the world's civic institutions on day one. Its write into public organizations is Core item 7's.

**Done when** 1 to 9 are each built as PRs with proof, or listed with why.

---

## Core (approved by the owner, Nov 26, about 11:15 p.m.)

The owner: "the core is where engines plug in, and it can also be very friendly for modders." The audit is core-2026-11-26.md in this folder (rows K1 to K13).

**What the core is:** the kernel (ids, dates, draws, fixed-point money, hashing), one game state with an owner for every part, one record (the write path, the event bus and the reader), the clock (the day loop and advancing), the plug (`CoreModule` and `registerModule`), parameters and data, starting and saving a world, and the choice engine. It imports no engine. Engines plug in.

**Start** once train #10682 has landed green and Reach-ins' stack has landed. Branch from main. Reach-ins folds into this session: its open items (the residents runtime map, the cycle cuts, the reach-ins left) are part of items 8 to 10.

**Items, safest first:**

1. **Measure, then guard,** one engine opening another's module table (`moduleState`), and rows edited in place. The guard's baseline may only shrink (K8). It starts with the people engine's opens in both directions, measured in people-2026-11-26.md P5 (adjusted Nov 27). The screens' 157 table reads (92 game screens, 53 dev, 12 checks) are in it too (adjusted Nov 27).
2. **The workshop out of the core,** by a re-runnable script coordinated with Cleanup's test mover (K9): src/core2/tooling into scripts/, the test kits and fixtures (`*-test-kit.ts`, `*-kit.ts`, `*-fixture.ts`, law-test-start.ts) into tests/support, and bug-report.ts and gov-test-report.ts into scripts/. money-watch.ts and past-sessions.ts go to the screens' dev folder. Also trait-pairs.ts, turnover-check.ts and circle-turnover-check.ts, which no game file imports (people P11; adjusted Nov 27). Widen the game-only guard's test pattern to catch kits and fixtures. The screens' milestone proofs and tools (screens SC6) go with the same script (adjusted Nov 27). Also gov-test-clock.ts (elections EL8; adjusted Nov 27).
3. **One `core` family** in tests/guards/families.json: the shared kernel, plus life.ts (the day loop), the record log, the reader and the cash journal (journal.ts and journal-state.ts, filed under people today; renamed cash-journal*.ts by the move script; people P12, adjusted Nov 27). Give the 11 orphan files (src/districts, src/rules/laws, src/release) their families. Coordinate with Story's #10683, which made `story`.
4. **The missing date helpers in the kernel** (weekday of a date, the nth weekday of a month, the last day of a month), with every copy pointed at the kernel (K10): elections-calendar.ts, school.ts, voting.ts, finance-state.ts, work-pay-period.ts, and the rest of the 95 files' date sums. Formatting is left as it is. The kernel's `spokenDate` (dates.ts:113) goes to Story's day-words, in step with Story's E2.
5. **A determinism guard:** no `Math.random`, `randomBytes`, `randomUUID`, `Date.now`, `performance.now` or argument-less `new Date()` in game code outside dev panels, the play server and scripts (K11).
6. **The record log as one module:** `retainLog` and decision-detail.ts's condense and forget steps (`durableLog.set` :274, `forgetEntry` :411) together, with the reader beside them. pre-start.ts becomes a `module.history` source like every other engine, so the reader imports no engine. `HistorySource` joins `CoreModule` (K3, K4). The reader exposes the history sources' existing `row` (past-history.ts:139-140) as the one way a screen or Story opens a record the history names; no new hook (screens SC2a; adjusted Nov 27).
7. **Cross-engine writes through the owner's door:** official-pay.ts:476 (jobs), officials.ts:988 (background people), civic-inputs.ts:157 (public organizations) (K8). Also past-elections.ts:568-576 (offices terms), voting.ts's one write into an executive table and past-laws.ts's write into a people table, from your own guard's baseline (elections EL3; adjusted Nov 27).
8. **Fill-in out of state.ts:** `fillInPerson`, `fillInIdentity`, `promoteHusk`, `openOpeningPeerTies` and the 16 person-building imports go to the people engine behind a hook (K7). Then choice.ts calls the act path without `coreAPI` (Reach-ins' choice.ts to state.ts cycle, 14 edges).
9. **One way to start a world:** `newGame` (saves.ts:186) takes the whole recipe (the place draw with `passOver`, the pre-start, the opening warm-up, the player). The screens' `buildBenchWorld` (src/bench/world.ts:434) and the replay both call it. Coordinate the warm-up with Past and Day One (K5). The play server's session operations (start a life, load, save, advance) are Core's doors; the route table itself stays in Screens (screens SC4; adjusted Nov 27).
10. **The engine list as data:** the modules life.ts installs come from one list, and the direct calls (`affectAt`, `withGrief`, `admitResidents`, `openingWorkCommitments`) go through hooks. Reach-ins' cycle and reach-in items are finished here; the cycle baseline goes down. The people engine's 11 side registries (people P9) move onto the hook shape this item defines, by the People session. Measured for the final review: 74 `register*` functions game-wide (adjusted Nov 27).
11. **Last, or the Opus finisher's:**
    - the front door split (K6), where money and work operations move behind the budgets and jobs engines' doors, the cash journal stays core as the one money ledger, `coreAPI`'s builder (state.ts:881) is split by area, and the subject hooks leave `CoreModule`;
    - then one folder per engine, by a re-runnable move script, after the other sessions land.

**Rules:**

- Structure only: the fixed-seed records digest is identical, and `npm run typecheck` is clean.
- Wide moves are re-runnable scripts.
- No new systems and no new registry: `registerModule` and `core.modules` are the registry.
- Never loosen a check.
- Saves don't matter yet (his ruling), so don't hold a change for save compatibility.

**Done when** 1 to 10 are each built, or listed with why. Item 11 is built or handed to the Opus finisher with a plan.

---

## Reach-ins (finishing; folds into Core)

Its stack is the core's ground floor.

1. Merge `train/nov26-c` into the stack's top, keeping both sides' intent. Prove it with `npm run typecheck`, the families and cycle guards, and the records digest, then post the head.
2. Finish the slice in hand: the reach-18 cuts.
3. Post "Reach-ins: done", listing what's left: the residents runtime map, the cycle edges and the 298 reach-ins, each with its cause. Those become the Core session's items 8 to 10.

Then stop.
---

## People (approved by the owner, Nov 27, about 12:04 a.m.)

The audit is people-2026-11-26.md in this folder (rows P1 to P13).

**Start** once train #10682 has landed. Branch from main.

- Items 1 to 5 wait on nothing else.
- Item 6 waits for Core item 1 and Story's E4. Item 7 waits for Core item 3. Item 8 waits for Core items 8 and 10.
- Leave people.ts, person-life.ts, modules/record.ts, modules/counted-moves.ts and household-cost.ts alone until the Story split lands #10390's engine half.
- Leave population.ts's job half alone until Past and Day One's item 5 lands.

**Items, safest first:**

1. **Delete the old trait system (P2)** with every reference, and rewrite docs/systems/traits.md to the live route. Proof: the digest is identical.
2. **Content as data (P3).** Digest identical.
3. **Long functions to named steps (P10),** skipping the files held above. Digest identical.
4. **One household income (P1).** A behavior change. Proof: the digest diff explained, plus three seeded towns' home values and rents for retired households, before and after, against the Census medians.
5. **One "how I feel about you" read (P4),** in its two steps. A behavior change. Proof: a seeded test where a grudge holder is moved less by the speaker, and two members who sit together are moved by their sittings.
6. **People's doors (P5, P6):**
   - the entries list in families.json;
   - outside callers through the doors, by one re-runnable script;
   - the opens in both directions through the owners' doors.

   Core item 1's baseline only shrinks.

7. **Housing as its own engine (P7):** a family in families.json, with its doors. No folder move.
8. **The ladder (P8, P9):**
   - one husk maker and one promote;
   - fill-in's job and office parts through those engines' own fill-in hooks;
   - demotion as a state on the person, after its place-id readers are measured;
   - the 11 side registries onto Core's hook.

**Rules:**

- Structure-only items keep the fixed-seed records digest identical and `npm run typecheck` clean.
- Behavior items carry their proof.
- No new systems and no new registry.
- Never loosen a check.
- Never edit bank lines.
- Wide moves are re-runnable scripts.
- Use the Fable advisor liberally; it doesn't use Fable usage.

**Done when** 1 to 8 are each built, or listed with why.

---

## Screens (decided by the CTO under the owner's full ownership, Nov 27, about 12:08 a.m.)

The audit is screens-2026-11-27.md in this folder (rows SC1 to SC8).

**Start** once train #10682 has landed. Branch from main.

**Adjusted Nov 27 (elections map):** your offices door adds the elections map's queries (an office by id, a term by id, open vacancies, a person's terms, a seat's office and an office's seats). The elections door (a contest, its filings, its result, the races open to a person) is the Elections session's; switch your elections reads to it when it lands, instead of adding your own.

**Items, safest first:**

1. **Dev mode in the installed game (SC1),** in its four steps. The packaged-app smoke test is the proof. handler.ts's mount goes now; the CTO's train reconciles it with the Story split.
2. **Not-game out (SC6),** by a re-runnable script, with Core item 2.
3. **Families (SC7),** in Screens' own families.json branch.
4. **The client split (SC5),** structure only, with the browser tests as proof. play.mjs waits for the Story split.
5. **Routes by screen (SC4),** structure only. handler.ts waits for the Story split. The session routes call Core's doors once Core item 9 lands.
6. **Imports after Story takes the word files (SC3).**
7. **Reads through doors (SC2):**
   - record detail after Core item 6;
   - live state through each engine's door, from the door list, with one builder per door;
   - the already-filed rule to elections;
   - Core item 1's baseline only shrinks.
8. **The small ones (SC8).**

**Rules:**

- Structure-only items keep the browser tests green and the fixed-seed records digest identical, with `npm run typecheck` clean.
- Behavior items carry their proof.
- Dev mode stays in the game.
- Screens write no sentences.
- No new systems and no new registry.
- Never loosen a check.
- Never edit bank lines.
- Wide moves are re-runnable scripts.
- Use the Fable advisor liberally; it doesn't use Fable usage.

**Done when** 1 to 8 are each built, or listed with why.

---

## Elections (decided by the CTO under the owner's full ownership, Nov 27)

The audit is elections-2026-11-27.md in this folder (rows EL1 to EL9).

**Start now.** Branch from train/nov27-a (#10699) until it lands, then main.

**Items, safest first:**

1. **Party identity to its own leaf file (EL1),** with appointments.ts re-exporting. Digest identical.
2. **The election calendar's rule files to elections' family (EL7),** in Elections' families.json branch.
3. **The elections door (EL2):** a contest, its filings, its result, and the races open to a person (the already-filed rule moves in). Screens and Story switch over.
4. **Elections' entries (EL6):** campaign-views.ts, electorate.ts and parties.ts, and outside reads through the entries.
5. **Reads through the doors (EL2):** its own 76 office reads and news' 15 elections reads, to the doors that exist now and to the missing ones once Screens and item 3 land them.
6. **The two big files split by concern (EL4),** structure only, after the Story split lands campaigns.ts and voting.ts.
7. **The side registries onto Core's hook (EL5),** after Core item 10.

**Rules:**

- Structure-only items keep the fixed-seed records digest identical and `npm run typecheck` clean.
- No new systems and no new registry.
- Never loosen a check.
- Never edit bank lines.
- Wide moves are re-runnable scripts.
- Use the Fable advisor liberally; it doesn't use Fable usage.

**Done when** 1 to 7 are each built, or listed with why.

---

## Cleanup (Codex, unchanged)

Its current goal stands: main's failing tests fixed at their causes, outside the files above, with every known-red edit in one branch (`cleanup/nov27-known-red`).
