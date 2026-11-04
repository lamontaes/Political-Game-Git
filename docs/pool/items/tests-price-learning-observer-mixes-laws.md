---
id: tests-price-learning-observer-mixes-laws
title: "Price-learning controls compare unrelated real laws with their transit fixture"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The unchanged place-prices-learned test captures every price-learning event but compares each one with its fare-free-transit fixture. In Williamsburg, Virginia, an ordinary clean-electricity law produces a legitimate learned event on February 3. All three cases then fail on that event: its law ID, hearing record and date are checked against the unrelated fixture. The same failures occur with the original production source, so this is not introduced by the adopted-income-tax reader.

**Rules.** Keep every existing acceptance assertion and all legitimate learned-law events. Do not suppress starting-law news, choose a friendlier seed, narrow away failed cases or call this a passed control. Resolve the observer evidence mismatch with its owner under the no-test-loosening rule.

**Done when.** The existing full file passes on Williamsburg replay bc8a0987576fa6c8a36db1564f7fec5f with the underlying clean-electricity and transit learned events both retained and their actual source records traced. Any test change must preserve coverage for before-payment, after-payment, remembered hearing and unreceived stories, and explicitly explain why it is not a weakened assertion.

**Files.** src/core2/place-prices-learned.test.ts; src/core2/modules/place-prices.ts (read-only unless a production defect is established)

**Notes.** Found during Lane 2 laws-adopted-income-tax-learning on branch lane-2/tax-learning at 9120bb778e. Williamsburg key 5186160, world seed 0b78c1619cc76f06cec8d961f71113190a9b7d0d6f2f8b03458f96bde27a5c13. Event event:law.effect-learned:2025-02-03:person_83d3d0b011b9d2ec:law:US-VA:state:us-policy-positions:environment-energy.clean-electricity-standard:general:starting. Corrected runtime: all three cases fail, 172.05s; original runtime: all three fail, 168.48s. Logs /tmp/lane-2-tax-reader-controls/01.log and /tmp/lane-2-tax-price-control-original.log. Searched pool for place-prices-learned, learned fixture and price learning; existing laws-cost-learned-on-hearing-day is done and describes a different production bug. No test edited. Needs Lane 5 routing/metadata. Tax natural Meadow Lakes chain and typecheck pass, but the ten-control queue stopped at this first draw; tax item returned open with its branch preserved.
