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
after:
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
lead: lives
checked: fable 2026-11-10
---

**What.** A named adult's cause drive forms in play when they perceive an event with a role, but counted adults perceived no events, so no counted adult held a cause. Most of the work was split off and is done (job loss, illness, bereavement, speech and shared causes). What is left is law-effect causes reaching counted groups and the share check. With the children done, re-measure the counted share and close the remaining gap, so every reader of causes (candidacy, giving, groups) sees causes in the counted tier. Feeds: people-counted-causes-for-candidacy.

**Cause.** Measured: Port Wentworth, Georgia (1362328), seed sh2, one year: named adults 215 of 547 hold a cause, counted 11 of 7,265 (the item, before the speech and shared-causes child landed).

**Fix.** Re-measure the counted share now that the children are done, then make law effects reach counted groups as perceived events by the shared rule and close the gap.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group forms causes by the same rule as a full person, times its count, and a member filled in carries a consistent cause. No dice: who in a group forms one comes from the group's traits and the event, never a roll. Sliding scales and causes: the share rises with the event's reach and attention.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in Port Wentworth, Georgia (seed sh2) and one more drawn place named with its seed, and sees counted groups hold cause records formed from named events including a law's effect, by record id, with the counted share per adult reported beside the named adults' share, a counted adult filled in carrying one, and the candidacy engine reading it.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Found working people-counted-causes-for-candidacy, which needs it.

Oct 21 (claude, claude/counted-causes): the mechanism and its first wiring are split into people-drives-counted-job-loss-causes. `respond` scores a counted subject from their counted record through the shared chooser's counted actor. Their drive is kept in the drives runtime until fill-in (`onFillIn` writes it), and job-lost and closure events reach their counted subjects. Left here: the other event kinds (deaths, illness, eviction, law effects), whose counted analogs happen without an event in other engines, and the share comparison. Measured for that comparison, Woonsocket RI (4480780) and Red Chute LA (2263855), drawn with seeds cc1 and cc3 (purpose "counted-causes"), one year. Per job-loss perception as subject, full people formed a drive in 13 of 18 and 5 of 14; counted people in 4 of 27 and 4 of 28. The traces differ in trait lean (prove-oneself lean 0.30 full, 0.13 counted) and perception gain (1.10 and 0.97). Full adults' perception facets are zero for 1,626 of 1,714 (the out-of-town officials generated without them), while counted adults' facets spread about ±1.1. Compare the town's own residents in both tiers before judging the share. Claim released.

Oct 21 (claude): bereavement is split into people-drives-counted-bereavement-causes (#5821), stacked on #5816. Counted evictions already reach the shared rule: an evicted counted household is filled in before the eviction event (removeCountedHousehold), so it perceives it as named people. Left for this item: counted illness (no counted serious-illness event yet), law effects (laws area) and the share comparison.

Oct 21 (claude): counted illness is split into people-drives-counted-illness-causes (#5824), stacked on #5821. The share comparison, measured with all three on: Port Wentworth, Georgia (1362328), drawn with seed sh2, one year, town adults only: named 215 of 547 hold a cause (39 percent), counted 11 of 7,265 (0.15 percent); Merizo, Guam (sh1): named 7 of 80, counted 0 of 1,101. The named share comes almost entirely from speech.heard (11,142 formations) and cause.shared (963), not from the direct events (job-lost 10, illness 4, death 4, eviction 11), and neither reaches a counted adult. That gap is filed as people-drives-counted-speech-and-shared-causes; this item's share check follows it. Law effects remain for the laws area.
