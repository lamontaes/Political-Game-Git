---
id: story-announcing-ways-in
title: "Saying you will run is a moment in the world, with several ways in, each a scene written from a record"
area: director
kind: feature
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: fable
effort: high
root: none
source: owner, Nov 17, 21:15Z, verbatim on #9750 ("announcing has to work somehow... There needs to be a bunch of different ways. Again, this goes to the story."); the CTO's note of 21:06Z
---

**What.** The player announces a run as a button that flips a state. The owner wants it to be a moment in the world with many ways in, which ways a life has depending on the player's life and place, and who hears depending on the way.
Seen: the owner's Nov 17 sitting and his words of 21:15Z on #9750.

**Cause.** Design: the owner's ruling of Nov 17, 2026 (docs/coordination/OWNER-DECISIONS.md, Nov 17, and his words on #9750 at 21:15Z). The `candidate-announced` record (#10013, on train/nov17b) is written by one control; no scene writes it, and nothing reads who was told.

**Fix.** Four ways in, each a scene the English engine writes from the record and the people present, under the delete ruling (no stock lines), built in this order: a quiet word to someone close in an everyday talk (the player's reply writes `candidate-announced` naming the one told; the household and circle know); the party's office where the place's organizations hold one (the record names the party, which learns it and may steer or push back in the next talk); a public moment at an event the player attends, through the speech planner (the room hears and the press desk weighs it); the first vote asked before filing (the record is written by the ask itself). Patterns from docs/story/scene-patterns.md (deciding to run, filing). Who hears is read from the record by the talks, the party and the press desk.

**Time box.** 12 hours over two sessions, the Story lead at high, with a Sonnet helper for the party-office read.

**Rules.** One engine per mechanic: the announcement is one record (#10013) every way writes; no second store. An effect is a read: who hears is read from the record by the talks, the party engine and the press desk. No hand-written player text in code: every line in the banks with an insert from the record.

**Done when.** A second session, in a drawn place on main, announces by a quiet word at home and sees the household bring it up the next evening and nobody else; announces at the party's office in a place that has one and sees the party's next talk read it; the `candidate-announced` record names the way and the one told in dev mode's trace.

**Waits on.** #10013 on main; the cut (#9999, #10023, #10011).

**Files.** src/director/conversation.ts, src/director/purpose-scene.ts, src/core2/modules/candidacy.ts, data/english/parts/conversation.json, data/english/parts/scene-talk.json

**Notes.** Nov 18 (Story): first report posted on #9750 (https://github.com/lamontaes/Political-Game-Git/issues/9750#issuecomment-6969569334), waiting on the Words ruling. Facts read from the train head 0e83d2c4fd: `candidate-announced` is written only by `announceCandidacy` (src/core2/modules/elections.ts) from the race page's Announce button (src/bench/play.mjs, no dev-mode gate) and read only by campaigns.ts (the committee) and voting.ts (the petition); it carries no `how` and no one told. Party records exist in 12 of 12 drawn places (two parties each, a chair, members, a monthly meeting, the office organization with the `campaign-office-storefront` picture), and Travel lists the office to the party's members only (src/bench/places.ts). A talk's reply writes `conversation.told`, contact time and an observation (`sayNow`, src/director/conversation.ts) and knows no candidacy. The press desk has no story kind, printed-words builder, news or headline part or remembered.json row for the record (candidate-filed has all four), and speech word-kinds do not carry it, so nothing prints, nobody remembers it at home and no word spreads. Campaign work gated on `standing(filing)` skips announced rows. Plan in the report: four ways in, one record with `how` and `toldIds`.
