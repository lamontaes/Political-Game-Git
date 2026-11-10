---
id: words-race-told-after-ran
title: "A player who ran in a race hears its result told two days after the count, after the morning after"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/director-race-told-townhall
pr: pending
blocked-on:
lead: words
milestone: play-first
source: "a played candidate year listed race-told as never firing: it and the morning after both fall the day after the count, and only one scene a day reaches the player"
claimed-at: 2026-11-10T07:00:00.000Z
---

**What.** The director lets one scene a day reach the player and drops the other (ledger.ts, produceCircumstances). For a player who ran, morning-after and race-told were both due the day after the count, so race-told never played, and its row also lacked `playerNamed`, which the director requires of any row whose record names the player. The same collision is already settled elsewhere by giving a row its own day (lobby-remembers waits two days). A second row, `race-result-known-after-ran`, tells the result two days after the count for a player who ran in it, with its own cause on the race-told type. The first row (the day after, for a player who did not run) is unchanged. No new mechanism.

**Also found, no change.** town-hall-question is the host's scene. The town-hall record already names the host (`hostId`, and `personIds` lists the host first, then the attendees), and src/director/town-hall-question-scene.test.ts proves the scene for a watched host. NPC officials hold halls; the player holds one by choice, so the attendee's moment is a journal line and the scene waits for the player to host (campaign-forum-the-player-hosts). Nothing to fix on the director's side.

**Done when.** src/director/race-told-scene.test.ts, in a drawn place with a player who filed, composes race-told two days after the count from the count's election-result record; the unfiled case still plays the day after; director.test.ts and the families guard pass.

**Files.** src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/race-told-scene.test.ts

**Time box.** 1 hour.

**You will see.** Two days after the count, someone you know tells you who won the race you ran in.
