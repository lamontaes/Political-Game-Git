# Words and the director: the next orders (Oct 15, 2026)

For whichever session takes this line over (Claude or Codex; the owner decides). Read `AGENTS.md`, then `.agents/skills/words-engine/SKILL.md` (the whole architecture, the research method, the grading loop and the rulings), then `docs/coordination/words.md` and PR #4323's comments (the CTO's hold on batch 11). Everything below assumes those. Owned paths and checks are in the skill. One draft PR per order on a `words/*` branch off `main`; the CTO merges; never merge your own.

## Order 1: the catalog and the coverage table (do this first)

The engine already has the three layers (situations, moves, pieces) but they are not tied together in a way anyone can count. Build the tie, as data and one script, no new text:

1. **Keys on situations.** Give every situation type in `src/director/data/situation-types.json` a `key` from a small fixed set (`loss`, `threat`, `honor`, `news-received`, `favor-asked`, `vote-wanted`, `arrival`, `departure`, `routine`), so an assassination, a funeral and a lost election share `loss`, and an appointment, an award and a victory share `honor`. Add the situation types the world's records can already fire but the catalog lacks (read `src/core2/modules/*` event kinds: a death, an eviction, a layoff, a bill passed or vetoed, an appointment, an election result, a recall, a hearing, an interview, a scandal story received). Each type's arc is its ordered moves per role. Register each new type's cause label; where the producer does not exist yet, name it in `awaitingProducer` as the catalog already does.
2. **Moves on pieces.** Every part in every bank in `data/english/parts/` carries a `move` from one shared list (`scripts/english-corpus/moves.json`: greet, deliver-news, ask, answer, condole, congratulate, deflect, lie, agree, disagree, close, farewell, comfort, request, blame, promise, tell, thank, call-to-order, put-question, announce-result, ...) and a `key` where the sentence only fits one (a condolence is `loss`; "The ayes have it." is `routine`). Most of the mapping is mechanical from the existing `kind`/`stage` and register fields; do it with a script, then read the result.
3. **The coverage table.** `npm run words:coverage` (new, `scripts/dialogue-batch/coverage-table.ts`) prints, for each situation type × role × move × register, how many parts exist and how many of them the owner has graded pass, and writes `docs/grading/coverage.md`. Zero cells are the mining list. The table is the proof for this order: in the PR body, the table's totals and the ten emptiest cells.

4. **Endpoints.** The coverage table also counts scenes by endpoint (money, bill, political life, personal) as well as by situation.

**Owner plays it:** nothing new on screen; batch 12 is drawn from this table instead of from one town's year.

## Order 2: the grading bench

Owner, Oct 15, evening: "every word is a data point calibrating the entire engine." Scenes are shown as they would appear in the game; no two scenarios alike, no two choice sets alike; every line graded on several axes; no fresh world simulations (use the director and the engine over one cached world); grades tune the engine, never a hard-coded scenario. We give the simulation the tools to communicate; we do not script what it says. This replaces the old piece-card batch, the "finished scenes" order and the "same scene for different personalities" order. Batch 12 is the first bench run.

**The text rule.** Pieces are authored to calibrated patterns (OWNER-DECISIONS.md, "The text rule", Oct 15). Take the pool item `words-authored-pieces-gate` first, so the bank checks accept `origin: authored` parts, then write the pieces a cell needs. The bench does not write text; it shows what the engine does with the pieces it has.

### 1. The bench script

`scripts/dialogue-batch/grading-bench.ts`, run as `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run words:bench -- --id batch-12 --cache <world cache> --profiles 5`.

- **One cached world.** It loads one played world through the coverage batch's `--cache` mechanism (header of `scripts/dialogue-batch/coverage-batch.ts`). It draws no new worlds and runs no new year. If no cache exists, it says so and stops; building the cache is the coverage batch's job, once.
- **Situations from records.** For every situation type in `src/director/data/situation-types.json` whose cause records exist in that world, it asks the director's own staging (`src/director/scene.ts`, `scheduling.ts`) to stage it with the real people those records put there. No hand-placed cast. A type with no cause record in the world, or `awaitingProducer`, is listed on the page with why and is skipped, never invented.
- **Composed by the real engine.** For each staged scene it composes the narration (`composeScene`), the lines (`openConversation`, `say`), a speech where the situation has one (`composeAddress`) and the journal entry (`composeJournal`), plus the player's four replies and the lie set. It calls the same functions play calls.
- **Once per personality profile.** Profiles are trait vectors in `src/director/data/grading-profiles.json`: 5 to 8 of them, with trait names and levels taken from the game's own trait list (`docs/coordination/traits.md`, `src/core2/data/people/*`). Examples: warm, cold, stubborn, anxious, boastful, liar, and two mixes (warm and anxious; cold and boastful). The profile's values are laid over the speaking non-player character; for the player's replies the same profile is laid over the player. For the lie variants the player's lie trait is scaled up. `--profiles N` takes the first N. The same cast, records and situation are therefore composed N times, and the page shows whether each person sounds like themselves.
- A profile is a set of trait values. It names no scene and no line.

### 2. Dedupe and variety rules

- No two items share (situation type, cast, pieces used). Two profiles on one scene count as different items only when their pieces differ; the bench reports and drops a profile that reads identically to another on the same scene.
- No two choice sets share the same four replies.
- A situation type appears at most N times per profile (default 3; `--max-per-type`).
- A phrase appears once per page.
- The page is sorted so adjacent items differ in situation type and in register.
- The bench counts what it dropped under each rule and prints the counts at the end.

### 3. Each item is a data point

For every line the bench records: move, register, bearing, key, the speaker's traits, lie or not, length in words, sentence count, the ids of the pieces used, and the record ids that filled the slots (so every word answers "why" by record).

- **Data:** `data/english/batches/batch-12.json`, one row per line with those features, grouped by item, with the item's situation type, cast record ids, profile and the cause record that fired it.
- **Page:** `docs/grading/words-batch-12.md`, rendered as the game would show it: the narrator's paragraph, then the lines with speaker names, then the four replies and the lies. A small footer under each item gives the feature row, not the other way round. The page lists, at the top, the items dropped and the situations skipped, with reasons. The CTO builds the owner's grading artifact from this Markdown.

### 4. Grading axes

Each line, and each whole item, takes a grade from 1 to 5, or is skipped, on:

1. naturalness
2. prose
3. sentence structure
4. length (too short, right, too long)
5. creativity
6. trait fit (does this person, with these traits, sound like this; single traits and mixes)
7. lie plausibility (lie items only)

Each grade may carry a note and a preferred alternative. They go to `data/english/grades/batch-12.json` (`{"i","line","axes":{"naturalness":4,...},"note","prefer"}`). `scripts/dialogue-batch/apply-grades.ts` accepts this shape alongside the old `{"i","grade","prefer"}` and `{"i","choices":{...}}` shapes. An old-shape grade still fails or promotes a part as before.

### 5. The calibration table

`data/english/calibration.json` holds only weights, each marked TUNABLE with its spread (AGENTS.md, the parameter rule):

- **per trait:** the pull toward each bearing, and toward longer or shorter lines;
- **per register:** the target length in words and the target sentence count;
- **per piece:** its running grade (a mean over the axes it was graded on, with a count);
- **per move pair:** whether that arrangement (for example condole then ask) read naturally.

`apply-grades.ts` folds each grade into the table: a line's axes move its trait, register and piece weights a small step; a "too long" moves the register's target down; a preferred alternative raises that piece's weight. The engine reads the table when it chooses and arranges pieces: piece choice and arrangement in `src/presentation/english-composition.ts`, and the reply ranking in `src/director/conversation.ts`. A piece with a low running grade is chosen less; a trait's pulls change which bearing and length the speaker favors; a move pair that read badly is arranged less.

**State plainly, in the code comment and the PR body: no scenario text, no scene script, no if-this-town-then-that. Only weights the engine reads when it chooses and arranges pieces.** Nothing in the table names a place, a person or a situation's wording.

### 6. Done when

- A page of at least 150 items from one cached world, every item distinct by the rules above, every line traceable to its pieces and records.
- The calibration table is read by the engine in a played year: the PR body names one line whose wording changed because of a grade (before and after, the grade, the piece ids, and the record ids of the scene).
- The pool item `words-grading-bench` is closed with the page, the JSON and that line named.

**Owner plays it:** he grades the page; the grades tune the engine; the next bench run shows the change. The CTO builds the grading artifact from the Markdown.

### 7. Batch 12 must (owner rulings, Oct 15 evening, `docs/coordination/OWNER-DECISIONS.md`)

The bench keeps every one of these:

1. State each scene's endpoint (money, a bill, political life, or personal) on the page.
2. Open each scene with a narrator paragraph of a few sentences, not two short lines.
3. Make replies continue the conversation; no bare "All right" or "Okay" answers.
4. Give journal lines their subject (the office, the child's name, what "little did I know" refers to).
5. Build speeches in stages: short openers and closers, with longer choices on different subjects at the core.
6. Show a bill's text beside its real name.
7. Have lies about where you are from name another place; no "Not here."
8. Put no dates in speech.
9. Include no "say nothing" row.
10. Send no school, workplace, notice or public hearing scenes until something new is said in them.

Batch 11 (`docs/grading/words-batch-11.md`, PR #4323) is held. Fix its two engine-side defects in the bench's path: the chapter that printed "My daughter was born. My daughter was born." (two children, two dates), and the family scene that opened on a roll call of ten relatives and was staged in a neighbor's household. Until the government engine fixes a winner shown as a seat-term id and a body named by a member's title, the bench skips a scene whose speaker or body resolves to a raw id and lists it under "Facts that were stood in".

## Order 3: fill the empty cells

Filling an empty cell means writing pieces to the pattern through the `civic-prose` authoring process, and mining where a record offers good ones, not mining only (text rule, OWNER-DECISIONS.md, Oct 15). For each empty or thin cell the table names, in the order of the golden path (a talk at home, a council meeting, filing, the campaign, election night, the first bill, the town reacting): a shape in `scripts/english-corpus/shapes/`, the mining run over the corpus (rebuild it with `mine-all.sh` if the container lost it; the README lists every source and its license), the bank script and its test composing a whole exchange through the real engine in a drawn place. First targets, from batch 11's own gaps: a town body's own words to its chair and a local chair's own procedure (council minutes are patterns only; the shipping source must be public-domain, so look for town and county meetings in the Congressional Record's extensions, federal advisory committee transcripts and Florida's local governments); a chair's or member's question at a hearing (the hearing bank has only witnesses); what a body says of an official's service ("has served as {office}"); boasts, threats and alarms ("arrogance, anger and fear", owner Oct 14); a wedding, a pork-barrel ask, a member arguing against another by name on the floor.

## Order 4: the director's reach

Once Orders 1 and 2 are in: every situation type in the catalog whose producer exists fires in play from its cause record, with the people the records put in the room, and nothing else fires. Prove it the way the batch builder does: a year of a 17-year-old's household in a drawn place, every scene that fired with the record that caused it, and the situations that never fired with why (no cause record in that year, or `awaitingProducer`). Then the office scene for the state and federal levels on the same engine (the local one exists: win one member's vote before it is cast).

## What is open from the previous Words sessions (carry forward)

From `docs/coordination/words.md`: a purpose phrase per policy series as catalog data (a bill's title reads from it; OPUS-GOV asked for it); a local ordinance's own form from public-domain municipal forms; bill sections composed from the record; the misfit "It's okay." offered to "Where did you go to school?"; the unworded moments the corpus does not cover twice yet ("I filed my papers.", "I paid the fee.", "A new law took effect.", a clerk saying the fee or the signature count, "Hold a meeting"); thin scene narration (home, someone's home, school, a letter); the blame someone was told ("I heard it was ..."). Needs from other sessions and the open owner questions are in that file; quote the register before asking anything.

## Paste prompt for the session that takes this line

> Read `.agents/skills/words-engine/SKILL.md` and `docs/work-orders/words-and-director-2026-10-15.md` in lamontaes/Political-Game-Git, then `docs/coordination/words.md`. Take the orders in order, starting with Order 1 (the catalog and the coverage table) and Order 2 (the grading bench; batch 12 is its first run). Follow `AGENTS.md`: no hand-written player text, every sentence from pieces authored to calibrated patterns, copying no one's copyrighted text (the text rule of Oct 15 in docs/coordination/OWNER-DECISIONS.md), no dice, American English. One draft PR per order on a `words/*` branch off main, checks in your session on changed files only, a release declaration in `docs/release/changes/`, the batch page as the played-world proof with record ids, and the first lines of the PR body say what the owner can play now. Keep `docs/coordination/words.md` as your status file. Never merge your own PR.
