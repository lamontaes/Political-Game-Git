---
id: tests-government-scenes-no-allowed-policy
title: "The government-scenes test dereferences a missing allowed policy in a drawn place"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The government-scenes test selects a body with full members and then assumes its bill catalog contains an allowed policy question. In Black Sands, Hawaii, the selected body has none, so policy.id throws before any floor vote or executive scene is checked. The exact fresh seed fails identically on clean main and PR #5923; the existing bounded redraw cannot handle this missing subject.

**Rules.** One rule, all 56 places: subject selection must handle a generated body with no allowed question. Never weaken a test: preserve required positive floor-vote and executive-scene witnesses, valid actor and role bindings, and bounded draws; do not insert authority or fake scene events.

**Done when.** The government-scenes test completes on GOLDEN_PATH_SEED=319d8189f5b49a57542adaf502d2373781ad2d16 and an additional independent drawn seed, naming their places and checked floor/executive record IDs; a body without an allowed catalog question is handled explicitly without dropping either positive witness or inventing authority.

**Files.** src/director/government-scenes.test.ts, src/core2/bill-catalog.ts, src/core2/policy-authority.ts

**Notes.** Merger 3 during #5923: branch afe7bb5d59 and clean main b5b2c6b995 both throw Cannot read properties of undefined (reading id) at policy.id before scene checks. First draw is Black Sands, Hawaii (1502832), root319d8189f5b49a57542adaf502d2373781ad2d16:0, place seed1dbcd75523e21cf37fb98aa3dfdd6de09c1cae6b1890e8e8b1bcfe369109a2b4.

Merger 2, 2026-10-25: independently reproduced while gating #4626 at dca644d5e3 and on clean main 8db0350da1, root 11b6c4b9f69cfa7676303361923c0836e06a4c33, Lowes, Kentucky (2148234), draw :1, place seed ba17de83e80d19c12cbb9d05e7a98d3a617c1f44053d38a8923a4c2fdc67f01c: policy.id throws before bill drafting on both. Bayfield draw :0 checks its floor vote first. A separate Monticello, Arkansas run at b02a226dc11d52be90d8fafc8bf8c1e4a6dfbce6 passes the PR government-scenes case, four floor witnesses and a signing.
