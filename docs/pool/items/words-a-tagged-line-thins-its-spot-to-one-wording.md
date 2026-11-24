---
id: words-a-tagged-line-thins-its-spot-to-one-wording
title: "Tagging one line of a spot with a fact leaves that spot one wording whenever the fact holds, so the plain lines beside it are never said"
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
effort: medium
root: none
source: Account lead, Nov 15 12:50Z (the class behind stall-after-vote going red after #9433)
---

**What.** When one line of a spot gets a `requiresFacts` or `onlyWhen` tag, every untagged line that fits the same spot stops being offered whenever that fact holds. The spot then has one wording. Seen on the reporter's call after a vote (Train 7a48e0b3, the packet in src/english/stall-after-vote.test.ts, from Salem, Ohio 3969834, seed rank-m4). #9433 gave "Fine. The answer is I'd do it again." `requiresFacts: [acted]`, so "Alright, plainly: I stand by it." is never offered beside it after a vote. It gave "Your vote is public. Your reasons don't have to be a secret." `requiresFacts: [acted]`, so "{place} votes in November. People will want this before then." is never offered after a refusal.
Seen: on the reporter's call after a council vote, the same reply and the same press come every time.

**Cause.** Found in code: `useFit` in src/english/scene-talk-words.ts adds one point for each fact a use checks (`requiresFacts` plus `onlyWhen`), and `scoredFits` keeps only the top score. A true line with no tag loses to a tagged one by one point. The rule exists so the line about the moment is said (words-a-line-ranks-by-every-fact-it-checks). It also means each new tag silently thins the pool beside it. A count from data/english/parts/scene-talk.json alone, at 7a48e0b3, found 275 spots (97 of them reply steps) of the 1,870 with two or more uses. In each, when one tagged line's facts hold, that line alone has the top score while at least one other line also fits. The count does not tell an intended "say the specific line" from an accidental thinning.

**Fix.** Do not change `useFit` before a ruling. The Words lead rules which of the two is wanted at a spot that thins: the tag stays and the spot gets a second line with the same facts, or the untagged line is tagged too because it is true only when the fact holds. A small script lists the thinned spots in the order the talks reach them, for the Words lead to rule in batches. A guard keeps a new tag from leaving its spot one wording without a ruling recorded on the spot.

**Time box.** 3 hours for the list and the guard, one Opus session at medium. The lines are the Words lead's.

**Rules.** Ask why: every thinned spot the script lists names the tagged line, its facts and the lines it hides. No line is written or tagged by a builder, and no test is loosened to pass.

**Done when.** The script lists every thinned spot with its tagged line and the lines it hides. The guard fails on a new tag that thins a spot with no ruling. A second session plays the reporter's call after a vote at a drawn place and sees two wordings offered at the answer after a press and at the press after a refusal.

**Waits on.** Nothing.

**Files.** src/english/scene-talk-words.ts (read only), data/english/parts/scene-talk.json, a new script under scripts/, tests/guards/

**Notes.**

- Nov 15: found from stall-after-vote.test.ts, red since #9433 (fold 1d090330). The test's packet now carries `acted` (Account lead's yes, 12:50Z). It stays red until the Words lead's lines exist.
- Nov 15, 23:00Z (press-comment-why-answered-by-the-roll): after a vote, the reporter's "why" is answered by the two largest reasons the roll holds. The plain yes answer, for a member with no part of their position leaning yes, is taken out: no vote reached it. A script drew 60 places (`plain-yes:0` to `plain-yes:59`, one bill each, for and against), and every voting member had their own view, the people or trust in the bill's author leaning yes. On their own bill the player has one reason leaning yes, so that answer has one wording ("It's my bill. I believe in it.") until the Words lead writes a second.
