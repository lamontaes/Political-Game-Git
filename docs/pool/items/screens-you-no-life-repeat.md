---
id: screens-you-no-life-repeat
title: "The You screen drops the My life section that repeats its Your life tab"
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #10341
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
merged-at: 2026-11-24T06:45:37.996Z
---

**What.** The owner Nov 23 playtest, caught by the CTO (C15): My life repeats the Your life tab word for word. The You screen set out the life history as a My life section beside the Your life tab that tells the same lines.
Seen: You at 1440 by 900. Seen: You, with no My life section, after. Guards: you-no-repeat.browser.mjs

**Cause.** Measured: `node src/bench/you-no-repeat.browser.mjs (new)` against `npm run bench` on main 2b7b3b28 fails "You has a heading "My life"" on two drawn places. who() in src/bench/play.mjs adds a stripSection headed labels.myLife from known.history, while its own comment says the approved mock draws no life section.

**Fix.** Delete the My life section from who() and the unused myLife label from controls.json; add you-no-repeat.browser.mjs. The second half of C15 (Jobs and school tab brighter at rest) did not reproduce: on three drawn lives all three tabs share one color at rest.

**Time box.** 1 hours

**Rules.** Screen to mock: the approved You mock draws no life section beside its Your life tab. Replace, never layer: the section and its label are deleted in the same change. No hand-written player text: no label is added.

**Done when.** A second session, in a drawn place and seed it names, opens You and sees no My life section while the Your life tab still tells the life; you-no-repeat.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/data/controls.json,src/bench/you-no-repeat.browser.mjs (new)
