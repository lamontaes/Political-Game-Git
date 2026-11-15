---
id: talk-last-seen-reads-only-the-tie-row
title: 'The person card and "haven''t seen you since" read only the tie row, so a colleague the player sat beside yesterday has not been seen in weeks'
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: legislature-colleague-ties-stay-slight
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, merging #9489 with #9557; the Account lead ruled the card and the talk stay on the row until this item
---

**What.** Two reads of when the player last saw someone read only the tie row (closeness.ts `lastMetOnRow`): the person card's last contact (src/bench/card.ts) and the talk's `lastContact` (src/director/relation-facts.ts, read by the quiet subject and by many conversation lines). The time two colleagues share in sittings, committees and caucuses lives in the sitting reader, not on the row. Seen: a colleague they sat beside on the floor yesterday says it has been a long time, and the card says they last saw them weeks ago.

**Cause.** Found in code: src/bench/card.ts and src/director/relation-facts.ts read `lastMetOnRow`. Since the rooms change (legislature-colleague-ties-stay-slight), the player's sittings write no tie row. `lastTogether(core, a, b)` reads both the row and the sittings, but these two readers still read the row alone.

**Fix.** Read `lastTogether(core, a, b)` in both. `lastContact` keeps the row's id as its source when the row's day is the latest, and names the sitting's record otherwise. The lines that say it need a words reader's stamp.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One read: the card and the talk read `lastTogether`, never a copy. Words: every changed line is played and stamped.

**Done when.** A pinned test at 4846968 seed 8647-mason (player at seat 016) shows a colleague the player sat with the day before with no "last-together" fact, and the card's last contact on that sitting day. A drawn place where the player sits on a body shows the same in a played week, naming the place and seed. A second session sees in the running game on main, after a sitting day, the card's last contact on that day and no "it's been a while" from that colleague. The talk is played and stamped by a words reader.

**Waits on.** Nothing.

**Files.** src/bench/card.ts, src/director/relation-facts.ts
