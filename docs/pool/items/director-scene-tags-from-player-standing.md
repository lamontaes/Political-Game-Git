---
id: director-scene-tags-from-player-standing
title: "Scenes carry tags for who the player is (office kind, level, not in office, filed), read once a day, and a scene plays only where one full path of its wordings holds"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead's scene build-out, Nov 15, 2026 (owner's rules 143 to 149, given 20:34Z to 20:43Z; plans approved by the Account lead 20:41Z and 20:45Z)"
model: sonnet
effort: medium
root: none
---

**What.** The owner wants sets of scenes that play only for a state legislator, sets for any legislator or executive at any level, and sets for someone not in office, and he calls these conditions tags. Today two separate systems say who may get a scene and neither knows the kind or level of an office. A yes-or-no fact may gate a scene; an amount only weighs it (owner, 20:43Z: "I like the mix. Exactly.").
Seen: as a state legislator the player gets the state legislature's own scenes, and as a council member or a private person never does.

**Cause.** Found in code: src/director/scheduling.ts lines 110 to 157 (`ReceiveRule` with `seat: any | serving`, read by `receives`) and src/director/circumstance.ts lines 207 and 354 to 430 (`standingOf`, `playerHolds` with 13 values on 34 circumstance rows), two condition systems with their own office reads; neither reads an office's branch or level. Bank lines are already guarded by `requiresFacts` and `onlyWhen`, read when a scene's talk is composed (src/director/scene-talk.ts) and walked path by path in src/english/answerable-asks.ts.

**Fix.** Add src/director/standing.ts with `playerStanding(core, personId)`, read once a day: each office held with branch and level (from bodies.json and the executives list), the contests filed, whether they work. `receives` and `playerHolds` both read it; `standingOf` and `serving` are deleted. `receive` gains `holds`, a list where any one match passes, using the circumstance words plus "none", "office", "office:lawmaking", "office:executive" (each optionally ":local", ":state" or ":federal") and "filed"; `seat` is deleted ("serving" becomes `holds: ["office"]`) and circumstance rows' `player` becomes `holds`. The standing is also handed to the scene's facts under the same names, so a line can require it. A candidate scene is eligible only when composing it with the moment's facts gives at least one complete path of wordings; only the day's top-ranked candidates are composed, inside the staging rule the briefing thread is writing. Where the player sees it: which scenes reach them, by the office they hold.

**Time box.** 5 hours for one Sonnet session, one PR, after the executives list.

**Rules.** Sliding scales and causes: only yes-or-no facts from the record gate; amounts such as money or a trait weigh the ranking in a separate item and never gate at a number. Replace, never layer: the two old readers and the `seat` field are deleted in the same PR.

**Done when.** A second session, on main, in a drawn place and a seed nobody chose, plays a year as a seated state legislator and a year as a council member (Advanced, Play as) with situation types tagged "office:lawmaking:state", "office:executive" and "none", and sees the first only as the legislator, the second only as a mayor or governor, the third only out of office; every scene that played before plays the same with the same cast, and the year runs under two minutes.

**Waits on.** The executives list (offices-executives-one-list). The briefing thread's staging rule, for where the path check sits.

**Files.** src/director/standing.ts (new), src/director/scheduling.ts, src/director/circumstance.ts, src/director/data/situation-types.json, src/director/data/circumstances.json, src/director/scene-talk.ts
