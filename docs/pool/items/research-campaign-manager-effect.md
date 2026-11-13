---
id: research-campaign-manager-effect
title: "Research what a local campaign's manager changes, so the campaign engine can read its staff"
area: core
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage of Nov 10 (SG-CAMPAIGN-manager-changes-nothing-yet)
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A person close to the candidate can run the campaign and is cast as its team in scenes, but the campaign runs the same with or without them. This item finds, from fetched and quoted sources, what a local campaign's manager changes (follow-up calls, volunteer hours organized, the calendar kept) and records it as sourced parameters. Seen: in the campaign's volunteer hours and follow-up calls, which differ between the same race with a manager and without one.

**Cause.** Found in code: src/core2/modules/campaigns.ts:1980 (stopgap SG-CAMPAIGN-manager-changes-nothing-yet). `managerReason` decides who takes the post and `staffIds` is kept on the campaign row (line 156), but no decision in the engine reads `staffIds`; no number may be typed for the effect until it is researched.

**Fix.** Read local campaign guides and field-experiment studies (door-to-door and volunteer-organizing effects of a paid or volunteer coordinator), quote them, and write each effect as a parameter row tagged SOURCED or ESTIMATED with its spread in the campaign parameter table (src/core2/data/). Then wire the engine's volunteer-hours and follow-up decisions to read `staffIds` through those rows, as a sliding scale on the manager's own free hours and traits, and delete the stopgap marker and register row.

**Time box.** 4 hours for the research, 3 for the wiring, a Sonnet session each.

**Rules.** Research calibrates, it never decides an outcome (research-habit). No dice. Speed: read `staffIds` where a campaign already decides, never a new scan.

**Done when.** A second session, in a place and seed it draws, runs the same race with and without a manager and sees, by campaign record id, the volunteers' hours or the follow-up calls differ by the sourced size, and the sources are quoted in the item's Notes.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/stopgaps/campaign.json
