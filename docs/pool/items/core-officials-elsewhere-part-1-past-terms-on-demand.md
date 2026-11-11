---
id: core-officials-elsewhere-part-1-past-terms-on-demand
title: "Officials elsewhere, part 1: another state's earlier terms are written when the holder is opened, not at the opening"
area: core
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-core-officials-elsewhere-built-as-full-people-at-the-opening
pr: #8390
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-11T01:02:21.813Z
---

**What.** On day one the offices engine writes, for every seat of every other state, the holder's earlier terms of the seat: about 12,700 of the 20,600 term rows in a drawn world (Hagåtña, Guam, seed oe1; Greenwood, Delaware, seed 1f0206147ad606b1). Nobody reads them until the player opens that holder's card. This part keeps the serving term with the holder's whole service on it and writes the earlier terms the first time the holder is opened, from the world's seed and the opening date, so they are the same whenever they are opened. It is the first slice of core-officials-elsewhere-built-as-full-people-at-the-opening. Seen: on the bench, a legislator of another state opened from the government screen shows a card that tells every term they served in the seat.

**Cause.** Found in code: src/core2/modules/offices.ts line 822 (seatOutsideOffices) calls pastTerms (line 900), which writes a :past:k term row for each earlier term of every outside seat at the opening, and pastTerms read the current date as the opening (line 910, const opening = api.state.date), so it could not be run later the same way.

**Fix.** Give pastTerms a withPast switch and have seatOutsideOffices write only the serving term. Add openPastTerms(api, termId), which writes an outside holder's earlier terms once (an opened table), reading the world's opening date (api.state.startedAt). Call it from openWholePast for an official id and from the official card (src/bench/card.ts officialCard). Test it in src/core2/officials-elsewhere-on-demand.test.ts.

**Time box.** 3 hours

**Rules.** Speed: the first year keeps only what play reads, and nothing is written for seats nobody opens. One model, two tiers: a holder opened later gets the terms the opening would have given them, matching the seat's record. Replace, never layer: the opening's writing of outside earlier terms is replaced, not kept beside the on-demand writer.

**Done when.** A second session runs src/core2/officials-elsewhere-on-demand.test.ts in a drawn place (named with its seed) and sees no earlier term of another state's seat on day one, opened holders' earlier terms written, and the same terms in a second world opened a month later; then on the bench opens a legislator of another state from the government screen and sees their card tell every term they served in the seat.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/modules/people.ts, src/bench/card.ts, src/core2/officials-elsewhere-on-demand.test.ts (new), src/bench/card-history-story.test.ts
