---
id: world-union-membership-record
title: "Union membership is a record on each member, by industry and state (BLS)"
area: world
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr: #5302
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: low
root: none
source: split from core-stopgap-membership-dues-assumed-data, Oct 19
claimed-at:
checked: fable 2026-11-10
---

**What.** Make union membership a record on each member, by industry and state from the Bureau of Labor Statistics, instead of only an aggregate rate. Today union dues follow the aggregate membership rates (src/core2/union-rate.ts and src/core2/membership-dues.ts) and the union law reach reads them (src/core2/law-reach/group-a-union.ts). The original body was never written, and the pull request that tried it was sent back for missing industry-level BLS acceptance. This item is held until an engine that needs a per-member record is named.

**Cause.** Needs cause. Looked at src/core2/union-rate.ts, src/core2/membership-dues.ts and src/core2/law-reach/group-a-union.ts: union dues already follow membership rates (SG-GOV-REACH-A-union-dues is open in src/core2/data/stopgaps/gov.json), and no engine is named that needs a per-member record.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted worker's membership is read by the same rule as a full person's, times their count. Research before building: membership by industry and state is SOURCED from BLS with its table and year. Replace, never layer: the aggregate rate is replaced by the record where a record is read.

**Done when.** A second session, on main in a drawn place (place and seed named), plays a year in dev mode and finds a worker in a unionized industry with a membership record by id, paying dues from it, while a worker in a non-union industry has none; the cause that made a per-member record necessary is written into this item, and a test in src/core2 names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/union-rate.ts, src/core2/membership-dues.ts, src/core2/law-reach/group-a-union.ts, src/core2/data/stopgaps/gov.json

**Notes.** PR #5302 sent back: Merge conflict with main in src/core2/data/stopgaps.json.

Sent back 2026-10-23 from PR #5302 (branch claude/union-membership-record): Missing industry-level BLS acceptance and Done-when evidence table; release impact none omits changed personal dues cash flows; finish on that branch, merge main into it first.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have recorded union membership by industry and state; the body is TODO and no screen reads it.
