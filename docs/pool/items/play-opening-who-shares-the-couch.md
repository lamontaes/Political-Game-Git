---
id: play-opening-who-shares-the-couch
title: "The man on the couch in the opening is someone the records say lives with the player, never a partner the player was not given"
area: play
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: play-first/play-opening-who-shares-the-couch
pr: #7074
blocked-on:
source: owner playtest of v0.73.0, Nov 1, 22:25 UTC
lead: play-first
milestone: play-first
claimed-at: 2026-11-01T22:18:52.337Z
---

**What.** Owner, Nov 1 playtest of v0.73.0: "I guess it has chosen to make my character gay again. I don't know why." The opening's last shot puts the player on the couch with Sean McMillan, a man with another surname, and the Oct 29 ruling ends the montage with the partner's "Did you see the President's speech?". A player who is 17 turning 18 normally lives with family; no orientation record exists yet (people-orientation-record is blocked on people-partnership-forms). Find who Sean McMillan is to the player by record, why the opening cast him in the partner's place, and fix it in the writer that made it.

**Rules.** Ask why: the PR names the record that put him there (household, kin or partnership id) and the line that cast him. Two-level population: the cast comes from the player's household and circle. Wire to the world: a partner appears only when a partnership record names one, and orientation comes from the people-orientation-record once it lands.

**Done when.** In three played openings in places drawn from all 56 (named with seeds), the person beside the player at home is a member of the player's household by record id, named by relation in the PR; no player is shown with a partner the records do not hold; and the PR names the cause found for the v0.73.0 game.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The person beside you at home after the address is someone you live with, named by how they are related to you.

**Screenshot.** The opening's last shot in a drawn place, with the person's relation on their card.

**Files.** src/director/opening-story.ts, src/bench/play.mjs, src/core2/opening-partnership.ts

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest (Nov 1, 22:25 UTC, five screenshots, New Game). Read: OWNER-DECISIONS (Oct 29 02:35 opening montage and address; Oct 29 address "no real statistic in play"; Oct 26 one scene system), the pool for twins.

Lane 5 (pool truth, Nov 3): claimed with PR #7074 open from its branch; set in-pr.
