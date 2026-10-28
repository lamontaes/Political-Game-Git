---
id: scene-veto-override-whip
title: "A sponsor counts votes to override a veto: the sponsor asks the most movable member, before the vote"
area: words
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/director-veto-override-whip
pr: #6421
blocked-on:
lead: director
source: added with npm run pool -- add
claimed-at: 2026-10-27T21:12:23.084Z
---

**What.** Veto overrides are recorded 4 to 13 times a year in a drawn place and only the sponsor gets a veto scene. The members who decide an override have vote rows (votes table, id vote:<bill>:<member>:override, with vote and position.total) that no situation type reads. Add a veto-override cause: the sponsor asks the member whose override vote was no or abstain and whose position is nearest zero. Packet with trigger, place, cast rule and outcome record: docs/design/scenes/from-life/veto-override-whip.md.

**Rules.** No dice: the member cast is the nearest to zero by position.total, never a roll. Every weight is a TUNABLE row in src/director/data/director.json with its spread (director.test fails on a number in director code). One rule, all 56 places. No real name or quoted line.

**Done when.** src/director/override-scenes.test.ts in the played world (buildBenchWorld), a place drawn from all 56 with a seed nobody chose, shows a veto-override record (record id named) firing a scene for its sponsor and a member with a vote row, citing the vote row id, saying the bill; the test fails when the record is absent; lines pass player-screen-text.

**Files.** src/director/data/situation-types.json,src/director/data/purpose-arcs.json,src/director/civic-roles.ts,src/director/override-scenes.test.ts,data/english/parts/scene-talk.json

**Notes.** lead: director. Time box 4 h, Opus. Waits on nothing for the cast (vote rows exist); the chamber setting and the reply read wait on laws-override-record-names-members-and-reads-replies. Drafted lines for the words lead (scene-standard rule 4; versions by the speaker's top trait and tie): SPONSOR ASKS, driven: 'I'm short on {bill}. You're one of the few I can still reach.' / warm: 'I know you didn't want to be in this spot. Tell me what you need.' / guarded: 'I'm asking once, before the vote.' / close tie: 'You and I have never needed to count each other.' FOUR REPLIES (four stances): STAY 'I voted for it in the spring. I can't cross {executive} on this.' / SWITCH 'All right. I'll vote to override.' / ABSENT 'I'll be at a family thing that day. Don't ask what I'd have done.' / PRICE 'Get my district its road money and I'll find my voice.' Scene builder C, Oct 27.
