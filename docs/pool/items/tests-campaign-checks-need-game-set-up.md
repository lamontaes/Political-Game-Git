---
id: tests-campaign-checks-need-game-set-up
title: "ad-buy, plain-text and volunteer-shift browser checks need their precondition set up through the game's own code"
area: play
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Three campaign browser checks do not pass on a fresh bench. ad-buy stalls on its own 'leave the card and come back' step because openCampaignTrail (src/bench/campaign-trail.mjs) does not bring the Travel list back. plain-text needs a filing seat (same cause as tests-plain-text-no-travel-filing-place). volunteer-shift needs a willing volunteer. There is no dev route that sets up money, a filing seat or a willing volunteer through the game's own code, so each check depends on what the drawn player happens to have (the drawn ad-buy player had $0).

**Rules.** Never change an assertion or loosen a check. Set the precondition through the game's own code or engines (donor calls, filing, a volunteer's trait), not a hand-written fact. One rule, all 56 places.

**Done when.** ad-buy, plain-text and volunteer-shift pass in three drawn places named with seeds; the PR names the dev route or helper that sets up money, a filing seat and a willing volunteer. Merge or close tests-plain-text-no-travel-filing-place with it.

**Files.** src/bench/ad-buy.browser.mjs,src/bench/plain-text.browser.mjs,src/bench/volunteer-shift.browser.mjs,src/bench/campaign-trail.mjs,src/bench/trail-act.mjs

**Notes.** Fixer 2, Nov 8: found while finishing the screens. See also tests-plain-text-no-travel-filing-place. Dev mode needs a route for money, a filing seat and a volunteer's willingness.
