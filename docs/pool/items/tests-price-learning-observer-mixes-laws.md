---
id: tests-price-learning-observer-mixes-laws
title: "Price-learning controls compare unrelated real laws with their transit fixture"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-tests-price-learning-observer-mixes-laws
pr: #8421
blocked-on:
lead: laws-effects
source: added with npm run pool -- add
claimed-at: 2026-11-11T01:06:28.177Z
after:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
branch: claude/pool-tests-price-learning-observer-mixes-laws
---

**What.** The unchanged place-prices-learned test captures every price-learning event but compares each one with its fare-free-transit fixture. In Williamsburg, Virginia, an ordinary clean-electricity law produces a legitimate learned event on February 3. All three cases then fail on that event: its law ID, hearing record and date are checked against the unrelated fixture. The same failures occur with the original production source, so this is not introduced by the adopted-income-tax reader. Guards: a neighbor learns of a price law the player passed (clean electricity, fare-free transit) in conversation.

**Cause.** Found in code: the observer in src/core2/place-prices-learned.test.ts compares every captured learned event with the fare-free-transit fixture, so the clean-electricity event (event:law.effect-learned:2025-02-03:person_83d3d0b011b9d2ec:law:US-VA:state:us-policy-positions:environment-energy.clean-electricity-standard:general:starting) fails all three cases. Williamsburg, Virginia, key 5186160, world seed 0b78c1619cc76f06cec8d961f71113190a9b7d0d6f2f8b03458f96bde27a5c13.

**Fix.** Filter each case's observed events to its own law id, keep the before-payment, after-payment, remembered-hearing and unreceived-story assertions, and show the clean-electricity event is retained and traced to its source records. Change src/core2/modules/place-prices.ts only if a production defect is established.

**Time box.** 3 hours.

**Rules.** Ask why: each learned event must be checked against its actual law, payer and heard-story records. Keep every existing acceptance assertion and all legitimate learned-law events. Do not suppress starting-law news, choose a friendlier seed, narrow away failed cases or call this a passed control.

**Done when.** A second session runs src/core2/place-prices-learned.test.ts on the Williamsburg, Virginia replay bc8a0987576fa6c8a36db1564f7fec5f and sees the full file pass with both the clean-electricity and the transit learned events retained and their source records traced. Any test change preserves coverage for before-payment, after-payment, remembered hearing and unreceived stories, and the PR explains why it is not a weakened assertion.

**Waits on.** Nothing.

**Files.** src/core2/place-prices-learned.test.ts, src/core2/modules/place-prices.ts

**Notes.** Found during Lane 2 laws-adopted-income-tax-learning on branch lane-2/tax-learning at 9120bb778e. Williamsburg key 5186160, world seed 0b78c1619cc76f06cec8d961f71113190a9b7d0d6f2f8b03458f96bde27a5c13. Event event:law.effect-learned:2025-02-03:person_83d3d0b011b9d2ec:law:US-VA:state:us-policy-positions:environment-energy.clean-electricity-standard:general:starting. Corrected runtime: all three cases fail, 172.05s; original runtime: all three fail, 168.48s. Logs /tmp/lane-2-tax-reader-controls/01.log and /tmp/lane-2-tax-price-control-original.log. Searched pool for place-prices-learned, learned fixture and price learning; existing laws-cost-learned-on-hearing-day is done and describes a different production bug. No test edited. Needs Lane 5 routing/metadata. Tax natural Meadow Lakes chain and typecheck pass, but the ten-control queue stopped at this first draw; tax item returned open with its branch preserved.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:06 UTC) on branch claude/pool-tests-price-learning-observer-mixes-laws.
