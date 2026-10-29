---
id: elections-door-contacts-cool-most-voters
title: "Knocking on doors cools most of the voters it reaches"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/door-contacts-warmth
pr: #6211
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T03:40:53.749Z
---

**What.** On the bench a month of knocking on doors for a council seat in Louisville, Colorado (seed 930cd8a0-ae3d-4451-aab2-4fc6bb898c08) left 852 of the 961 voters reached cooler toward the candidate and only 50 warmer. In Charles City, Virginia (seed 8a673426-e531-4680-a7c2-4f24524544a9) 13 of 15 cooled. Field experiments find canvassing persuasion near zero on average, not strongly negative, so a door that mostly turns voters away looks like the campaign engine's warmth balance rather than the voters' traits.

**Rules.** No dice: the voter's traits, agreement with the platform and the meeting decide warmth. Research calibrates totals (rapportWeight cites Kalla and Broockman 2018). One rule, all 56 places.

**Done when.** In three drawn places, a month of door knocking by a resident whose platform matches the town's median voter leaves no more voters cooler than warmer beyond the spread the cited research allows, named by place, seed and the cause records read. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/modules/campaigns.ts (door contact warmth), src/core2/data/campaigns/parameters.json (rapportWeight and related).

**Notes.** Found by the m0-m2 lead on play-stop-18 (race line in words), whose screen now shows these counts.
