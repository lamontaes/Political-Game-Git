# Words and the director: the next orders (Oct 15, 2026)

For whichever session takes this line over (Claude or Codex; the owner decides). Read `AGENTS.md`, then `.agents/skills/words-engine/SKILL.md` (the whole architecture, the research method, the grading loop and the rulings), then `docs/coordination/words.md` and PR #4323's comments (the CTO's hold on batch 11). Everything below assumes those. Owned paths and checks are in the skill. One draft PR per order on a `words/*` branch off `main`; the CTO merges; never merge your own.

## Order 1: the catalog and the coverage table (do this first)

The engine already has the three layers (situations, moves, pieces) but they are not tied together in a way anyone can count. Build the tie, as data and one script, no new text:

1. **Keys on situations.** Give every situation type in `src/director/data/situation-types.json` a `key` from a small fixed set (`loss`, `threat`, `honor`, `news-received`, `favor-asked`, `vote-wanted`, `arrival`, `departure`, `routine`), so an assassination, a funeral and a lost election share `loss`, and an appointment, an award and a victory share `honor`. Add the situation types the world's records can already fire but the catalog lacks (read `src/core2/modules/*` event kinds: a death, an eviction, a layoff, a bill passed or vetoed, an appointment, an election result, a recall, a hearing, an interview, a scandal story received). Each type's arc is its ordered moves per role. Register each new type's cause label; where the producer does not exist yet, name it in `awaitingProducer` as the catalog already does.
2. **Moves on pieces.** Every part in every bank in `data/english/parts/` carries a `move` from one shared list (`scripts/english-corpus/moves.json`: greet, deliver-news, ask, answer, condole, congratulate, deflect, lie, agree, disagree, close, farewell, comfort, request, blame, promise, tell, thank, call-to-order, put-question, announce-result, ...) and a `key` where the sentence only fits one (a condolence is `loss`; "The ayes have it." is `routine`). Most of the mapping is mechanical from the existing `kind`/`stage` and register fields; do it with a script, then read the result.
3. **The coverage table.** `npm run words:coverage` (new, `scripts/dialogue-batch/coverage-table.ts`) prints, for each situation type × role × move × register, how many parts exist and how many of them the owner has graded pass, and writes `docs/grading/coverage.md`. Zero cells are the mining list. The table is the proof for this order: in the PR body, the table's totals and the ten emptiest cells.

4. **Endpoints.** The coverage table also counts scenes by endpoint (money, bill, political life, personal) as well as by situation.

**Owner plays it:** nothing new on screen; batch 12 is drawn from this table instead of from one town's year.

## Order 2: batch 12 grades the pieces

Batch 12 grades pieces, not scenes (OWNER-DECISIONS.md, "Grading grades the engine, not scenarios"). Build the page from the coverage table: one card per (move, register, bearing) cell with 3 to 6 pieces each, shown with the slots they fill, plus the owner's "Batch 12 must" list where it applies to pieces (replies continue, journal subjects, lies name a place, no dates, no say-nothing row). Batch 12's family, conversation and lie pieces are written under the text rule of Oct 15 (OWNER-DECISIONS.md), not mined only.

Batch 11 (`docs/grading/words-batch-11.md`, PR #4323) is held for four record defects and for repeating the same few situations. Do not regenerate it blind; build on it:

1. Fix the two engine-side defects that are yours: the chapter that printed "My daughter was born. My daughter was born." (two children, two dates; one sentence that says both, or two chapters) and the family scene that opened on a roll call of ten relatives (who is in the room shows in the picture and the talk) and was staged in a neighbor's household instead of the player's. The other two (a winner as a seat-term id; a body named by a member's title, "County of Darlington commissioner") are the government engine's; the overnight PR #4343 fixes the first in the engine and part of the second; until it merges, the batch builder skips a scene whose speaker or body resolves to a raw id and says so under "Facts that were stood in".
2. Draw batch 12 from the coverage table: thirty scenes, each a different situation type or a different role in one, across registers, with no situation type more than twice. Scenes the director fires in the played year come first; where the table has pieces for a situation the director does not fire in that year, compose it as a **proof scene** from real records of that world (a real death, a real bill, a real appointment that happened in the year, the director's own staging function called on the record) and mark it "proof: the director does not fire this yet". Where the table has no pieces, mine first (Order 3) or leave the cell on the page's OWNER DECISIONS list.
3. Each scene tests one thing, as before, and the page says for each what the owner is grading: wording on an axis, an opening and closing pair, a choice set, or a situation's content (does this moment, with these people and these facts, read as a scene of this kind).

**Batch 12 must** (owner rulings, Oct 15 evening, `docs/coordination/OWNER-DECISIONS.md`):

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

**Owner plays it:** he grades `docs/grading/words-batch-12.md` with the piece cards in it. The CTO builds his grading page from the Markdown.

## Order 2b: finished scenes, when applicable

Once the grammar is calibrated and the engine has enough graded pieces to compose scenes properly, the CTO brings finished composed scenes a few at a time. Draw them from the coverage table: each a different situation type or a different role in one, across registers, no situation type more than twice. Scenes the director fires in the played year come first; where it does not fire one yet, compose a proof scene from real records and mark it "proof: the director does not fire this yet". Each scene tests one thing and the page says what the owner is grading. The earlier "thirty different scenes" target for batch 12 lives here now.

## Order 2c: the same scene for different personalities

The same composed scene rendered for different personalities (traits), graded for whether each person sounds like themselves.

## Order 3: fill the empty cells

Filling an empty cell means writing pieces to the pattern through the `civic-prose` authoring process, and mining where a record offers good ones, not mining only (text rule, OWNER-DECISIONS.md, Oct 15). For each empty or thin cell the table names, in the order of the golden path (a talk at home, a council meeting, filing, the campaign, election night, the first bill, the town reacting): a shape in `scripts/english-corpus/shapes/`, the mining run over the corpus (rebuild it with `mine-all.sh` if the container lost it; the README lists every source and its license), the bank script and its test composing a whole exchange through the real engine in a drawn place. First targets, from batch 11's own gaps: a town body's own words to its chair and a local chair's own procedure (council minutes are patterns only; the shipping source must be public-domain, so look for town and county meetings in the Congressional Record's extensions, federal advisory committee transcripts and Florida's local governments); a chair's or member's question at a hearing (the hearing bank has only witnesses); what a body says of an official's service ("has served as {office}"); boasts, threats and alarms ("arrogance, anger and fear", owner Oct 14); a wedding, a pork-barrel ask, a member arguing against another by name on the floor.

## Order 4: the director's reach

Once Orders 1 and 2 are in: every situation type in the catalog whose producer exists fires in play from its cause record, with the people the records put in the room, and nothing else fires. Prove it the way the batch builder does: a year of a 17-year-old's household in a drawn place, every scene that fired with the record that caused it, and the situations that never fired with why (no cause record in that year, or `awaitingProducer`). Then the office scene for the state and federal levels on the same engine (the local one exists: win one member's vote before it is cast).

## What is open from the previous Words sessions (carry forward)

From `docs/coordination/words.md`: a purpose phrase per policy series as catalog data (a bill's title reads from it; OPUS-GOV asked for it); a local ordinance's own form from public-domain municipal forms; bill sections composed from the record; the misfit "It's okay." offered to "Where did you go to school?"; the unworded moments the corpus does not cover twice yet ("I filed my papers.", "I paid the fee.", "A new law took effect.", a clerk saying the fee or the signature count, "Hold a meeting"); thin scene narration (home, someone's home, school, a letter); the blame someone was told ("I heard it was ..."). Needs from other sessions and the open owner questions are in that file; quote the register before asking anything.

## Paste prompt for the session that takes this line

> Read `.agents/skills/words-engine/SKILL.md` and `docs/work-orders/words-and-director-2026-10-15.md` in lamontaes/Political-Game-Git, then `docs/coordination/words.md`. Take the orders in order, starting with Order 1 (the catalog and the coverage table) and Order 2 (batch 12 built from batch 11 and the coverage gaps). Follow `AGENTS.md`: no hand-written player text, every sentence from a public-domain record with its source, no dice, American English. One draft PR per order on a `words/*` branch off main, checks in your session on changed files only, a release declaration in `docs/release/changes/`, the batch page as the played-world proof with record ids, and the first lines of the PR body say what the owner can play now. Keep `docs/coordination/words.md` as your status file. Never merge your own PR.
