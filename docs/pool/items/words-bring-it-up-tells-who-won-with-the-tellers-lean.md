---
id: words-bring-it-up-tells-who-won-with-the-tellers-lean
title: "A person who read who won an election says how it sits with them, by their own lean"
area: words
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-5efbu8
pr: 9279
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Words lead ruling on #8831 part 1 (Nov 14); Account lead scoping
---

**What.** When a person brings up an election result they read in the paper (bring-it-up's `news.read` change, a printed story whose wire record is the `election-result`), they also say how it sits with them, from their own lean against the winner's party. Seen: a player talks to a neighbor the week after a count and hears who won and, from someone clearly for or against the winner's side, one short line in their own voice ("I voted for {winner}, so I'm not complaining." / "It wasn't my pick."); a neighbor with no clear lean says only what the train says now.

**Cause.** Found in code: src/director/bring-it-up.ts remembers a printed story only when the catalog names its topic (`storyTopic`), so a story whose cause is an `election-result` (src/core2/modules/voting.ts line 3696 emits it with `news: true`) is read but never brought up; and bring-it-up has no move that carries the teller's lean (the old PR #8831 built the fact `bearer-with`/`bearer-against` for the deleted race-told scene, which #8922 removed). The lean exists in the records: `partyLean` (src/core2/campaign-stances.ts) of the winner's filing party and `personLean` (src/core2/campaign-views.ts) of the teller.

**Fix.** (1) In bring-it-up, let a `news.read` change whose story's wire record is an `election-result` be remembered and told even with no catalog topic; fact `winner` (the name, cited to the result) and the contest's office. (2) Add the fact `lean` ("with" or "against") set only when the teller's own lean and the winner's party lean are both clearly off the middle (no threshold flip: use the sign and a minimum size read from a parameter row, tagged TUNABLE with its spread). (3) A new move kind in `BringMove` (`lean`) and its bank part in data/english/parts/bring-it-up.json: the Words lead's twelve lines, with the conditions: "I voted for {winner}, so I'm not complaining." only when the teller's ballot record (voting module) says they voted for the winner; "Good night for our side." only when the teller and the listener lean the same way; "{winner} won it fair. It still stings." only when the margin step (the one margin function) is not a landslide; {winner} at most once in the talk; no {first}, no {place}; no figure. (4) A teller with no clear lean keeps the lines the train has. (5) A guard for the one fact-reading path, and a test pinned to three named places and fixed seeds after an election: a with teller, an against teller, a no-lean teller, each citing the result record.

**Time box.** 4 hours for one Opus session at medium effort.

**Rules.** No dice: the lean decides, from views and party records, never a roll. Plain American English, no figure in talk, no office jargon. One engine: the told record and belief path bring-it-up already uses; no new scene type. Unattended worlds: this adds talk, so year 1 and time per record at three places, with and without, before ready. The Words lead reads the lines before the PR.

**Done when.** A second session, on main, plays a drawn place through a count, talks to three neighbors the week after, and hears the result from each: a with teller, an against teller and a teller with no clear lean, each saying a line the records support, citing the result by id. The lines read plainly and none repeats back to back.

**Waits on.** Nothing.

**Files.** src/director/bring-it-up.ts, src/director/data/bring-it-up-rows.json, src/english/bring-it-up-words.ts, src/english/mined/scene-bank.ts, data/english/parts/bring-it-up.json, src/director/bring-it-up.test.ts
