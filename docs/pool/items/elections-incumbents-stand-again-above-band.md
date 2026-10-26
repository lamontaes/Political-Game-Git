---
id: elections-incumbents-stand-again-above-band
title: "Candidacy test fails on main in Heimdal, North Dakota: 95.5% of incumbents stand again, above the test's 95% ceiling"
area: elections
lead: traits
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6167
blocked-on:
source: laws lead, Oct 26
claimed-at:
---

**What.** `src/core2/candidacy.test.ts` (golden-path spec M2-04, accepted) fails on clean main at 050736344b with `GOLDEN_PATH_SEED=5d0f088701175cfc5d1b1671a35cd38cf6d72a4e3106e538c56d05443e5d6563 GOLDEN_PATH_PLACE_KEY=3837020` (Heimdal, North Dakota): "has most incumbents run again, as about 81% really do: expected 0.955 to be less than 0.95". CI's golden-path check drew that place for PR #5986's merge head (run 40266274366), so any PR whose commit draws it goes red. The incumbent's decision is the stand-again rule merged from `claude/traits-stand-again` (205ed71e9e, 9ffe21aff0). Whether the rule runs high in small towns, or the test's band is too narrow for a town with few seats, is not traced.

**Rules.** No dice: an incumbent's decision comes from their age, temperament, record and circumstances. Real rates check totals; they never pick one person. One rule, all 56 places.

**Done when.** `src/core2/candidacy.test.ts` passes on the seed and place above and on two fresh random places named in the PR body, and the PR says whether the rule or the band changed, with the share of incumbents standing again in each place.

**Files.** src/core2/candidacy.test.ts, src/core2/stand-again.ts

**Notes.** Laws lead, Oct 26: found on PR #5986's CI; reproduced on clean main.

**Second place (laws lead, Oct 26).** CI's golden-path on PR #6056 (run 40275434669) drew Kearney Park, Mississippi: `GOLDEN_PATH_SEED=c78f5c94d92339801d4918d41018b2641c169790424d8f1b34040857de487dd6 GOLDEN_PATH_PLACE_KEY=2837190` fails the same check on clean main at 94c1cb0182, "expected 0.985 to be less than 0.95".
Sent back 2026-10-26 from PR #6167 (branch claude/traits-stand-again): merge of main conflicts in src/core2/candidacy.test.ts; finish on that branch, merge main into it first.
Sent back 2026-10-26 from PR #6167 (branch claude/incumbents-stand-again-band): conflict with main in src/core2/candidacy.test.ts; finish on that branch, merge main into it first.
