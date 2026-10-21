---
id: people-drives-counted-tier-causes
title: "Counted adults form cause drives from the same events as named ones, so a counted group holds causes"
area: people
kind: wiring
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A named adult's cause drive forms in play when they perceive an event with a role (respond and perceive in src/core2/modules/drives.ts): none exist at the opening, and after a played year about 4 percent of named adults hold one, at a mean strength near 0.8 (Garfield Heights, Ohio 112 of 2788; LaGrange, Georgia 179 of 2886; South Solon, Ohio 71 of 1996; seed cause1). Counted adults perceive no events, so no counted adult ever holds a cause and every reader of causes (candidacy, giving, groups) sees none in the counted tier. Have the events that form causes reach the counted groups they touch (a closure's counted workers, a law's counted reach) and record, per group, how many members formed a cause and how strong, by the same perception and response rule as a named person, times the count.

**Rules.** One model, two tiers: a counted group forms causes by the same rule as a full person, times its count, and a member filled in carries a consistent cause. No dice: who in a group forms one comes from the group's traits and the event, never a roll. Sliding scales and causes: the share rises with the event's reach and attention.

**Done when.** In a one-year played world built with buildBenchWorld in a drawn place (seed named), counted groups hold cause records formed from named events by record id, their share per adult is within the named adults' share by a stated spread, a counted adult filled in carries one, and the candidacy engine reads it (people-counted-causes-for-candidacy).

**Files.** src/core2/modules/drives.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Found working people-counted-causes-for-candidacy, which needs it.

Oct 21 (claude, claude/counted-causes): the mechanism and its first wiring are split into people-drives-counted-job-loss-causes. `respond` scores a counted subject from their counted record through the shared chooser's counted actor. Their drive is kept in the drives runtime until fill-in (`onFillIn` writes it), and job-lost and closure events reach their counted subjects. Left here: the other event kinds (deaths, illness, eviction, law effects), whose counted analogs happen without an event in other engines, and the share comparison. Measured for that comparison, Woonsocket RI (4480780) and Red Chute LA (2263855), drawn with seeds cc1 and cc3 (purpose "counted-causes"), one year. Per job-loss perception as subject, full people formed a drive in 13 of 18 and 5 of 14; counted people in 4 of 27 and 4 of 28. The traces differ in trait lean (prove-oneself lean 0.30 full, 0.13 counted) and perception gain (1.10 and 0.97). Full adults' perception facets are zero for 1,626 of 1,714 (the out-of-town officials generated without them), while counted adults' facets spread about ±1.1. Compare the town's own residents in both tiers before judging the share. Claim released.

Oct 21 (claude): bereavement is split into people-drives-counted-bereavement-causes (#5821), stacked on #5816. Counted evictions already reach the shared rule: an evicted counted household is filled in before the eviction event (removeCountedHousehold), so it perceives it as named people. Left for this item: counted illness (no counted serious-illness event yet), law effects (laws area) and the share comparison.
