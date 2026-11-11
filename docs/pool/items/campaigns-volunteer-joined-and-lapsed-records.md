---
id: campaigns-volunteer-joined-and-lapsed-records
title: "A volunteer joining or lapsing from a campaign writes a record with its reason"
area: elections
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-campaigns-volunteer-joined-and-lapsed-records
pr: #8393
after:
blocked-on:
source: "Helper B, Oct 27, docs/design/scenes/from-life/quiet-weeks-listener-offers.md"
lead: effects
claimed-at: 2026-11-11T00:20:46.601Z
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
branch: claude/pool-campaigns-volunteer-joined-and-lapsed-records
---

**What.** A person joins a campaign through askToVolunteer or enlistVolunteer, which only adds their id to the campaign row, and nothing records when or why. Nothing records a volunteer who stops coming either, so the quiet summer months have no cause to name. In a played world (Kanorado, Kansas, a resident's Senate filing) the candidate had 17 speech and 34 message records from May to September 2026 and 6 scenes among 102 schedule entries. Write a record when a volunteer joins, naming the speech or ask that brought them, and one when a volunteer lapses, naming the reason from their free time, the campaign's activity and their agreement.

**Cause.** Found in code: src/core2/modules/campaigns.ts `askToVolunteer` (line 1922) and `enlistVolunteer` (line 2629) add the person's id to the campaign row and record nothing. Measured in Kanorado, Kansas (a resident's Senate filing): 17 speech and 34 message records from May to September 2026 and no volunteer record.

**Fix.** Write a join record naming the speech or ask that brought the person, and a lapse record with a reason drawn from their free time, the campaign's activity and their agreement. A volunteer's hours fall on a sliding scale as their reasons weaken. The director's listener scene reads one record by id.

**Time box.** 4 hours for a Sonnet session.

**Rules.** No dice: joining and lapsing follow the person's recorded free time, agreement and traits, never a percentage. Wire to the world: the canvass, turnout and the director read the records by id. Sliding scales: a volunteer's hours fall as their reasons weaken, and nothing flips at a threshold.

**Done when.** A second session, in a buildBenchWorld place drawn from all 56 with a seed the builder did not choose, sees a filed candidate's campaign write a join record per new volunteer citing the speech or ask id, and a lapse record with a reason when a volunteer's hours reach zero. A test fails when either is absent, and the director's listener scene reads one record by id.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts

**Notes.** Found while packeting scene-listener-offers-to-work.

Released (2026-11-10): Done-when needs the director's listener scene to read a lapse record, which needs scene lines under data/english/parts (Story session only) and a lapse rule the item does not define; join record alone is buildable. Continue on branch claude/pool-campaigns-volunteer-joined-and-lapsed-records.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 00:20 UTC) on branch claude/pool-campaigns-volunteer-joined-and-lapsed-records.
