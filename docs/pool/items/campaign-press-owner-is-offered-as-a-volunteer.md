---
id: campaign-press-owner-is-offered-as-a-volunteer
title: "An outlet's owner weighs working for a campaign the outlet covers"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: campaign events report 1, Nov 14 2026
checked:
---

**What.** The people who weigh helping a campaign include the owner of the town's newspaper or the head of its outlet, so a press owner can be staffed as the campaign's helper while their own outlet covers the race. That is a conflict a reader of the paper would notice. Seen: the player is asked whether to take on, or hears thanks from, the person who owns the paper that reports on the race.

**Cause.** Found in code: `offersToHelp` in src/core2/modules/campaigns.ts builds its list of people who might help from the household and `candidate.knownIds`, and leaves out only people under the minimum age, people who have not heard, and a rival's own filing (`rivalFiling`); nothing leaves out a person who owns or runs an outlet in the press module (`ownerId` on the outlet row, src/core2/modules/press.ts).

**Fix.** Leave out any person who owns, heads or reports for an outlet that covers the race's town, the way a rival filer is left out, read from the press module's outlet rows. No new store, and the filter is one clause beside `rivalFiling`.

**Time box.** 2 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: the filter reads the press module's own outlet rows when offers are weighed. No dice: nobody is dropped by a roll. Review: words.

**Done when.** A second session plays a campaign in a drawn place with the seed named and sees that no `volunteer-offered` record names a person who owns or heads a covering outlet, with the outlet's record id and the offer records listed side by side.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/press.ts

**Notes.** Words lead ruling, held/campaign-events.md: a press owner is not offered as a volunteer. Evidence: /mnt/project-files/words-lead/campaign-events/report-1.md.
