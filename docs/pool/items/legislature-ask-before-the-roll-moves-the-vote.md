---
id: legislature-ask-before-the-roll-moves-the-vote
title: "Asking a member for their vote before the roll call can change it: the answer writes a pull the vote reads"
area: laws
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/ask-before-the-roll
pr: #6443
blocked-on:
source: 'owner, Oct 14 ("convince one member to vote no on the amendment"); words-and-scenes lead, Oct 27, scene web legislating pass (packet the-vote-that-switched)'
lead: laws-effects
milestone: play-first
claimed-at: 2026-10-27T20:49:10.112Z
---

**What.** The owner's model of a consequential scene is convincing one member to switch on the floor. Today the floor-vote scene's cause, `legislative-vote`, is written after the count, so the scene arrives with the result already fixed. `vote-asked` fires only on a trade amendment the subject moved. A colleague's, leader's or executive's plain ask before the roll has no cause. A member's answer in either scene writes nothing that `memberPosition` (`src/core2/modules/legislature.ts`) reads. The packet `docs/design/scenes/from-life/the-vote-that-switched.md` draws on a council in Laramie, Wyoming and a state senate vote in New Jersey, calibration only. It shows the ask, the answers (switch, hold, bargain, ask for time) and what each cost after.

**Rules.** An effect is a read: the answer writes a signed pull (who asked, why, how strong) that the member's position reads on the roll, and the vote's reasons cite it. No dice: the switch comes from the pull against the member's own traits, ties and district. Ask why: the recorded vote names the ask.

**Done when.** In a buildBenchWorld drawn place (seed named), the day before a close floor vote, an ask to a full-person member stages before the roll, citing the bill and the member by id. A "switch" answer writes a pull. That member's recorded vote reads it in its reasons, and it changes when the pull outweighs their lean. A test fails when the pull is written and the vote's reasons don't cite it.

**Time box.** 4 hours.

**You will see.** The night before the vote, you ask a colleague to switch; they say yes, and the next day's roll call and its reasons show it.

**Screenshot.** The ask scene and the roll call after it, from a drawn place.

**Files.** src/core2/modules/legislature.ts, src/director/data/situation-types.json

**Notes.** The director stages the scene before the roll (lead director); this item is the read. Related: `engine-records-for-waiting-civic-scenes` (a vote promised).
