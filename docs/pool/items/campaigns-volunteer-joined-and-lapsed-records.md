---
id: campaigns-volunteer-joined-and-lapsed-records
title: "A volunteer joining or lapsing from a campaign writes a record with its reason"
area: elections
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "Helper B, Oct 27, docs/design/scenes/from-life/quiet-weeks-listener-offers.md"
lead: effects
claimed-at:
---

**What.** A person joins a campaign through askToVolunteer or enlistVolunteer, which only adds their id to the campaign row, and nothing records when or why. Nothing records a volunteer who stops coming either, so the quiet summer months have no cause to name. In a played world (Kanorado, Kansas, a resident's Senate filing) the candidate had 17 speech and 34 message records from May to September 2026 and 6 scenes among 102 schedule entries. Write a record when a volunteer joins, naming the speech or ask that brought them, and one when a volunteer lapses, naming the reason from their free time, the campaign's activity and their agreement.

**Rules.** No dice: joining and lapsing follow the person's recorded free time, agreement and traits, never a percentage. Wire to the world: the canvass, turnout and the director read the records by id. Sliding scales: a volunteer's hours fall as their reasons weaken, and nothing flips at a threshold.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a filed candidate's campaign writes a join record per new volunteer citing the speech or ask id, and a lapse record with a reason when a volunteer's hours reach zero, a test fails when either is absent, and the director's listener scene reads one by record id.

**Time box.** 4 hours.

**Files.** src/core2/modules/campaigns.ts

**Notes.** Found while packeting scene-listener-offers-to-work.
