---
id: words-everyday-talk-asks-the-same-question
title: "Everyday talk asks 'Where did you go to school?' 104 times in 283 conversations, and a third of its lines are one or two words (New Hamilton, Mississippi; Creede, Colorado; San Lorenzo, New Mexico)"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: high
root: design-words-machine
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, the grading section, measured play)
checked: fable 2026-11-10
---

**What.** Talking to people in town says the same few things over and over. Measured by the audit with the crew's life tool, three lives of 60 days each in New Hamilton, Mississippi; Creede, Colorado; and San Lorenzo, New Mexico (no seeds given): each copy of the game it ran had 283 conversations, "Where did you go to school?" was asked 104 times in those 283, and a third of all spoken lines were one or two words. The owner's newest grades did not change either figure. Measured by the audit on Nov 10's main in Tesuque, New Mexico (seed 8a5d1fba28fc) and again by me on commit 8ac2262853 with the scene tool: the mother said "I should tell you, I lean liberal." in August and the father said the same sentence in September, each answered "I see it the same way." or "Same here, as it happens." and then "Good. I thought it was just me." Read in code, not run: the move that asks about school (`school-ask-how`, data/english/parts/conversation.json) has exactly one line, so every talk that reaches that subject says that sentence; `askSubject` (src/director/conversation.ts:1754) holds a question back only when that one person already knows the answer, and a talk remembers its topics per pair of people only (`talkedKey`, near line 2003), so every new person may ask it once; `subjectsBetween` (line 966) offers a person's school to anyone who did not share it; each political lean has three lines and nothing remembers which one the player heard last from someone else in the same house; and 139 of the 815 pieces in conversation.json are one or two words. Fix the class: a question the player has answered is not asked again by the next person unless that person has a reason on record to ask; one subject has enough lines, chosen by who is speaking and their tie to the player, that two people in one household do not say the same sentence; and a one-word or two-word line plays only where a real person would say just that.

**Cause.** Measured: three lives of 60 days each in New Hamilton, Mississippi; Creede, Colorado; and San Lorenzo, New Mexico (the Fable audit, no seeds given) had 283 conversations, 104 asking the school question, and a third of spoken lines one or two words; Tesuque, New Mexico (seed 8a5d1fba28fc) has both parents opening 'I should tell you, I lean liberal.' In code: askSubject (src/director/conversation.ts line 1754) holds a question back only when that one person already knows the answer, talkedKey (line 2003) remembers topics per pair only, subjectsBetween (line 966) offers school to anyone who did not share it, and data/english/parts/conversation.json has exactly one school-ask-how line (line 8019).

**Fix.** Remember what the player has told anyone in the household and do not ask again without a reason on record; give each subject enough lines, chosen by speaker and tie, that two household members do not say one sentence; allow one- and two-word lines only as greetings or direct answers. New lines are written by Story and judged by the words-machine rules.

**Time box.** 8 hours for one Opus session.

**Rules.** No hand-written player text: the new lines are bank pieces written to the civic-prose and scene-standard skills (their own words by the speaker's top trait and tie), and no sentence is typed in code. No dice: which subject a talk opens and which line says it follow the two people's records, traits and what was already said, never a roll; the life tool's stable hash picks the player's reply only. An effect is a read, not a record: what the player told one person (where they went to school) is read by the next talk, so a relative or neighbor who would know does not ask. The rulings log, Oct 15, 2026 (docs/coordination/OWNER-DECISIONS.md): "'Where do you work' between relatives is not a scene." Owner, Nov 8, 2026 (playtest of v0.94.0, on the English engine): "this is why it feels like i've seen the same dialogue for 2 weeks."

**Done when.** A second session plays three lives of 60 days in drawn places (named with seeds; Tesuque, New Mexico seed 8a5d1fba28fc among them) with the life tool (scripts/dialogue-batch/play-lives.ts) and sees that the school question is asked once for what the player has already told the household unless a reason is on record, that two people in one household do not say the same sentence for one subject, and that one- and two-word lines play only as greetings or direct answers; the counts before and after (the 104 of 283 and the one-word share) are reported.

**Waits on.** Nothing. The words machine that judges new lines is on main (data/english/line-rules.json, src/english/line-rules.ts, `npm run words:rules`). words-everyday-talk-one-engine is claimed and changes the same file (src/director/conversation.ts): read the branch its Notes name before starting, and build on it if it has merged.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json, scripts/dialogue-batch/play-lives.ts, scripts/dialogue-report/report.ts

**Notes.** From the Fable audit, the grading section ("Everyday talk barely moves", "The later fix works, and the scene is still small talk") and Pillar 5 ("What is already in the banks: 15 cold 'How is X?' questions, 131 replies of one or two words, and 10 closers such as 'I'll talk to you later.'"). The audit's three 60-day lives were played on main as of Nov 9 and on a copy holding the owner's batch 2 and 3 grades; both gave the same 104 of 283. It named the three places and no seeds, so the repro is the life tool on a fresh seed; `--lives 3` draws three places from the one seed.

Nov 10 repro on main (commit 8ac2262853), scene-year.ts, seed 8a5d1fba28fc: the talk the tool opens with Erica Reyes on 2027-08-01 and with David Reyes on 2027-09-13 both begin "I should tell you, I lean liberal." On that commit the scenes those talks belong to (visits after a missed family gathering) play lines of their own in the game, so the audit's reading that the scene "is still small talk" no longer holds for the scene; the repeated sentence is what everyday talk with either parent says. The line's author tag is the Story session's person-view item of Nov 9.

Not verified: I did not rerun the three 60-day lives, and I did not trace which subject order makes the school question come up 104 times; the single bank line and the per-pair memory are read from code and are the likely cause, not a proven one.

Related: words-everyday-talk-one-engine (claimed, lane3/everyday-answers; replies that answer the question and the one word engine, not repetition across talks), words-talk-replies-follow-move-pair-grades (claimed), play-stop-01-talk-says-nothing (blocked), words-part-tags-drift (open), words-rejected-nov8-scene-still-plays.
