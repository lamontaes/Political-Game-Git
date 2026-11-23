---
name: words-stamp-read
description: >
  How a words reader reads a pull request's player-visible words before it
  folds, and what a builder sends to get that read: finding the PR's own lines
  by piece, checking every new string is seen played at the exact head,
  reading each played talk against the owner's rules, the stamp line, limits,
  carry-overs and send-backs. Use when you are a words reader or second
  reader, or a builder about to ask for a words stamp. Not for writing lines
  (civic-prose, words-engine) or the code gate (merger).
---

# Words stamp read

A words read answers one question for one exact sha: can a player meet every word this pull request adds or moves, and does each one read right where it is said? The reader writes no lines, makes no ruling, never marks ready, merges or pushes. The owner's scene rules themselves live in words-reads; this is the reader's method and the builder's send list. A question the rules do not answer goes to the Words lead.

## What a builder sends

1. The full 40-character head sha. A read is for one sha.
2. A played file under `/mnt/project-files/words-lead/<area>/`, headed with that sha and made by a run at that exact head. A run made at an earlier commit is not accepted, even when the commits since change only a pool line or the judged stores (Account lead, 12:37Z). A carry-over to a moved head needs a new file made at the new head, headed with its sha: a file headed with the old sha does not carry over, even when no line changed.
3. Whole talks, not summaries and not a list of what the engine may choose: every line in order, the place and seed, and at each turn the replies offered under "You say:" with the one pressed marked (rule 114). For a second ask or a before and after, show both side by side.
4. Every new string in the diff seen at least once: each wording, each sibling (he, she, they; increase and reduction; every level or title a table adds), each label, and each data name a player reads (a body's name, a member's title) inside a sentence that uses it. What cannot be played is deleted from the PR, not kept.
5. No hand staging (Account lead, 09:31Z and 15:19Z, for every PR). The person in the played file acts from their own traits and record, reached by the game's own path. Refused: a copied record, cash written onto the player to pay a fee, another person's traits written onto a colleague, a stand-in casting a vote, a gift of a staged size, a helper function called by the test to do what a played yes does. Allowed: taking a named official's seat as the player and pressing the replies as that player (name the official outright; do not work out "most visited" while the run goes); the player taking a job the game offers and paying from that pay.
6. When the head moves, delete the played and verdict files for the old head (owner, Nov 15: no old copies). Never keep a file named old or superseded.
7. Merge the newest Train head before you ask (Account lead, 18:08Z). The reader sends back a head that sits on an older Train without reading it.
8. Composed is not played (Account lead, 17:33Z). A wording shown only as "also drawn on other days", "other wording" or under other world seeds gets no stamp: show it said in a played talk at a named place and seed, or delete it and file an item that brings it back when a talk says it.
9. A name that fills a slot is part of the line (Account lead, 18:26Z). Every value a table adds for a slot a player hears (a payment's name, an office's name) is said in play or comes out of the table, and the talk must then not fire for that kind rather than fall back to a wrong or empty name.
10. Cutting the bank to force a wording (Account lead, 18:30Z) is accepted only when: the moment is a real record the game made in a played world at the exact head with the whole world running; the line is one the full bank's own rules make eligible for that moment; and the cut changed only which eligible wording the picker took. The file gives, for each line, the record, the place and seed, and the list of wordings that were eligible. A line shown only because the cut let it pass a required fact, kind or tie is unplayed.

## How the reader reads

1. Confirm the head: `git ls-remote origin refs/pull/N/head`, then fetch it.
2. Find the base. With the newest Train merged (required), the base is that Train head: `git merge-base <head> <train head>` returns it, and if it returns an older Train commit the builder has not merged the newest Train; send the head back. Never the last "Fold" commit in the log, which may be another PR's.
3. Compare by piece, not by file. Print text and uses for every piece in `data/english/parts/*.json` at the base and the head, sort, and `comm`: lines only in the head are the PR's adds or moved placings, lines only in the base its removals. A text that also exists at the base is a placing change, not a new line. For a PR stacked on another, subtract the other PR's adds against the same train. Diff `src/bench/data/controls.json`, `data/english/*.json` and any data file whose strings reach a screen the same way.
4. Seen played: for each new text take its longest stretch between slots and search the played file. Zero hits means not seen. Check slotted lines by hand; a shared fragment can hide a missing sibling.
5. Check the file's heading against the head and its write time against the head's last commit. A file headed with another sha, or older than the head, means stamp nothing and ask for a rerun.
6. Read every played line for fit, the old lines around the new ones too: who is speaking, to whom, where, and what was said one line before. The rules are the owner's words file and the played-scenes feedback (rules 100 to 120) under `words-lead/`. The faults that turn up most:
   - a reply or close that is false on the record ("we both said it out loud" after the player passed);
   - a word that points at nothing ("it", "this", "they" with no thing named);
   - a friendly line placed as a confrontation, so only jabs are offered;
   - a question offered with no answer, or a "why" answered without a reason;
   - a name slot filled with the wrong person, or a record's description read aloud as a name;
   - a figure said in talk, a count or status line in a scene, a promise the game does not stage;
   - a line respelled or shortened only to pass a check: send it back, the line's writer rewrites it;
   - a scene lead that names the person and then says "Someone", or seats a person at home with the player and then puts them "at your door" (a housemate is never "at the door");
   - the same thing named two ways in one scene (an office by the body's name in the lead and by the seat's title in the opener);
   - a line that calls a count thin, close or short when the figures the player can read say otherwise;
   - a reply that belongs to an earlier moment still offered after it has passed (pre-vote replies after the race is lost);
   - people who the record says shared something (a school, a bill on the desk) opening as strangers; between an executive and a sponsor whose bill reached their desk this is a blocker (Account lead, 16:27Z).
7. Words that agree with a wrong record are still wrong. If a line was bent to match bad casting or bad data, the fix is the casting or the data.

## The verdict

- Clear: comment on the crew issue, first line `Words lead (second reader): train-ready #N <full sha>` (or `carry-over train-ready` when a moved head changed no words by piece). Say how many lines were read and which were questioned, state every limit plainly, and end with the Claude Code footer. Then tell the Account lead in one line and the builder's thread.
- Not clear: post nothing. Send the builder a short numbered list: the line, the place it played, the rule it breaks, and what a true version would need. Ask for fixes by placement or deletion, never by loosening a test. Say what you will read next (the new sha, the replayed section).
- A PR that changes few words but puts a faulted scene in front of the player: the reader reports the scene's faults and the Account lead decides whether it holds.
- A fault outside the PR goes to the Account lead in one line with the place, the seed and the line. The reader files and fixes nothing.
- A question the rules do not answer goes to the Words lead; the reader never rules.
- If a ruling from the Account lead crosses with a stamp already posted, post `Words lead (second reader): stamp withdrawn #N <full sha>` under it with the reason, so nobody folds on the old line.
- A carry-over line says what was compared (the by-piece lists at both heads) and that the played file at the new head was read; if the old file is deleted, say that "the same" rests on the compare and the read, not on a diff.
- Thread messages cap at 2,000 characters. A longer read goes in a file beside the played file and is deleted when the head moves or the PR is stamped.

## When the builder's thread is gone (Nov 17, Story lead)

- The Words lead's and its builders' played files were kept under `/mnt/project-files/words-lead/`, which a cloud session on another account cannot read. The reader then remakes the evidence: a Sonnet helper merges main into the branch (a train base that main already holds is read against main), makes the by-piece lists against main, runs the PR's own tests, and plays the lines at the head with the branch's own scripts or one written in its scratchpad (never committed), at two or three drawn seeds. The stamp or hold rests on that run and names it. The same helper then carries the fixes as the branch's fixer, since no builder session remains.
- The read of #9512 (Nov 17) found four classes a replay catches that a test does not: a figure said in the narration and again in a reply, a reply answered by a line that answers something else (an `after` placing missing), a possessive built after an appositive ("the Select Board,'s team"), and a pin that stopped reaching its case once main moved. Look for each in every replay.

## Traps found Nov 15 (after #9455, #9369, #9389)

- Two lines that differ by one word (a form with "the" and one without, a slot in a different spot) match the same search fragment. Count each sibling by the words only it has, or by its key; a fragment match on the shared part is not "seen". The Words lead's own check passed an unplayed line this way.
- A played file that prints only the last thing said ("They say:") can hide a line that showed before it. Read the file's full line list for each talk and ask the builder to say which lines show on screen together.
- An answer to "What happened?" or "Tell me" must tell more than the question that opened the talk. If the slot it fills is shorter than the opening's own words, the player learns nothing; question it even when it follows a ruling to the letter, and send it to the Words lead.
- A line that invites a question ("Ask me about it.") does not fit a speaker who raised the subject themselves.
- A place fact shown to the player (a county, an office) is checked against what the game can know before a stamp; say so as a limit when you cannot check it, and tell the Account lead.
- A second stamp behind the Words lead's line is still a full read. Do not assume the first read covered a line.

- Before messaging a builder, match the requester's session id against the thread list; a PR's topic does not tell you its thread, and a send-back went to the wrong thread once.
- The project folder can show a new file late. When a builder says a file is there and it is not, or before you tell a builder its sheet is missing, list the folder again after twenty seconds, then ask.
