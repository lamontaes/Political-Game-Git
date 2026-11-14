---
id: core-ties-across-households-fade-and-are-not-rebuilt
title: "Friendships outside the home fade and none are made: the town's close ties across households shrink, and the player makes none in 180 days"
area: people
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: opus
effort: medium
root: design-life-record
source: Found by the short-replies builder (#9262) staging a friend accusation, Nov 14, 2026; the lead (Account lead) called it a simulation fault and asked for this item
---

**What.** In an unattended played world, people make no new close friends outside their own home. In three drawn places, the close ties across households (closeness above 0.5) shrink by 15 to 30 percent over 180 days, even though contact ties grow six- to tenfold. In the same 180 days, the player gets no tie outside their household above 0.05. The owner's ruling is that the world moves on its own, town, state and country, so friendships should form and deepen without the player. A scene that needs a close friend living apart (the friend accusation, a friend asking for help) cannot be cast. Seen: who the player and the townspeople count as close in play, and which scenes come.

**Cause.** Measured: buildBenchWorld with `twoLevel: true`, places drawn by `drawPlace(seed, "short-replies-friend")`, counting `core.relationships` between living people in different households at day 0 and day 180 (closeness by `closenessBetween`):

- Willamina, Oregon (seed c0ffee08): 207 contact ties become 1,407; close ties across households go from 316 to 270.
- Bryant, Illinois (seed c0ffee13): 98 contact ties become 687; close ties go from 239 to 167.
- Pacific Beach, Washington (seed c0ffee02): 167 contact ties become 1,653; close ties go from 320 to 257.

At the same three seeds, the player's closest person outside the household is at 0.03 or less on day 30 and day 180. The counts come from played/ties-across-households.ts and the player's ties from played/play-accusation.ts (PROBE=1 and APART=1), both under /mnt/project-files/words-lead/short-replies/conflict-accuse/. Contact ties form, but the hours written into them never outrun the fade (`closenessAfter`, src/core2/closeness.ts); where they are written is the free-block contact choice (src/core2/free-block.ts). The exact line is not yet traced.

**Fix.** Trace why contact hours stay below the fade: the hours `api.relationship` gets from the free-block contact choice, against `closenessOtherHalfLifeDays`. Then make a person's repeated time with the same people build closeness the way household time does, from their own choices: whom they see, how often, and their traits. Do not add a friendship roll. The player is part of the same choice, so neighbors, coworkers and people met at work or a cause become close through time spent. The player sees it in who counts as close and in the scenes that can now cast a friend.

**Time box.** 4 hours, Opus.

**Rules.** No dice: friendships form from people's own scored choices of whom to spend time with, never a roll or a set rate. Sliding scales and causes: closeness rises with hours together and fades with time apart, as the closeness model already says. Speed: no whole-world scan per day; the contact choice already runs for the focus set.

**Done when.** In the played world (buildBenchWorld), at the three named places above and a place drawn from all 56 (named with its seed), 180 unattended days leave more close ties across households than day 0, and the player has at least one person outside the home whose closeness rose from time together. Each is named by relationship id. Year time is within the 20 percent speed bar. A second session, on main, plays a life for half a year and sees a neighbor or coworker become someone close.

**Waits on.** Nothing.

**Files.** src/core2/free-block.ts, src/core2/closeness.ts, src/core2/data/closeness.json

**Notes.** Filed by hand on the #9262 branch, Nov 14. The friend accusation was staged instead with talk hours written through `api.relationship`, as the conversation engine writes them (played/friend-*.md).
