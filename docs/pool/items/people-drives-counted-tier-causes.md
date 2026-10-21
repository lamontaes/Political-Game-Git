---
id: people-drives-counted-tier-causes
title: "Counted adults form cause drives from the same events as named ones, so a counted group holds causes"
area: people
kind: wiring
priority: 2
size: L
status: claimed
claimed-by: claude/counted-causes
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T15:13:40.818Z
---

**What.** A named adult's cause drive forms in play when they perceive an event with a role (respond and perceive in src/core2/modules/drives.ts): none exist at the opening, and after a played year about 4 percent of named adults hold one, at a mean strength near 0.8 (Garfield Heights, Ohio 112 of 2788; LaGrange, Georgia 179 of 2886; South Solon, Ohio 71 of 1996; seed cause1). Counted adults perceive no events, so no counted adult ever holds a cause and every reader of causes (candidacy, giving, groups) sees none in the counted tier. Have the events that form causes reach the counted groups they touch (a closure's counted workers, a law's counted reach) and record, per group, how many members formed a cause and how strong, by the same perception and response rule as a named person, times the count.

**Rules.** One model, two tiers: a counted group forms causes by the same rule as a full person, times its count, and a member filled in carries a consistent cause. No dice: who in a group forms one comes from the group's traits and the event, never a roll. Sliding scales and causes: the share rises with the event's reach and attention.

**Done when.** In a one-year played world built with buildBenchWorld in a drawn place (seed named), counted groups hold cause records formed from named events by record id, their share per adult is within the named adults' share by a stated spread, a counted adult filled in carries one, and the candidacy engine reads it (people-counted-causes-for-candidacy).

**Files.** src/core2/modules/drives.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Found working people-counted-causes-for-candidacy, which needs it.
