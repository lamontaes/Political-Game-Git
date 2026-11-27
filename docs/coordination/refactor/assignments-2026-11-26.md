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

**Merging is the CTO's.** Sessions never merge.

**Use the advisor liberally** (owner, Nov 26, 10:47 p.m.: "be liberal with your, Fable advisor button that you can press, because it does not use Fable usage... take full advantage of it"). It costs no Fable usage. Call it before each PR, before every design choice, when a result surprises you, and before you post "done". Tonight it caught claims resting on headers, wrong counts and unproven fixes before they went out.

---

## Story (one session; the owner: "It's all just going to be called story now")

The English engine, the director, scenes and words are one engine, Story. The audit is story-2026-11-26.md in this folder (rows C1 to C11, G1 to G6, the screens, the skills). The Story split session finishes porting #10390 and Talk engines finishes its last fix, then both stop. Build on what they land.

### Engine items, in order
- **E1. One family.** Merge `director` and `english` into `story` in tests/guards/families.json. Regenerate CODEOWNERS with scripts/guards/codeowners.ts. AGENTS.md and the docs say "Story".
- **E2. The pieces** (C1 to C6), in src/english, each shown before and after at three drawn places:
  - a person's name through said-as.ts (`personSlot`, `nameOnceThen`), never an id (scene-talk.ts:1759, card.ts:119);
  - pronouns the person's own (owner: "avoid the pronoun or use the person's own"; journal-words.ts:293, move-fit.ts:24);
  - spoken dates "June 7th" and written ones "June 7" (director/words.ts:68 `spokenDate` becomes day-words.ts `dateSaid`);
  - lists with no serial comma;
  - one possessive and one capital helper;
  - director/words.ts's word helpers move into src/english.
- **E3. The guard** that refuses a person's name, pronoun or date built outside src/english. It must go red on today's code first.
- **E4. Front doors.** The screens (card.ts, printed-words.ts) and every other engine reach Story only through its entries (the composers, said-as, named director entries in families.json). The reach-ins baseline goes down.
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

Files: modules/jobs.ts, modules/business.ts, jobs-elsewhere.ts, opening-*, past-* and electorate-century*. In order:
1. **Item 5, slice 1:** the century runs the place's own offices (mayor, council or board, county offices) from the place's office rows, from 1925. The digest may move for local seats, not state or federal. Post local results against real ones: incumbents re-elected, party splits by lean, term lengths and staggers. Then slices 2 and 3 (the local bodies' prior bills through the bill engine; the race records from the century's rows), then delete past-elections.ts and past-laws.ts.
2. **The business engine:** closures and openings to Census BDS (about 8 to 9% closing and 9 to 10% opening a year), at their cause.
3. **The small-town openings case** (jobs-elsewhere.ts): commuters apply to nearby towns' postings.
4. **The out-of-work stock** (14 to 20%, entry bursts, job-loss inflow 2.6% a month against CPS 1.3%), at its cause.
5. **Item 4, route (a):** day-one jobs as vacancies the engine's choice fills. A behavior change; the old holder tests are rewritten to the new rule, never looser.
6. **Job-loss news:** the size-by-reach `publicRecord` rule plus the story kind row in src/core2/data/press/briefs.json, on one branch. Don't land the flag until Story has the words; post the fields.
7. **Part-time legislators hold other work**, and **press owners draw a payroll** (pool items opening-part-time-legislators-hold-other-work and opening-press-owners-draw-a-payroll).

**Done when** 1 to 7 are each built as PRs with proof, or listed with why.

---

## Core (approved by the owner, Nov 26, about 11:15 p.m.)

The owner: "the core is where engines plug in, and it can also be very friendly for modders." The audit is core-2026-11-26.md in this folder (rows K1 to K13).

**What the core is:** the kernel (ids, dates, draws, fixed-point money, hashing), one game state with an owner for every part, one record (the write path, the event bus and the reader), the clock (the day loop and advancing), the plug (`CoreModule` and `registerModule`), parameters and data, starting and saving a world, and the choice engine. It imports no engine. Engines plug in.

**Start** once train #10682 has landed green and Reach-ins' stack has landed. Branch from main. Reach-ins folds into this session: its open items (the residents runtime map, the cycle cuts, the reach-ins left) are part of items 8 to 10.

**Items, safest first:**
1. **Measure, then guard,** one engine opening another's module table (`moduleState`), and rows edited in place. The guard's baseline may only shrink (K8).
2. **The workshop out of the core,** by a re-runnable script coordinated with Cleanup's test mover (K9): src/core2/tooling into scripts/, the test kits and fixtures (`*-test-kit.ts`, `*-kit.ts`, `*-fixture.ts`, law-test-start.ts) into tests/support, and bug-report.ts and gov-test-report.ts into scripts/. money-watch.ts and past-sessions.ts go to the screens' dev folder. Widen the game-only guard's test pattern to catch kits and fixtures.
3. **One `core` family** in tests/guards/families.json: the shared kernel, plus life.ts (the day loop), the record log and the reader. Give the 11 orphan files (src/districts, src/rules/laws, src/release) their families. Coordinate with Story's #10683, which made `story`.
4. **The missing date helpers in the kernel** (weekday of a date, the nth weekday of a month, the last day of a month), with every copy pointed at the kernel (K10): elections-calendar.ts, school.ts, voting.ts, finance-state.ts, work-pay-period.ts, and the rest of the 95 files' date sums. Formatting is left as it is. The kernel's `spokenDate` (dates.ts:113) goes to Story's day-words, in step with Story's E2.
5. **A determinism guard:** no `Math.random`, `randomBytes`, `randomUUID`, `Date.now`, `performance.now` or argument-less `new Date()` in game code outside dev panels, the play server and scripts (K11).
6. **The record log as one module:** `retainLog` and decision-detail.ts's condense and forget steps (`durableLog.set` :274, `forgetEntry` :411) together, with the reader beside them. pre-start.ts becomes a `module.history` source like every other engine, so the reader imports no engine. `HistorySource` joins `CoreModule` (K3, K4).
7. **Cross-engine writes through the owner's door:** official-pay.ts:476 (jobs), officials.ts:988 (background people), civic-inputs.ts:157 (public organizations) (K8).
8. **Fill-in out of state.ts:** `fillInPerson`, `fillInIdentity`, `promoteHusk`, `openOpeningPeerTies` and the 16 person-building imports go to the people engine behind a hook (K7). Then choice.ts calls the act path without `coreAPI` (Reach-ins' choice.ts to state.ts cycle, 14 edges).
9. **One way to start a world:** `newGame` (saves.ts:186) takes the whole recipe (the place draw with `passOver`, the pre-start, the opening warm-up, the player). The screens' `buildBenchWorld` (src/bench/world.ts:434) and the replay both call it. Coordinate the warm-up with Past and Day One (K5).
10. **The engine list as data:** the modules life.ts installs come from one list, and the direct calls (`affectAt`, `withGrief`, `admitResidents`, `openingWorkCommitments`) go through hooks. Reach-ins' cycle and reach-in items are finished here; the cycle baseline goes down.
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

## Cleanup (Codex, unchanged)

Its current goal stands: main's failing tests fixed at their causes, outside the files above, with every known-red edit in one branch (`cleanup/nov27-known-red`).