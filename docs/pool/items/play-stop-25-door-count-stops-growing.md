---
id: play-stop-25-door-count-stops-growing
title: "Knock on doors stops adding to the campaign's door count after September 2025"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release I pressed Knock on doors every week from February 2025 to October 2026. Each time the status said "KNOCK ON DOORS · 36 DOORS · 6 REACHED", but Politics → Campaigns stayed at "1080 doors" and "Doors 172 · +105 · −67" from September 2, 2025 until election day, 14 months later. Late in the campaign Knock on doors and Ask for an interview were grayed with no reason. I expected the count to grow each week or the screen to say why my knocking no longer counted.

**Rules.** Wire to the world: each canvass reaches named voters and the campaign record counts them. Ask why: a grayed action and a stalled count each say their reason.

**Done when.** The owner does the same steps on the next build and is not stopped: campaigning weekly for a year after filing, the door count and reached count grow with each Knock on doors, and a grayed campaign action shows why. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/campaign.ts, src/core2/modules/world.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:12, 16:28; screenshots 61, 68.
