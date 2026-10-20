---
id: world-fill-in-arrears-from-household
title: "A filled-in household carries arrears or not from its own income, costs and traits (ruling Oct 19); resolve SG-WORLD-housing-fill-in-arrears"
area: world
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/political-game-pool-yucp92-bh
pr: #5699
after:
blocked-on:
source: "owner ruling Oct 19 (a counted household's arrears when filled in); audit Oct 19, Part A 'What it fakes' 4"
claimed-at: 2026-10-20T13:38:49.170Z
---

**What.** When a counted household with an open eviction case is filled in, `src/core2/modules/housing.ts` carries the case and lets the lease take up the arrears the group ran up from the notice date, under an owner-decision stopgap. The owner ruled on Oct 19: "it depends on the people; it can be yes or no." The household carries back rent or not from its own record: its income against its housing cost over the months it was counted, the place's conditions, and its traits once filled in; no fixed share carries and no fixed share is cured. Build the read and resolve `SG-WORLD-housing-fill-in-arrears`.

**Rules.** One model, two tiers: the filled-in household is the same household with the same debt, read from the months it was counted. No dice: whether arrears carry comes from income, cost and traits on a sliding scale, never a fixed share.

**Done when.** A played year in a drawn place (`buildBenchWorld`) fills in two households with open cases and shows one carrying arrears and one not, each by record id with the income, cost and traits it read; the stopgap row is resolved and the housing tests run the case in a drawn place. The owner plays it: a family behind on rent is still behind when he meets them.

**Files.** src/core2/modules/housing.ts, src/core2/data/stopgaps.json, src/core2/housing-foreclosure.ts

**Notes.** From the Oct 19 rulings on cto/rulings-2026-10-19.

Sent back 2026-10-20 from PR #5142 (branch claude/fill-in-arrears): an owner attribution and date note ('the owner's Oct 19 ruling') in the stopgap resolution; finish on that branch, merge main into it first.
