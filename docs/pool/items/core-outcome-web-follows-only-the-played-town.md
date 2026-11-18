---
id: core-outcome-web-follows-only-the-played-town
title: "A state or federal candidate can never lean on what their term did, because the outcome web keeps rows only for the played town"
area: core
kind: bug
priority: 1
size: L
status: merged
claimed-by: account lead thread "Give rivals more than one issue"
pr: 9342
blocked-on:
after: campaigns-lean-toward-the-area-the-term-hurt
source: account lead thread "Give rivals more than one issue", Nov 14 (the campaign tilt probe, #9303; owner Nov 14 19:27Z: "it's all one simulation")
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** State and federal races read nothing from the term map, because the outcome web writes monthly rows only for the played town's place. Seen: seed t2 (speed:year), 46 of 63 campaign openings by January 2027 were state races (US-ND) and every one read an empty record; the states' jurisdiction read in `jurisdictionTermRead` is a mean over web places in the state, and no other place is in the web. Seen: a state or federal candidate's campaign shares never move with their term.

**Cause.** Found in code: `termReadPlaces` in src/core2/term-read.ts lists the places the web has rows for, which is the played town alone; `jurisdictionTermRead` for a `US-XX` or `US` jurisdiction filters that list by state and finds none.

**Fix.** Give each state and the country a coarse outcome-web row from the state and national engines already kept (budgets, macro, national opinion) on the same monthly cadence, as counts, so `jurisdictionTermRead` reads a state or the nation from its own record; the read stays one reader and the campaigns and addresses need no change. The coarse tier is the one-model rule: a counted group reads with the same measures as a full town.

**Time box.** 6 hours for an Opus session.

**Rules.** One model, two tiers: a counted state or the country is read with the same measures as the played town, times its count. Replace, never layer: the one term read serves every level and no per-level reader is added.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed), a state legislature or governor race whose campaign read is non-empty, with a slide on pay or prices that traces to the state's own rows by record id, and the governor's address opening on it.

**Waits on.** campaigns-lean-toward-the-area-the-term-hurt (#9303).

**Files.** src/core2/term-read.ts, src/core2/modules/outcome-web.ts, src/core2/modules/macro.ts, src/core2/modules/campaigns.ts

**Notes.** Filed Nov 14 by hand.
