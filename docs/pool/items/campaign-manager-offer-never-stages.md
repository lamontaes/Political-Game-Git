---
id: campaign-manager-offer-never-stages
title: "Someone close offers to run the campaign and the player is never asked"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9158
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: campaign events report 1, Nov 14 2026
checked:
---

**What.** In six played campaigns the `manager-offer` scene never staged. In two of them (Stony Creek VA seed `q4`, Patrick AFB FL seed `q3`) the campaigns engine wrote one `volunteer-offered` record with `role: manager` and put that person on the campaign's staff, and election night then calls them "your campaign manager". The player was never asked. Seen: on the day someone close offers to run the campaign, the player is stopped by the offer.

**Cause.** Found in code: `offersToHelp` in src/core2/modules/campaigns.ts (line 2257) weighs the player's household first, nearest first, and the first yes becomes the manager; the `manager-offer` situation type carries `receive.counterpart: "apart"`, and `receives()` in src/director/scheduling.ts (line 130) refuses a scene whose asker lives in the person's own household. So a household member who offers is staffed and no scene is staged. Confirmed Nov 14: in Stony Creek VA (seed q4) the manager, person_16c41af51ea0c69a, lives in the player's household and is family; the offer's schedule entry was `journal-line` with no binding. Changing the type to `counterpart: any` alone then staged `manager-offer` at home as `scene-now`. County q3 not re-run (same code path).

**Fix.** A household member's offer to run the campaign is told the way the filing tells the household's stake: a manager-offer scene at home with the asker already in the room, not an `apart` caller; the type's receive rule is `any` for the manager type (one row of data), and the cast reads the household's tie. If the manager is not a household member in either run, name the true cause in Notes and fix that instead.

**Time box.** 3 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: the offer's yes keeps the helper on staff and a refusal removes them (`answerOffer`), which the shift engine and election night read. No dice. Review: words.

**Done when.** A second session plays a campaign in a drawn place with the seed named and sees the manager-offer scene stop the day with the person who is later named manager on election night, record ids named.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts, src/core2/modules/campaigns.ts

**Notes.** Pinned test src/director/campaign-manager-household.test.ts (fails before, passes after). The campaign-events script's census still lists manager-offer as never staged after the fix, though the book shows it staged: the script's scan misses it (not chased; belongs to the campaign-events thread). Evidence: /mnt/project-files/words-lead/campaign-events/report-1.md.
