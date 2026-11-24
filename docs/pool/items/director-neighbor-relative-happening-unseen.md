---
id: director-neighbor-relative-happening-unseen
title: "A talk never turns back to a neighbor's own relative"
area: words
kind: bug
priority: 3
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
root: design-life-record
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** A family talk can turn back to the other person's relative ('And how's your sister?') only when something recorded happened to that relative that the player knows of. For a neighbor's relative the director keeps no moment (it keeps them only for the people it watches), and the player's own ledger gets none from witnessing their move, so the question never comes up between non-relatives. In src/director/conversation.test.ts (Jackson Center, Ohio, seed conversation-test) all four neighbors' turn-back choices are empty on main; the only questions that turned back were between relatives, about a relative they share, which play-stop-20 removes.

**Cause.** Found in code: `src/director/conversation.ts` line 975 defines `happened(id)` and line 1311 skips a listener's relative unless it is true ("And how's your sister?"). The director keeps moments only for the people it watches, so a neighbor's relative never qualifies. Measured: `src/director/conversation.test.ts` at Jackson Center, Ohio (seed conversation-test), where all four neighbors' turn-back choices are empty.

**Fix.** Give the player a recorded happening for a non-watched neighbor's relative when the player witnesses or learns of it (the life record), so `happened(id)` is true. The test's turn-back check then runs in its seeded world instead of being passed over.

**Time box.** 5 hours for one Opus session.

**Rules.** Owner, Oct 14 (Q7): someone not in the room is talked about only when something recorded happened to them. Look before you ask: the life record is docs/design/life-record.md and the happening is written there, not in a second list.

**Done when.** A second session plays a world in a drawn place (name and seed written down), witnesses or learns of something that happened to a neighbor's relative, talks to the neighbor in the running game, and sees a question about that relative offered, with the happening's record id named. `src/director/conversation.test.ts` runs its turn-back check at Jackson Center, Ohio (seed conversation-test) in its seeded world.

**Waits on.** core-life-record (the one reader of a person's life, `lifeOf`; on main once pull requests 8115, 8123 and 8139 merge). Build the fix on that reader, not on a new record.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts

**Notes.** Found by the speed lead on play-stop-20 (Oct 25).
