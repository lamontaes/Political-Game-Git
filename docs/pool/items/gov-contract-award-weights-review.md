---
id: gov-contract-award-weights-review
title: "Review the contract award weights (calibrated bands, not deciders)"
area: gov
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: "post-merge audit Oct 19 evening, item 7 (PR #5166)"
---

**What.** PR #5166 decides public contract awards to town businesses by four cited TUNABLE weights, each with a spread. The weights should set calibrated bands, not decide the award; the officials' reads should decide it. Confirm that the weights are calibrated bands, and replace the fixed rule with the officials' reads where it still decides.

**Rules.** No dice: bodies act from members' reasons and the calendar, not a roll. Ask why and the rest: the cited weights are only as good as the reasons they stand for.

**Done when.** A drawn-place world from buildBenchWorld, seed named in the PR body, shows an award decided by the officials' reads with the weights only setting the band. The contracts test in `src/core2/contracts.test.ts` covers it.

**Files.** src/core2/modules/contracts.ts, src/core2/data/contracts/parameters.json, src/core2/modules/legislature.ts

**Notes.** Found in the post-merge audit of Oct 19 evening. Leave PR #5166 as merged.
