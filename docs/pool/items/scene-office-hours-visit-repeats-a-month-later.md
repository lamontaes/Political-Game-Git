---
id: scene-office-hours-visit-repeats-a-month-later
title: "One office-hours visit plays again word for word a month later"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by: civic-roles-builder
pr:
after:
blocked-on:
lead: words
source: "Words readers via the Account lead, Nov 16, reading PR #9623's played files at Thompsonville"
model: sonnet
effort: medium
---

**What.** At Thompsonville, one office-hours visit plays twice, on April 20 and again on May 20. It has the same case id, office-approached:case:person_f857a91761da6fd8:2025-04-20 (Jorge Robertson), and the same four replies. A case brought once should not come back unchanged a month later. Seen: by the Words readers playing #9623.

**Cause.** Needs cause. In src/core2/modules/constituent-cases.ts the cases engine emits `office-approached:<case id>` once, when the case opens. So the repeat is probably the director staging the same event again at the next office hours. The first place to look is how the office-hours scene picks its visit, and whether it skips an event already staged.

**Fix.** None until the cause is found.

**Time box.** 1 hour, Sonnet.

**Rules.** Ask why: each staged visit answers to one office-approached record, and a record already played is not staged again. One rule, all 56 places: the fix is in the staging rule, with no town named.

**Done when.** At Thompsonville, at the seed the readers played, each office-approached event is staged at most once over the year. A second session sees no repeated visit over a played year at a drawn place, named with its seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts, src/director (office-hours staging)

**Notes.** Filed by hand by the civic roles builder, Nov 16.
