---
id: play-campaign-asks-the-player-to-volunteer
title: "A campaign that reaches the player never asks them to help, because its ask skips the player by name"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude/blockers-campaign-ask
pr:
after:
blocked-on:
lead: governing
model: fable
effort: medium
root: rc10-screens-keep-own-facts
source: owner's play of v0.112.0, Nov 16, 2026 ("There's not much I can do since I can't run for anything"; Desk answer "Work for someone else's campaign, a party committee or an appointed board until a race opens"), crew list issue 9747 item 3a, Story's records list
checked:
---

**What.** A player with no race of their own has nothing to do in politics, and the owner's answer is to work on someone else's campaign. A campaign asks everyone its lists reach to volunteer, but it skips the player by name, so no candidate ever asks them. This is the first road of the path into office.
Seen: Beesleys Point, New Jersey (seed 1c0c38ab-cccf-45f2-943d-b108847e2981), Elections on day one offers one race whose filing opens five months later and nothing else to do.

**Cause.** Found in code: src/core2/modules/campaigns.ts `askForSupport` builds its volunteer pool with `id !== playerId`, and no engine keeps an ask for the player to answer, as `askPlayerForEndorsement` does for an endorsement.

**Fix.**

1. `askForSupport` asks the player when `reachablePeople` reaches them: `askPlayerToVolunteer` keeps the ask (`volunteerAsks`) and writes the `volunteer-asked` record with the campaign, the race and the candidate.
2. The player's reply in a `volunteer-ask` scene (`answerVolunteerAsk`) casts their yes and takes them on through `askToVolunteer`, which writes `campaign-volunteer-joined`; a no stands for the race; a put-off comes back after the offer spacing days.
3. Story writes the `volunteer-ask` scene and its lines on the record's facts.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: the player's answer is the player's own reply in a scene, never drawn; the campaign asks by the same rule it asks everyone it reaches.

**Done when.** A second session plays a drawn place it writes down with its seed until a candidate from the player's circle files, and the candidate's campaign asks the player to help in a scene; a yes puts the player on the campaign's volunteers, read by dev mode's Trace of the campaign.

**Waits on.** Story's `volunteer-ask` scene and lines.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-volunteer-ask.test.ts (new), src/core2/data/opening/day-zero.json

**Notes.** Filed and built by the Blockers lane, Nov 17. Replaces the plan in #9744 for this road.
