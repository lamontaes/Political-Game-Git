---
id: words-goodbyes-never-say-the-name-of-someone-met-before
title: "Let someone who met the player before today say their name in the goodbye"
area: words
kind: bug
priority: 2
size: S
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
source: Account lead thread, Nov 15, 2026: the 33 reworded farewell-core goodbyes could not be shown said in any played talk
checked:
---

**What.** Someone the player has met before still says a stranger's goodbye. The 33 goodbyes of the farewell-core move that speak to someone already known ("Always good to see you", "Don't be a stranger", "Glad you stopped by") are never said in play. In four drawn places over 200 played days (and in a three-talk goodbye-where staging) none of them came up, and at nine drawn places every relative of the player living outside the player's household is a husk, so no one the player talks to in person is in the family-away case either. Seen: a played talk with someone met on an earlier day ends on a goodbye that says the player's name.

**Cause.** Found in code: `partingLine` in `src/director/conversation.ts` sets `about-again`, `met-before` and `player-first` only when `saysName` is true. `saysName` is true for family, for a name given in this talk, for a contact learned before today (`knownIdSources`, set only for the generated opening family), or when `lastContact` is dated before today. The talk itself stamps today as the last contact on the tie before the goodbye is composed (the greeting still reads "last time was a few days ago" because it runs before the stamp), so the last branch is never true for a talk in progress. A person the player has met on an earlier day therefore never says the player's name in the goodbye, and those lines have no route. The core lines are also stage default only, so housemates never get them.

**Fix.** Read the contact date from before this talk: `saysName` and `partingLine` use the last contact the tie held when the talk opened (kept on the conversation when it opens), not the one the talk just wrote. Pin a test at a named place and fixed seed that stages an earlier meeting through the game's own call (`api.meet`, then days pass), plays the talk with the topic named, and shows a farewell-core goodbye said with the player's name. Check with the conversation engine thread that no other pull request changes the same lines first. Any of the 33 reworded lines that still has no route after the fix is deleted from the bank in the same pull request.

**Time box.** 3 hours, Opus.

**Rules.** Follow the standing rule "Wire to the world" and the other standing rules in AGENTS.md; the lines are played at the head, sheets go to the second reader, and the reader stamps the exact head.

**Done when.** At a named place and seed, a person the player met on an earlier day says a farewell-core goodbye with the player's name in a played talk, shown by line. At two more drawn places (name each place and seed) the same holds. The 33 reworded lines are played at the head or deleted. A second session, on main, plays the same and sees the goodbyes.

**Waits on.** The padded-name pull request #9398 folding into the train.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** Built on branch claude/project-thread-nue48y-p11: the conversation keeps whether the other person had met the player when the talk opened (`metBeforeAtOpen`), and `saysName` reads that. The reworded text of the 33 goodbyes is in; twins cut onto them are deleted without moving their uses, and "Good talking with you." is deleted because it was not said in any played talk at four places. Pinned test: src/director/goodbye-met-before.test.ts (Kingston 3238100, seed c1).
---
