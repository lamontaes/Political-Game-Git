---
id: executive-governor-list-sitting-officials-gap
title: "A governor can offer a cabinet post to a sitting official, who weighs resigning the office they hold"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
root: none
claimed-by:
pr:
after: executive-governor-pick-offers-the-state
blocked-on:
lead: governing
source: "Civic roles builder, Nov 15, building executive-governor-pick-offers-the-state (Account lead's ruling: a gap, not a rule)"
model: sonnet
effort: medium
---

**What.** The governor's list for an open cabinet post leaves out everyone who holds an office or an appointment, because the list once offered out-of-state officials such as a sitting U.S. Senator. In life a governor can name a sitting official, such as a state legislator or a county officer, who then resigns the office they hold, so leaving them out is a gap and not a rule. The state's election chief is still offered, because that post is not kept as an official's row. Seen: the people the office panel offers for an open state post.

**Cause.** Found in code: `stateNominationInput` in src/core2/modules/executive.ts (line 1416) keeps only people for whom `officialOf(api, id)?.ended !== null` and who hold no appointment, so a serving official is never offered.

**Fix.** Offer the state's own sitting officials, and have postStanding in src/core2/modules/serve-asks.ts weigh the office they would leave the way it weighs the job they would leave. A yes then ends their term through the vacancy engine that already handles a resignation.

**Time box.** 3 hours for one session.

**Rules.** No dice: the official weighs the office they hold by their own record. One rule, all 56 places.

**Done when.** A second session, as governor in a drawn place (named, with its seed), sees a sitting state official offered for an open post, and on a yes sees their old seat fall vacant.

**Waits on.** executive-governor-pick-offers-the-state.

**Files.** src/core2/modules/executive.ts, src/core2/modules/serve-asks.ts

**Notes.** Filed by hand by the civic roles builder.
