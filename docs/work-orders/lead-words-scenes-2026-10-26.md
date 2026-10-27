# Words and scenes lead: work order (Oct 26, 2026)

Current as of 2026-10-26, 20:00 UTC (words-and-scenes lead, from the CTO's dispatch after the owner's Oct 26 playtest: "the biggest problem [is] words and scenes")

The lead owns the story director (`src/director`), the English engine (`src/english`, `data/english`) and the scene path in `src/bench` (story, talk box, toasts). It follows `AGENTS.md`, `.agents/rules/smart-and-look-first.md`, the skills `lead-session`, `words-engine`, `scene-standard`, `player-screen-text` and `screen-to-mock`, and the Oct 26 rulings at the top of `docs/coordination/OWNER-DECISIONS.md`. Status goes in the channel (`docs/coordination/LEADS-2026-10-24.md`, `## Words and scenes`) every two hours.

**Model and helpers.** The lead runs on Opus. At most two Sonnet helpers, each on its own branch with its own paths, read-only unless its brief says otherwise; the lead reads every diff before it reaches a PR. Default: none. Helper A may take the second half of deliverable 1 (#6100, #6112, #6156, #6136, #6146) once the first five are with a merger; helper B may do read-only research for deliverables 5 and 6 (real speeches and election-night coverage, notes only). Neither starts without its own brief written into this file.

**Sequence.** One PR at a time, in the order below; a new one starts only when the last is on main or with a merger. When a box runs out: push what passes, set the item honestly with one Notes line, post a status block, and take the next.

**Every PR.** Line 1 `Pool item: <id>`; `Lead: words`; a Done-when table with a "Scene standard" row (`scene-standard` check: record written back by id, how each role was cast, two speakers or ties differing, four stances, reached in ordinary play) and a "Screen text checked" line (`player-screen-text`, the screens read, place and seed); screenshots from a drawn place at 1440x900 with place and seed; a declaration in `docs/release/changes/`. Local gate per `local-gate` on changed files, with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command. Never merge my own PR; never force-push; one head per recheck.

## Oct 27 changes (owner via the CTO, 04:38–05:20 UTC; `OWNER-DECISIONS.md`, Oct 27)

The scene line is split. The director engineer (`docs/work-orders/lead-director-2026-10-27.md`) owns `src/director` and every producer. This lead owns `src/english`, `data/english`, the lines for every scene, election day and night, and printed news. Five Sonnet scene researchers feed the engineer, and this lead reviews and finishes their lines. Lines ship per scene: each scene a PR touches lands with its own new pieces to `scene-standard` and deletes the Oct 15 pieces they replace. Every pass names one real-life episode (`scenes-from-life`). Everything from the Oct 26 sitting is in the 14:00 UTC build. Status as of 05:45 UTC:

- **Done or in review:** 1 (all ten answered), 2 (#6201, answered again 03:20), 3 (#6206, merged), 4 (#6213, in review). Deliverable 6 (the opening address) moved to a words builder on `play-first-09`; this lead reviews its lines.

### 5. Election day and night (kept; PR opening at 06:00 UTC)

As written below. Built on `words/election-day-scenes`, with the bench walk-through in Mountain Lake, New Jersey.

### 7. The Oct 26 home talks, rewritten (owner: "lines ship per scene")

- **Specific.** The household talks the owner heard on Oct 26 (opened from the day by #6078). Their pieces in `data/english/parts/conversation.json` and `scene-talk.json` are rewritten to `scene-standard`: each speaker's line has versions by top trait and tie to the player; four replies are four stances; there is narration between lines where the bank has it; no line claims a fact the records lack. Every Oct 15 piece they replace is deleted in the same PR. Calibrated on one real-life episode: a candidate telling their household at the kitchen table that they mean to run, from a published local officeholder's memoir. The packet goes in `docs/design/scenes/from-life/kitchen-table-before-a-run.md`, with no real name in any player file.
- **Measurable.** In a drawn place, a played month shows each rewritten talk reached, at least two speakers' versions of the same line differing, and no Oct 15 key left in the talks; `tests/english-parts-banks.test.ts` passes; bench screenshots of two talks at 1440x900.
- **Attainable.** Pieces only. A talk that needs a new record or producer is a `scene-*` item for the director engineer.
- **Realistic.** Opus lead, with the home-and-family researcher's packet if it lands first.
- **Time-bound.** 4 hours, to 10:30 UTC.

### 8. `words-scene-web-from-lives` (L, the pool item's own box)

- **Specific.** Split the item by domain before building: home and family; meeting people and places; the campaign; election day and night; legislating; the executive; constituents and cases; donors and corruption; the press. Each domain is a part item with `lead: words`. Then `npm run scene-web` regenerates `docs/reports/scene-web.json` and `.md` from the situation types, the banks and one played year in a drawn place.
- **Measurable.** The item's own done-when: one row per scene type and variant, each of the 112 owner examples mapped, and the `missing` count printed.
- **Attainable.** The script reads `src/director/data` and writes no director code.
- **Realistic.** Opus lead; the researchers supply episode slugs per row.
- **Time-bound.** 3 hours for the split and the first run, after 7.

### 9. Reviews (standing)

Review the researchers' and the opening-address builder's lines for `scene-standard`, `player-screen-text` and `civic-prose`. A scene that fires in one state only, or ships a real name, is sent back. The review answer comes within 2 hours of a `Lead: words` PR opening.

### Not this lead's

`words-grades-calibrate-by-trait-and-register` is claimed on `words/grade-reach` (05:29 UTC). This lead reviews it and does not build it.

## 1. The sent-back words PRs, oldest first

- **Specific.** Answer each PR's newest merger send-back exactly as written, merge main, push, and post the new head on the PR: #6058, #6096, #6147, #6086, #6104; then #6100, #6112, #6156, #6136, #6146. Nothing beyond the send-back changes on each branch.
- **Measurable.** For each PR: a commit after the newest send-back that addresses every point in it; `git merge-base --is-ancestor origin/main <head>` true at push time; the changed-file gate green; one PR comment naming the head and how each point was answered.
- **Attainable.** Stopgaps already registered on each branch stay; a point that needs another lead's engine becomes a `Needs from others:` line and a pool item, and the PR says so.
- **Realistic.** Opus lead alone for the first five; helper A for the second five (brief below when started).
- **Time-bound.** 4 hours for the first five (to 00:00 UTC Oct 27); 4 hours for the second five.

## 2. `words-campaign-season-scenes-fill-the-months`

- **Specific.** Director producers in `src/director` (`scheduling.ts`, `scene.ts`, `purpose-scene.ts`, `ledger.ts`, `data/situation-types.json`) that fire cast scenes for a filed candidate from the race's own records, plus worded news about the race. At least three kinds from the owner's list: an interview request from an outlet that covers the seat, a debate invitation, a team offer from a relative or friend, a rally, a donor or party ask, a meeting with another candidate or the incumbent. Each built to `scene-standard`: the choice writes something back (a promise, a relationship, a race record, a history line), roles are cast by scoring real people, lines vary by trait and tie, four replies are four stances. Pieces in `data/english/parts/` marked `origin: authored`. No change to `src/core2` engines.
- **Measurable.** A test in `src/director` builds `buildBenchWorld` in a drawn place (place and seed printed), files the player in January for the November race, advances week by week to election day and asserts: the first scene or race news within 28 days of filing; no 28-day stretch without one; at least three distinct scene kinds; each cites a contest or person record id. Bench screenshots of the first two scenes.
- **Attainable.** Builds on scenes already on main; where a cause record is missing (no outlet record, no volunteer record), the scene casts from records that exist (the outlet that printed the seat, the player's household and circle) under a registered stopgap in the director's stopgap file.
- **Realistic.** Opus lead; helper B may supply research notes on real campaign calendars (read-only).
- **Time-bound.** 6 hours.

## 3. Shifts never stop the player (owner, Oct 26)

- **Specific.** Remove the work-boundary stop from the player clock: `earliest()` in `src/core2/player-v1.ts` (around lines 230-262) stops reading `earliestWorkBoundaryV1` (`src/core2/work-spans-v1.ts` around 518), and the bench's shift-acknowledgment path is deleted with it (Replace, never layer). Only a scene or a module stop stops time. Nothing registered: the ruling is recorded (OWNER-DECISIONS.md, Oct 26 evening).
- **Measurable.** A test advancing a working player across a week of shifts in a drawn place reaches the target time with zero work stops; `player-v1.test.ts` and `work-spans-v1.test.ts` updated, not skipped; `npm run speed:year` not slower than base by more than 20%.
- **Attainable.** Work spans keep running for the simulation (pay, hours); only the stop goes.
- **Realistic.** Opus lead, no helper.
- **Time-bound.** 2 hours.

## 4. Live news worded

- **Specific.** Every `press.printed` story in play (a passed law, a vote, an election result) is composed through `composeNewsStory` (`src/english/english-newscast.ts`) or its equivalent before News shows it; News never shows a bare record or a record kind. The Ohio minimum wage change ($10.70 to $7.25 in the Oct 26 lawmaker run) is the test case.
- **Measurable.** A test in a played world in Ohio (place drawn among Ohio's places, seed printed) finds the minimum-wage law change and a worded story citing its record id; a test over a drawn place's year asserts every printed story the News screen lists has bank-composed text; bench screenshot of News.
- **Attainable.** Stories whose record lacks a fact the bank needs say less, never a raw field; a registered stopgap names the gap.
- **Realistic.** Opus lead, no helper.
- **Time-bound.** 4 hours.

## 5. Election day and night as scenes (owner, Oct 26)

- **Specific.** Replace the results sheet: canvassing on election day as a scene, going to vote as the player's choice with a narrator (the polls are a place, never a forced stop; the engine never votes for the player), the returns watched as they come in, conceding or celebrating; election night is its own pop-up. The old sheet's code and styles are deleted.
- **Measurable.** A drawn place's election day reached in ordinary play from filing shows each of the four beats in the bench (screenshots), each citing the contest record id; the concession or victory writes a journal line and a relationship or race record.
- **Attainable.** Uses the contest and count records on main; a beat whose record is missing is a registered stopgap.
- **Realistic.** Opus lead; helper B's election-night coverage notes.
- **Time-bound.** 6 hours.

## 6. The opening address as a speech (`play-first-09-opening-speech-per-world`, reopened: "That's not a speech")

- **Specific.** `src/english/english-opening-speech.ts` and `data/english/parts/opening-speech.json`: the address has a speech's shape (an opening, a theme, the world's own record used as argument, a promise, a close), not one sentence per number; the mined fragment that produced "I was in Pennsylvania." is removed.
- **Measurable.** Two drawn places produce addresses of different length and order, each citing at least three of its world's records, and no sentence of the form "<stat> is <number>." stands alone; a test fails on two identical sequences; screenshots of both.
- **Attainable.** Pieces authored to patterns from real inaugural and state-of-the-union addresses (research allowed), marked `origin: authored`.
- **Realistic.** Opus lead; helper B's speech-shape notes.
- **Time-bound.** 4 hours.

## Helper briefs

- **Helper A, run 1 (Sonnet, 20:20 UTC, done):** #6104's send-back, the Words review's count stages in `data/english/parts/campaign-standing.json` and `src/bench/campaign.ts`; check `src/bench/race-words.test.ts`; box 2 hours. Lead reviewed the diff; head 3f3881dbe4.
- **Helper A, run 2 (Sonnet, 21:00 UTC, done):** #6112's send-back, the unconditional vote in `src/director/journal-bill-names.test.ts`; box 2 hours. The lead replaced its forced `castMemberVote` with the engine's recorded vote before posting (ea6326dc15).
- **Helper B (Sonnet, read-only, 21:35 UTC):** research notes for deliverables 2, 5 and 6, in `docs/research/words-scenes-2026-10-26.md` on branch `words/research-scenes-oct26`. Covers three things: what a local candidate's months between filing and election day hold, as real calendars and coverage show them (interview requests, candidate forums and debates, endorsements, volunteers, donors, rallies); how election day and election night go for a local candidate (canvassing, voting, the returns as local TV and papers cover them, concession and victory remarks); and the shape of real inaugural and state-of-the-union addresses (sections, how numbers are used as argument, openings and closings). Patterns and shapes only, no copied text, each with its fetched source. Box 2 hours; output only that one file; no code.
