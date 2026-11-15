---
id: campaign-outside-seller-missing-in-town-without-firms
title: "A campaign that buys postage in a town with no firm and no outside flow throws because no outside market account exists"
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
source: "the Account lead, Nov 15: golden-path M2-07 red on the clean Train 892427ec at Dry Valley, Nevada"
lead: elections
model: sonnet
effort: medium
root: none
---

**What.** `src/core2/voting.test.ts` (golden path M2-07) fails with "No outside market account: a campaign has nowhere to buy what the town does not sell" when the runner draws Dry Valley, Nevada. The run is the one test of an election's votes and winner, and it stops on the first purchase a campaign makes. A campaign in a small place that has no business and no outside buyers has no seller for its postage, so a played race there would stop the same way. Seen: M2-07 at Dry Valley, Nevada (key 3219800, seed f4efffd44f9cfb94031a90c531549783c1eda7399c6c0236a21d545e99d9e04c), red on the clean Train 892427ec and on #9529's head.

**Cause.** Found in code: `outsideSeller` in `src/core2/modules/campaigns.ts` (line 1955) throws when `townOutsideOf` finds no outside-flow account in the town, and the only makers of that account, `outsideMarketAccount` called at `src/core2/residents.ts` line 691 and `src/core2/opening-outside-market.ts` line 123, run only for a place that has a resident outside flow or a firm. The test's world is `createLifeCore(buildPopulation(...))` at a place with neither, so it holds no account; the throw came in with f70797747e ("Campaign polls, mail and halls are bought from recorded sellers").

**Fix.** Make `outsideSeller` in `src/core2/modules/campaigns.ts` read the account the one maker `outsideMarketAccount` provides, and have the opening create that account for every place, so a postage purchase always has a recorded seller; no new account kind and no second maker. Add the opening stock to `src/core2/data/opening/day-zero.json` as the day-one rule asks.

**Time box.** 3 hours for a Sonnet session. When it runs out, write what was read in this item and stop.

**Rules.** Day one is in motion: a place with no firm still buys postage from the outside, so the account exists from the first day. One rule, all 56 places: nothing names Dry Valley or Nevada.

**Done when.** In a drawn place and seed the builder did not choose, a second session runs `src/core2/voting.test.ts` at Dry Valley, Nevada (3219800, seed f4efffd4…) and at two places with no firm and sees it pass, and sees a campaign's postage paid to the outside account by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/opening-outside-market.ts, src/core2/residents.ts, src/core2/data/opening/day-zero.json, src/core2/voting.test.ts
