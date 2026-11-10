---
id: world-business-founding-no-purchase-kinds
title: "A professional-services business founded in a played world stops the game: No purchase kinds to enter (residents.enterResidentMarket)"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: jobs
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** A professional-services business founded on 2026-04-01 by person_84379c678df01275 stopped a 600-day played world with 'No purchase kinds to enter for organization:founded:professional:person_84379c678df01275:2026-04-01 (give financeKinds or a rival)', thrown by enterResidentMarket from business.found. The founding gives the new firm no purchase kinds and no rival to copy. Find which sector row has no financeKinds and give it the kinds its customers buy, or have the founding refuse a firm no one would buy from.

**Cause.** Found in code: enterResidentMarket in src/core2/modules/residents.ts (line 2499) throws when entry.financeKinds is missing and the `like` rival has no live purchase flows in the place; the founding in src/core2/modules/business.ts (the api.enterMarket call near line 2148) passes only `like`, never financeKinds.

**Fix.** Have the founding pass the sector's purchase kinds as financeKinds when no rival with live purchase flows exists (or refuse a firm no one would buy from), and add a test for a professional-services founding.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a firm that sells to residents sells a kind of good the residents engine records, from the sector's own row. Estimate, never UNKNOWN: a missing kind is filled from the sector's real purchase kinds, not skipped. One rule, all 56 places: the check draws its place and names it with the seed.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place, seed named in the PR body) and sees a professional-services founding enter the resident market with at least one purchase kind, named by organization record id; the candidacy calibration run that found it (CALIBRATION_RUN=1 with the stay-out pull at 3.8, seeds c1 to c6) reaches its count without this error; a test beside src/core2/business.test.ts covers it. On screen: nothing yet; it would show on Jobs and study, and News, and nothing there reads it.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/modules/residents.ts, src/core2/business.test.ts

**Notes.** TODO Released from idle draft #5217 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-udtiwn` (2026-10-20). Cleared from the front matter and kept here.
