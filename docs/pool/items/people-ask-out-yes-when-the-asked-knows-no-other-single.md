---
id: people-ask-out-yes-when-the-asked-knows-no-other-single
title: "Ask out is a yes at any fit when the one asked knows no other single in town: a 50-year-old said yes to a 20-year-old"
area: people
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9256
after:
blocked-on:
lead: people
source: "Family life thread, Nov 15, 2026, the #9256 card walk at 0bf3e4f54081e8008476b729cee2c63ce94ec929"
model: opus
effort: medium
root: none
---

**What.** The answer to the player's Ask out has nothing to weigh the asker against when the one asked knows no other single in town, so any age fit above zero and any tie above zero is a yes. Seen at Bridgeville, Delaware, world seed 5babf72e-9cb3-493b-9736-1e30a09cd3e5. The player was a created adult born 2004 (age 20). Thomas McConnell, 50, who works outside Bridgeville and knows no single in town, answered a first ask "I was hoping you'd ask." and they started dating. Seven people before him had said no, among them "We're at different places in life." The walk log is at /mnt/project-files/words-lead/family-life/card-9256/0bf3e4f54081e8008476b729cee2c63ce94ec929/asks/walk.log, line 344, with pictures 64 to 68. Seen: the Ask out answer on a person's card, the Propose that the card then offers, and every dating scene that follows.

**Cause.** Found in code: `askOutWeight` (src/core2/modules/partnerships.ts, about line 1175) weighs the asker's fit times tie against the best other single the asked person knows in town. With none, it returns a weight of one, a yes (`if (!best) return { weight: one, ... }`). The weight is only relative, so a pairing a real person would turn down passes when there is no one to compare against.

**Fix.** Rest the answer on what the game already holds about the two people as well as the comparison: the age gap read through the partner age table against the asked person's own age (how common a partner of that age is for them), how well they know each other (closeness against what is typical for the asked person), and what each wants (whether the asked person is looking, from their record). The comparison with other singles shifts it but never stands in for it. No cap, no threshold and no floor number. A sliding weight that a poor fit pulls down on its own.

**Time box.** 4 hours, Opus at medium effort. When it runs out, write what was found in Notes and stop.

**Rules.** No dice: the answer is the asked person's own weighing of their record, never a roll. Sliding scales and causes: no age cutoff and no minimum fit. One rule, all 56 places: prove it at the pinned place and two more drawn places, named with seeds.

**Done when.** At Bridgeville DE with the same creator settings, and at Pulaski OH seed family-a, a person who knows no other single answers an ask from someone with a fit as poor as 20 and 50 with a no, and the scene says why. The courtship test's cold no and its yes after evenings together still hold. A second session sees the answer on the card of a drawn life.

**Waits on.** Nothing.

**Files.** src/core2/modules/partnerships.ts, src/core2/partnerships-courtship.test.ts, src/director/ask-answer-scene.test.ts

## Notes

2026-11-24, family life thread: built on #9256 (branch claude/project-thread-x53b5q, 56de67f3 and 66d64ff4). With no other single known, the asker is now weighed against the wider population, where the monthly review finds a partner for such a single (meetPartner): the best age fit for the asked person's age, and their typical tie to people outside their family they know in town. At Pulaski OH, seed family-a, Vanessa (born 1982) asked cold by a player born 2006 now says no for the age gap (weight 0.006; it was a yes at weight 1). The courtship test's cold no and its yes after evenings together hold, and so does Westwood KY, seed family-n. The scene that says why waits on Story's lines, like the rest of #9256. Bridgeville DE with the same creator settings is not yet replayed.
