---
id: gov-redistricting-census-seats-read
title: "A state's House seats change after a census, read by the offices engine and the political map"
area: gov
kind: wiring
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
after: gov-redistricting-census-count
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:35:29.967Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Oct 20: Switched from blocked to the automatic after: gate on gov-redistricting-census-count, so it opens by itself the moment those items are done.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: merge into gov-redistricting-engine. This is an empty draft (every field TODO, released from idle draft #5076); gov-redistricting-engine holds the only written spec, and this stub becomes one of its parts.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): merged into `gov-redistricting-engine`, which carries this item's remaining work.
