---
id: research-lives-origin-town-shares
title: Draw a household's origin from the town's own shares, and a child's from both parents
area: core
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
branch:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: medium
root: design-one-model-two-tiers
milestone: M7
source: stand-in triage Nov 10; stopgap SG-LIVES-origin-state-shares
---

**What.** A household's origin (white, Hispanic, Black, Asian, other) is drawn from the state's adult shares, not the town's, and everyone in a household shares one origin. Load ACS B03002 shares for the town's place (and county for relatives) and the joint table for mixed couples, so a town that differs from its state looks like itself and a child's origin comes from both parents. Seen: in where a new household's people say they came from when the player talks with them.

**Cause.** Found in code: src/core2/opening-origin.ts, originShares (line 64, stopgapId SG-LIVES-origin-state-shares) reads CPS state shares, and withOrigins gives each household one draw.

**Fix.** Fetch ACS B03002 for places and counties (the repository holds only table shells, no B03002 values), store the shares under data/source with the usual lineage, read them in originShares by the town's place with the state's as fallback, and draw a child's origin from the parents' records at birth. Estimated tag with source and spread. Clear the register row.

**Time box.** 5 hours for one Sonnet session.

**Rules.** One rule, all 56 places: no place named in logic; shares live in data. Estimate, never UNKNOWN. Research before building: shares check totals and never decide one person's outcome.

**Done when.** A second session, in a drawn place and seed it did not choose, builds the world and sees the origin mix of the town's households within the sourced spread of the town's own B03002 shares, a mixed couple's child with an origin from both parents by record id, and the opening-origin test passing.

**Waits on.** Nothing.

**Files.** src/core2/opening-origin.ts, src/core2/opening-origin.test.ts, src/core2/data/stopgaps/lives.json
