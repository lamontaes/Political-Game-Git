---
id: words-endorsement-ask-from-a-housemate
title: "Someone the player lives with who files and asks for an endorsement asks in a scene at home"
area: director
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
milestone:
source: "PR #9909 (K1), Makawao, Hawaii: a household volunteer filed and the ask went to the Journal. Story lead ruling, Nov 17: the household asker follows the rival-word ruling in #9809."
lead: words
model: sonnet
effort: medium
root: none
after: scene-endorsement-ask-says-why-now
checked: sonnet 2026-11-17
---

**What.** A spouse or grown child who has worked for the player and files for office asks the player to endorse them, and today that ask never plays as a scene and goes to the Journal as a line. Nobody else asks the player for their word as often as the people they live with. Seen: the endorsement ask plays at home when the asker lives with the player, and the opening says who is home.

**Cause.** Found in code: the `endorsement-ask` row in src/director/data/situation-types.json has `receive.counterpart: "apart"`, and src/director/scheduling.ts (the receive rule, line 139) refuses an asker who lives with the player, so the campaigns engine's `askPlayerForEndorsement` (src/core2/modules/campaigns.ts) writes the `endorsement-asked` record and the moment goes to the Journal (Makawao, Hawaii, run seed 0123456789abcdef0123456789abcdef01234568, draw 0).

**Fix.** Set `counterpart` to `any` on the `endorsement-ask` row, as the rival-word ruling in #9809 does for its type (the record is the truth), and add a lead piece that says who is home, placed by the `lives-with` fact #9809 adds, in data/english/parts/scene-talk.json (Story writes the line). Keep the reply tree unchanged.

**Time box.** 3 hours.

**Rules.** No hand-written player text: the lead line is the Story session's. Wire to the world: the fact is read from the household record.

**Done when.** A second session, in a drawn place (name and seed recorded), sees a housemate of the player who volunteered and filed ask for the endorsement as a scene at home, with the lead line naming who is home, and the reply written on the one endorsement row.

**Waits on.** PR #9809 (the `lives-with` fact) and scene-endorsement-ask-says-why-now.

**Files.** src/director/data/situation-types.json, src/director/endorsement-ask-facts.ts, data/english/parts/scene-talk.json

**Notes.**

- Filed from #9909. A household asker was the one case the K1 test had to pass over.
