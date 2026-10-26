---
id: people-counted-ties-stack
title: "Finish #4370, #4373 and #4369 as one stack (counted ties, tuition, death notices)"
area: people
kind: wiring
priority: 1
status: done
claimed-by:
pr: #4373
blocked-on:
milestone:
source: "reissue item 6; PRs #4370 pool/bench-opening-records, #4373 pool/counted-family-ties, #4369 pool/counted-death-notices"
---

**What.** Counted family ties, the bench opening's school district and tuition, and counted death notices reaching relatives. Run the tuition year (baseline then candidate) and draw places until a year fires a counted death with a known tie.

**Rules.** One model, two tiers; the chain is the acceptance; ask why.

**Done when.** Names the payer, the recipient and the reaction by record id; the tuition year before and after.

**Files.** src/core2/modules/residents.ts, family files, bench opening

**Notes.** PR #4370 and #4369 are the other two members of the stack.
