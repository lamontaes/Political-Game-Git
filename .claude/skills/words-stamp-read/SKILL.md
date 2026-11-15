---
name: words-stamp-read
description: How a words reader reads a pull request's player-visible words before it folds, and what a builder must send to get that read. Covers finding the PR's own lines by piece against the train it merged, checking every new string is seen played at the exact head, reading each played talk for fit against the owner's rules, the stamp line, limits, carry-overs and send-backs. Use when you are a words reader or second reader, and when you are a builder about to ask for a words stamp. The owner's scene rules themselves live in words-reads; this is the reader's method and the builder's send list. Not for writing lines (civic-prose, words-engine), ruling on a question the rules do not answer (the Words lead), or the code gate (train-gate, checker).
---

# Words stamp read

A words read answers one question for one exact sha: can a player meet every word this pull request adds or moves, and does each one read right where it is said? The reader writes no lines, makes no ruling, never marks ready, merges or pushes.

## What a builder sends

1. The full 40-character head sha. A read is for one sha.
2. A played file under `/mnt/project-files/words-lead/<area>/`, headed with that sha and written after the head's last commit. Say in the first lines if any run was made at an earlier commit and what the commits since change.
3. Whole talks, not summaries and not a list of what the engine may choose: every line in order, the place and seed, and at each turn the replies offered under "You say:" with the one pressed marked (rule 114). For a second ask or a before and after, show both side by side.
4. Every new string in the diff seen at least once: each wording, each sibling (he, she, they; increase and reduction; every level or title a table adds), each label, and each data name a player reads (a body's name, a member's title) inside a sentence that uses it. What cannot be played is deleted from the PR, not kept.
5. Staging is allowed when it is marked STAGED and goes through the game's own path.
6. When the head moves, delete the played and verdict files for the old head (owner, Nov 15: no old copies). Never keep a file named old or superseded.

## How the reader reads

1. Confirm the head: `git ls-remote origin refs/pull/N/head`, then fetch it.
2. Find the base: the train commit the PR merged (the second parent of its last train merge), or the train commit under its first own commit. Never `merge-base`, and never the last "Fold" commit in the log, which may be another PR's.
3. Compare by piece, not by file. Print text and uses for every piece in `data/english/parts/*.json` at the base and the head, sort, and `comm`: lines only in the head are the PR's adds or moved placings, lines only in the base its removals. A text that also exists at the base is a placing change, not a new line. For a PR stacked on another, subtract the other PR's adds against the same train. Diff `src/bench/data/controls.json`, `data/english/*.json` and any data file whose strings reach a screen the same way.
4. Seen played: for each new text take its longest stretch between slots and search the played file. Zero hits means not seen. Check slotted lines by hand; a shared fragment can hide a missing sibling.
5. Check the file's date against the head's commit times. If runs were made earlier, read the diff since: only pool items, tests, scripts, deletions or a train merge may be accepted, and the stamp must say so. The Account lead may still require a rerun at the exact head.
6. Read every played line for fit, the old lines around the new ones too: who is speaking, to whom, where, and what was said one line before. The rules are the owner's words file and the played-scenes feedback (rules 100 to 120) under `words-lead/`. The faults that turn up most:
   - a reply or close that is false on the record ("we both said it out loud" after the player passed);
   - a word that points at nothing ("it", "this", "they" with no thing named);
   - a friendly line placed as a confrontation, so only jabs are offered;
   - a question offered with no answer, or a "why" answered without a reason;
   - a name slot filled with the wrong person, or a record's description read aloud as a name;
   - a figure said in talk, a count or status line in a scene, a promise the game does not stage;
   - a line respelled or shortened only to pass a check: send it back, the line's writer rewrites it.
7. Words that agree with a wrong record are still wrong. If a line was bent to match bad casting or bad data, the fix is the casting or the data.

## The verdict

- Clear: comment on the crew issue, first line `Words lead (second reader): train-ready #N <full sha>` (or `carry-over train-ready` when a moved head changed no words by piece). Say how many lines were read and which were questioned, state every limit plainly, and end with the Claude Code footer. Then tell the Account lead in one line and the builder's thread.
- Not clear: post nothing. Send the builder a short numbered list: the line, the place it played, the rule it breaks, and what a true version would need. Ask for fixes by placement or deletion, never by loosening a test. Say what you will read next (the new sha, the replayed section).
- A PR that changes few words but puts a faulted scene in front of the player: the reader reports the scene's faults and the Account lead decides whether it holds.
- A fault outside the PR goes to the Account lead in one line with the place, the seed and the line. The reader files and fixes nothing.
- A question the rules do not answer goes to the Words lead; the reader never rules.
- Thread messages cap at 2,000 characters. A longer read goes in a file beside the played file and is deleted when the head moves or the PR is stamped.

## Traps found Nov 15 (after #9455, #9369, #9389)

- Two lines that differ by one word (a form with "the" and one without, a slot in a different spot) match the same search fragment. Count each sibling by the words only it has, or by its key; a fragment match on the shared part is not "seen". The Words lead's own check passed an unplayed line this way.
- A played file that prints only the last thing said ("They say:") can hide a line that showed before it. Read the file's full line list for each talk and ask the builder to say which lines show on screen together.
- An answer to "What happened?" or "Tell me" must tell more than the question that opened the talk. If the slot it fills is shorter than the opening's own words, the player learns nothing; question it even when it follows a ruling to the letter, and send it to the Words lead.
- A line that invites a question ("Ask me about it.") does not fit a speaker who raised the subject themselves.
- A place fact shown to the player (a county, an office) is checked against what the game can know before a stamp; say so as a limit when you cannot check it, and tell the Account lead.
- A second stamp behind the Words lead's line is still a full read. Do not assume the first read covered a line.
