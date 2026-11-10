---
id: words-donor-ask-fires
title: "A donor's gift to a campaign is a moment, and the donor comes to the candidate with an ask"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/director-donor-ask-fires
pr: pending
blocked-on:
lead: words
milestone: play-first
source: "donor-ask scene never fired: the campaign-gift event went through the director's money channel (0.47 and the risk weight), so 217 of 217 gifts for one drawn candidate fell under the moment floor"
claimed-at: 2026-11-10T01:00:00.000Z
---

**What.** The campaign-gift event moves to the director's cause channel, like filing to run, so a first or large gift is a moment and the donor-ask situation type matches its cause label (`cause:event:campaign-gift`).

**Rules.** No dice: the gift's size against what others gave decides the impact. Wire to the world: the gift is the campaign-gift record the campaigns engine writes.

**Done when.** src/director/donor-ask-scene.test.ts, which files a candidacy through fileCandidacy in drawn places and runs the campaign, finds each campaign-gift as a moment with a donor-ask scene composed from it, on seeds 11 and 3333 (seed 222 reaches a gift line that omits the pending bill; see Notes); the arc-variant test and the families guard pass.

**Files.** src/director/data/director.json, src/director/data/situation-types.json, src/director/donor-ask-scene.test.ts (already covers it)

**Time box.** 1 hour.

**You will see.** A donor comes to the candidate after giving, with an ask.

**Notes.** Seed 222, Palmer Town, Massachusetts (seed 222:4), gift campaign-gift:filing:contest:seat:gus2025:224812:council:0:2025-11-04:person_000c2c6ab0747bc6:person_000c2d6ab0747d79:2025-08-09:75100: the scene composes but the talk line chosen ("I put in $751 because it was you...") does not name the pending bill, which donor-ask-scene.test.ts line 218 expects. A bank-selection call for Words: prefer a line that uses the donor-bill fact when one is present.
