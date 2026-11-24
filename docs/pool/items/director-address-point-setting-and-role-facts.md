---
id: director-address-point-setting-and-role-facts
title: "The address talk knows where it is and who the speaker is to the player, so its lines can fit the setting"
area: director
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: director-address-reaches-beyond-the-house
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: CTO, Nov 18 13:15Z on the Story thread (issue 9750), pattern A47: the speaker is a role (kin or a housemate, a neighbor, a coworker, a regular where people gather, a party officer, rarely a stranger) and where is a slot (home the evening it aired, a gathering place, work the next day, out in public)
checked:
---

**What.** A47's lines differ by setting and by who is talking: a coworker who disagrees drops it fast, a regular at the diner says it to the room, a parent at home can say one line of praise or scorn. The talk's words cannot tell these apart today, so every setting would hear the same lines. Seen: the talk box when someone raises the address, at home and, once the address reaches them, at work and in town.

**Cause.** Found in code: `pointSubject` in `src/director/conversation.ts` sets the point's facts (the subject, the President, the stand, the reason, the town) but no fact for the setting the talk is in or for what the speaker is to the player beyond the name the player calls them (`calledBy`). `relationFacts` in `src/director/relation-facts.ts` knows family and earlier meetings, but no talk subject passes a coworker, neighbor, regular or party-officer mark to the words.

**Fix.** Add setting marks (`at-home`, `at-work`, `at-gathering`, `in-public`) from the place record the talk happens in, and role marks (`role-kin`, `role-housemate`, `role-neighbor`, `role-coworker`, `role-regular`, `role-party-officer`, `role-stranger`) from the family links, the household, the shared employer, the address and the party's offices, in `pointSubject`. Add `watched-together` where both hold the address from the same airing. Add `disagree-room` where the room mostly disagrees with the speaker. The branches of A47 read these marks: a work disagreement drops it and records the disagreement on the tie, a party officer ends on the next meeting, and the home one-liner is allowed with no closer. Every mark cites its record.

**Time box.** 3 hours.

**Rules.** One rule, all 56 places: the marks come from records, never a named place. Gates are records, weights shape who speaks (A47).

**Done when.** A second session sees a played talk at home, one at work and one at a gathering place each carry their setting mark and the speaker's role mark with record ids in the dev mode Trace, and a piece that requires `at-work` plays only at work.

**Waits on.** director-address-reaches-beyond-the-house (outside the home nobody holds the address yet).

**Files.** src/director/conversation.ts, src/director/relation-facts.ts

**Notes.** Nov 18 (Story): the line writers for work, gathering places and out in public start once these marks exist.
