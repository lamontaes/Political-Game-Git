Touches pool item: none (plan for the owner)

# Words and director: the plan

October 28, 2026. Written by the CTO from your voice notes of Oct 15, Oct 23 and Oct 24, word for word. It also reads your sittings of Oct 26, 27 and 28, the rulings log, the code on main as of this afternoon, and every Words, scene and director pull request since Oct 15. Four helpers did the reading; their digests are behind this page. Nothing here is a work order yet. The orders get written after you answer the decisions at the top.

## The decisions only you can make

1. **Scene depth stays.** On Oct 27 at 11 PM you said "take out all the depth, literally just build it." On Oct 27 afternoon and again today you graded scenes on having no depth, no lead-up and no stakes. I read the 11 PM ruling as build ceremony (research, proofs, audits), not scene depth. The plan below keeps scene depth as a requirement. Say if that is wrong.
2. **Filing becomes a real process.** Today you said the clerk tells you how many signatures you need, the primary and general dates, the rules, what the office does and the term, and that filing is petition, signatures, the clerk's check, then the ballot. The rulings log and the elections engine say the opposite: no fee, no petition, filing puts you on the ballot. The plan builds your version of today, reading each place's real filing rules from the elections data that already exists. Confirm.
3. **The narrator goes first.** Your Oct 27 afternoon ruling put the narrator and the first spoken line on screen together. Today you said narrator, Continue, then the person talks. The plan takes today's.
4. **The whole batch-grading apparatus goes.** Three batch generators, two page builders, four scene-staging scripts, 41 MB of batch files and the batch 22 table-read page. What stays is one grade file, the reach table (a grade moves every piece that shares its pattern, voice and register), and the in-play grade control. Your voice notes and sitting notes feed that one file. Confirm the deletion.
5. **The 3,093 Oct 15 lines keep playing until a grade or a ban removes them.** That is your Oct 24 ruling ("quit worrying about my grades"). The other choice is to pull them and let each scene land with its own new lines, which is slower and leaves scenes silent meanwhile. The plan keeps them playing and deletes by pattern (every "X is home", every "Talk to you soon", every restated screen), not by hand.
6. **One session owns words and the director together**, Opus, with two Sonnet helpers for mechanical bank work and proofs. You said on Oct 15 "be speech and director, make them intertwine" and on Oct 27 "one Opus owns director and scene code." The last two weeks had a Words lead, a scenes finisher and a director engineer at once, and the duplicates below are the cost. Confirm one session.

## 1. One director and one English engine: what is doubled and what goes

The engines exist and are mostly one. The director has one producer of moments, one scheduler, one reply-tree composer. The English engine has one picker. Around them sit the copies. Each row names the copy and what happens to it.

**In the director (src/director):**

- Two reply-tree builders and two ending deciders: the asked-of-you path and the you-ask path. The you-ask path folds into the one tree builder.
- Two bespoke visits beside the data path: the filing visit and the polling-place visit have their own code while the `filing` and `polling-place` situation types exist. The bespoke code goes; the two types fire through the one scheduler. This is also where the filing conversation gets built.
- Who is present is decided three times: the scheduler's cast, the bench's own list by activity, and a bench filter that drops cast members with no reason. One decision, in the director, and the bench draws what it is given. This is the cause of strangers in the house and the empty chamber.
- Two narrators per scene: the situation lead and the purpose's narration. One narrator, the director's, which can speak between lines (your Baldur's Gate note).
- Two desk scenes for one bill (desk-visit and desk-bill), one floor-vote scene kept only for tests, and an office-scene file that is dead. All three go.
- Ten cause rows wait on producers that do not exist (married, school started, dating, breakup, separation, mentorship, election day, eviction, bribe offer). Seven situation types have no cause at all. Each gets a producer from the engine that already holds the record, or the type is deleted. No new mechanic: a producer is a read of an existing engine's event.
- The talk's "newest change" is said twice when a conversation opens (bring-it-up and the conversation's own subject). One.

**In the English engine (src/english, data/english):**

- One picker reached five ways, including a screen-label filler with no trait weighting and a choice-name picker that lives in the bench. The two small ones fold into the one picker.
- Eleven copies of the bank-loading code in src and scripts. One loader.
- Two held flags for one fact: the part's own flag and the grades ledger. The ledger stays, the flag goes, and every adapter stops checking both.
- Trait weighting done twice (voiced weights and calibrated variants). One.
- An address bank of 243 parts reached in play only by the dead office scene; an interview bank, a minutes bank and a notice bank read only by batch scripts. The address bank's useful parts move into the opening-speech bank under the new speech structure in section 3; the rest are deleted with the batch scripts.
- Three writers of the journal's past (family roots, family memoir, working life) landed as three PRs. One journal composer, fed by the one history that now starts at the player's birth year.

**In the bench (src/bench), words the client makes up itself:**

- A hand-written label bank (controls.json) with about fifteen fill-in-the-blank templates, and a fallback that turns any stored kind into words ("Snap maximum"). The bank moves under the English engine as a screen-words bank; the fallback is deleted so a missing label fails a guard instead of showing a kind.
- The filing counter composes its own narration; story, election night and filing each narrate beside the engine. All four read the one narrator.
- The talk box receives names and "yes to no" figures built in code. They become bank parts.

**Unmerged work that is kept, and work that is closed:**

- Kept and landed first: the printed-story body paragraphs (176 lines, no PR yet), the last-day-of-school and diploma-at-home scenes (84 lines, their producer landed on Oct 27 so nothing blocks them), the earned speech devices (#5600; its twin #5601 is closed), the donor calls (#6411).
- Closed: #5701 and #5706 (they target banks that no longer exist), #5572 (same), and the three branches that main already carries.

## 2. How your feedback calibrates the engine without batch grading

You grade three ways, and all three already have a path into the one grade file. None of them is line-by-line approval.

- **Voice notes.** Your Oct 15 notes were turned into grade rows once (batches 11 to 19) and that file is on main. The same is done for the Oct 15 and Oct 23 transcripts and the Oct 24 playtest note: every "I like that" and every rejection becomes a row with the quote and the piece it names. A grade on a piece reaches every piece that shares its pattern, speaker trait and register; that table exists and the Oct 27 ruling says it is the rule. Your 17 grades calibrate the concession speech you never graded.
- **Sitting notes.** When you say "remove every X is home," that is a ban on a pattern, not a grade on a line. Bans become guard tests in the English guard that already runs on every pull request: a bank part matching the pattern fails the build. Today's sitting gives the first set: "X is home," "X is at place," "Talk to you soon," "See you later," narration that names the day, the place or who is present, "must" for "have to," a date said aloud, a bill named by its catalog name. The guard keeps a banned line from ever coming back, which is the regression you keep hitting.
- **In play.** The grade control in the talk box landed on Oct 28 (#6454). It writes to the same file. Nothing else is needed except that it stays behind the dev switch so you never see "Mark gap" on a player screen.

What changes in process: there is no batch, no artifact page, no "held until graded." A line plays the day it lands. A grade or a ban removes it, and the reach table removes its family with it. The pieces graded good on Oct 15 are weighted up everywhere they match.

## 3. Stakes, endings and variety from the records

This is where the engine is thin, and it is thin in a specific way: the scaffolding exists and nothing reads it.

- **Stakes.** Every situation type carries a stakes list, and the code reads one entry of it. The only stake the director actually computes is household money against the race's length, and only the family-filing scene uses it. The fix is reads, not a new system: the director asks the engines that already own the facts. Money from the household ledger, time from the job's hours, the tally from the bill's whip count, the tie from the relationship's closeness, standing from the race record, reputation from the press record. Each situation type names which of those it reads, and the narration and lines fill from them. The one-month-savings line that came from nowhere today was the right read with no lead-up; the lead-up is the director staging the money worry as its own moment first, from the same ledger.
- **Endings.** Every purpose has four to eight named endings, each with a "keeps" field (a favor owed, a promise, trust lost). Nothing reads them. The only thing written back is the player's last reply. Each "keeps" becomes a write to the engine that owns it: the favor to the relationship record, the promise to the promises the campaign engine already tracks, trust to closeness. Then the next scene can read it, and the journal line comes from it. This is the chain-is-the-acceptance rule applied to scenes: one ending followed to the record and back out into a later scene.
- **Variety.** In the last played year, 29 of 80 situation types fired and the floor vote fired 121 times. The door, the interview, the debate, the campaign team, the volunteer who matters, the bribe offer, election day and the polling place never fired. The fix, in order. The ten missing producers, each a read of an existing engine's event. The seven cause-less types deleted or given a cause. A firing cap per type per season in the director's calibration table, so one type cannot take a season. The narration shape varied: the narrator's line count and the speaker's line count come from the moment, not a fixed one-then-two.
- **Who is there.** One cast, decided once, each person present for a recorded reason (lives there, works there, was invited, is on the ballot). The scene's place comes from its purpose and its people, your Oct 27 ruling. A home's rooms match each other: the run-down living room beside the clean kitchen you saw today is one dwelling drawn from two condition tables, and becomes one.
- **Speeches** are assembled, not blocks. The director plans the parts from the speaker's party, traits, stances and the world's recent events: the economy's turn, a war, a disaster, a law just passed, all from records that exist. The English engine words each part in the speaker's voice. The talk box plays one part per Continue, and the scene changes on the first one. Rhetorical devices are earned by the speaker's recorded experience (#5600). Inaugural precedents are read for shape, never copied.

## 4. Every generated line reaches play and stays tunable

- One path from a record to the talk box, with no place a typed string can enter. The code map found five such places; all five close in section 1.
- News stories get bodies. The record holds facts; the composer writes a headline and one sentence. The body paragraphs on the unmerged branch land first; then the story page shows a story.
- The talk box separates what the player said, what was said before, and what is being said now (three line kinds; today only the player's own past lines are marked). The narrator goes first, Continue, then the person. A narration-only beat has one Continue, bottom left.
- Everything a player sees comes through the one picker, so a grade or a ban reaches it. The screen-label bank included.
- The English guard grows the bans above and the reach test: a part graded bad must not appear in a composed scene in a drawn place.

## 5. Who does what, with no two sessions on one system

| Owner | Owns | Does not touch |
| --- | --- | --- |
| **Words and director session** (one, Opus) | src/director, src/english, data/english, the talk box's line kinds | Screens, menus, the kit, the elections engine's filing rules |
| **Two Sonnet helpers** under it | Bank sweeps for bans, grade rows from the voice notes, played-year proofs, the batch-tooling deletion | No design calls, no new producers |
| **Screens lane** (already running, kit) | News as a newspaper page, the Politics menu, Campaigns as the real ballot with hot links, Travel's place view, every Continue and Back removed, the Guide as hover text, initials to headshots | No English, no director |
| **Elections wire session** (running) | Filing rules read from the elections data (signatures, petition, dates, term), filing spending time, the polling-place producer | The clerk's words (Words) |
| **Opening wire session** (running) | History from the birth year, the one journal from it | The journal's words (Words) |
| **Red-main owner** (running) | The scene-talk and law-reached test reds | Nothing else |

The sitting's 41 points fall out of this. Points 1 to 7, 12 to 23 and 27 to 31 are the screens lane. Points 8 to 11, 26, 32, 36 to 39 and 41 are Words and director. Points 33 to 35 are Words with the elections session. Point 40 is the director's cast and the dwelling tables.

## What you would see first, in order

1. The bans and deletions land: no "X is home," no "Talk to you soon," no narration naming the day, the place or who is present. Narrator first, Continue, then the person. One day.
2. The opening address plays in parts, differs by President, party and world, and the scene changes on the first Continue. One day.
3. The clerk's filing conversation, reading each place's real rules, and filing takes the afternoon. One day, with the elections session.
4. The post-filing home scene has its lead-up (the money worry staged first), its stakes read, its ending written back, and the journal line from it. One day.
5. News stories have bodies. Half a day.
6. The ten missing producers, one per PR, each proven in a drawn town: door knocking as porch scenes, the interview, the debate, the volunteer who matters, the bribe offer, election day. One per half day.
7. The one cast and the one dwelling, so the people and the rooms are right. One day.
8. The batch tooling and the second copies deleted, counted in the PR body. One day, helpers.

Each is its own pull request, merged the hour it is green, and each names the place, seed and record ids it was proven on.

## What is already decided and will not be asked again

No real published statistics in a speech or a story; every figure is the world's own. The player's four replies are four stances, never rewordings, with Say nothing beside them only when there is something left to say. A yes or no never ends a talk. Every person present has a recorded reason. The journal reads like a memoir in the first person. Nobody attributes a change to a law unless they learned of it. No session messages another; everything goes through GitHub. Art and influences need no credit. Wildermyth is the model for scenes growing out of play; Baldur's Gate for the narrator between lines and for replies that are sometimes flavor and sometimes change the game.
