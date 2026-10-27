---
id: director-neighbor-relative-happening-unseen
title: "A talk never turns back to a neighbor's own relative"
area: words
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A family talk can turn back to the other person's relative ('And how's your sister?') only when something recorded happened to that relative that the player knows of. For a neighbor's relative the director keeps no moment (it keeps them only for the people it watches), and the player's own ledger gets none from witnessing their move, so the question never comes up between non-relatives. In src/director/conversation.test.ts (Jackson Center, Ohio, seed conversation-test) all four neighbors' turn-back choices are empty on main; the only questions that turned back were between relatives, about a relative they share, which play-stop-20 removes.

**Rules.** Owner, Oct 14 (Q7): someone not in the room is talked about only when something recorded happened to them.

**Done when.** In a played world in a place drawn from all 56, a neighbor's talk offers a question about the neighbor's own relative when the player has a recorded happening for them, and the conversation test's turn-back check runs in its seeded world instead of being passed over by its records condition.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts

**Notes.** Found by the speed lead on play-stop-20 (Oct 25).
