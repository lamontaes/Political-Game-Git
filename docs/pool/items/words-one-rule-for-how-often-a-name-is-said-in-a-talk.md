---
id: words-one-rule-for-how-often-a-name-is-said-in-a-talk
title: "One rule for how often the player's name is said in one talk"
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
source: Account lead thread, Nov 15, 2026: the second reader found 26 of the 32 goodbye scenes at #9479 carry the player's name in the line before the goodbye, often after a line that also has it
checked:
---

**What.** People say the player's name in a talk more than once, often in lines that sit next to each other: "Quinn, last time was a few days ago." then "I'm between jobs right now, Quinn." then a goodbye. A real person says a name once or twice in a talk, not in every line. Seen: in the played file of #9479 (/mnt/project-files/words-lead/padding/goodbyes-met-before-played.md before this item), 26 of the 32 goodbye scenes carry the name in the line right before the goodbye, and several carry it in the greeting as well.

**Cause.** Found in code: `youIn` in `src/director/conversation.ts` drops the name from a reply when the same speaker already said it in this talk, but the greeting core and the other cores that place a name (the own-work and school answers' `{you}`, the goodbye cores) are not all composed through it, and no one rule counts the names a talk has already said. Each bank decides on its own whether to place the name whenever `saysName` is true.

**Fix.** One rule in the one place that composes a line: a speaker says the player's name at most once in a talk unless the line is a thank-you, an apology, a plea or a call across a room; the facts of the talk (`conversation.lines`) say whether it has been said, so every bank reads it the same way. Remove the per-bank patches that exist for this, and show the changed talks said at named places.

**Time box.** 3 hours, Opus.

**Rules.** Follow the standing rule "An effect is a read, not a record" and the other standing rules in AGENTS.md; the lines played are shown in a file headed with the exact head and read by the second reader.

**Done when.** At a named place and seed (name each place and seed), a played talk with someone the player has met says the player's name once, not in consecutive lines, and the greeting, own-work answer and goodbye read as one talk. In three drawn places (name each place and seed) the same holds. A second session, on main, plays the same and sees it.

**Waits on.** The goodbye pull request #9479 folding into the train.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** Asked for by the Account lead as its own pull request after #9479; one rule, not a patch per bank.
---
