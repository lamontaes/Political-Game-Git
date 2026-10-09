# The new core keeps current state and limits routine history

This separate prototype adds mutable ID tables, indexes, actor-specific knowledge, reusable household and job inputs, and a smooth emotion model. Content and numeric parameters live in data rows. Each provisional assumption is registered, and open stopgaps block a prototype release. The playable game does not import this folder. No prototype annual speed result is available yet.

## What is implemented

Before: the latest matched old-core busy day ran at 2.14 simulated days per minute. The weekly-retirement run removed 134,000 outsider belief and routine-result records and ran at 1.08 days per minute. These measurements do not establish annual throughput. The rates are preserved in [the baseline receipt](receipts/old-core-baseline.json).

After: the prototype foundation is implemented. The updated foundation gate passed 68 tests. The complete life loop, normal-year measurement, deep-past integration, five-year pre-run, and P9 replay receipt are still pending.

The parameter table labels source values and estimates. The time-use, emotion-duration, PANAS, and PSS references describe different populations and time scales. The estimated single mood signal and decay constants are not validated clinical measurements.

The public boundary will expose a versioned core API. The module contract defines hooks for need evaluators, available-act providers, eligibility rules, and effect handlers. New content can extend the registries. There are no player-facing screens or narration in this prototype.

The mutable writers and knowledge queries are in [state.ts](state.ts#L276). The module hooks are defined in [types.ts](types.ts#L352), and [data.ts](data.ts#L18) merges additional content rows. The emotion tests passed in the first foundation gate. The population and deep-past tests remain pending. The tripwire tooling checks markers and source code; [stopgaps.ts](stopgaps.ts) supplies the release refusal.

## Measurement still pending

Method: measurements run in the cloud workspace only. The old-core receipts and unpublished source were preserved separately. Prototype timing, memory, act counts, causal chains, emotion curves, and missing mechanics will be published with the draft as they are measured.
