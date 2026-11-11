---
id: core-opening-public-buyers-sourced-reads
title: "Opening public custodial buyers read the 2021 county listing and their state's government-type shares"
area: core
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: m0-m2
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-opening-public-buyers-sourced-reads
---

**What.** The opening's public custodial budgets still use one national buyer coverage (0.80) and carry each county's identity forward from the 2017 listing. Make the opening read, for each place, which kinds of general-purpose government are its recorded buyers, and give each the state's own share of local public-building spending from data/research/core/census-2022-local-public-buildings-by-government-type.json (the county share where only the county buys, all of it where the place's own government also buys). Make the county owner check also read the Census 2021 Government Units listing (units active in the fiscal year that contains the opening) as the opening-dated observation matched by PID6 and GID, and compare names without punctuation so the one county whose 2017 name lacks its apostrophe is accepted.

**Cause.** Found in code: src/core2/opening-public-owner.ts carries stopgaps SG-P8-opening-public-owner-history and SG-P8-opening-public-owner-coverage (rows in src/core2/data/stopgaps/p8.json, lines 950 and 962): one national buyer coverage (0.80) and county identity carried from the 2017 listing.

**Fix.** Read each state's share of local public-building spending by government type from data/research/core/census-2022-local-public-buildings-by-government-type.json (territories at its median), scale each public custodial budget by it, and match the county owner to the Census 2021 listing by PID6 and GID (data/research/core/census-gus-2021-county-identity-continuity.json), comparing names without punctuation. Resolve both rows in src/core2/data/stopgaps/p8.json and delete their markers.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the shares come from the per-state table in data, territories at its median, and no state is named in logic. Sliding scales and causes: the share scales the budget smoothly, never a cutoff. An effect is a read, not a record: the public custodial contract and its payments to the building-services firm must move with the new share.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place with a building-services firm (place and seed named in the PR body) and opens the public custodial agreement: its monthly budget equals the state's share for its buyer type times the place's public-building spending, shown by agreement and payment record ids. A test in src/core2/opening-customers.test.ts covers a county-only buyer and a county-plus-municipal pair, and SG-P8-opening-public-owner-history and SG-P8-opening-public-owner-coverage are resolved in src/core2/data/stopgaps/p8.json.

**Waits on.** Nothing.

**Files.** src/core2/opening-customers.ts, src/core2/opening-public-owner.ts, src/core2/data/opening-customers.json, src/core2/data/stopgaps/p8.json, src/core2/opening-customers.test.ts, data/research/core/census-2022-local-public-buildings-by-government-type.json, data/research/core/census-gus-2021-county-identity-continuity.json

**Notes.** TODO

Released (2026-11-11): Read and scoped, not built: needs a per-state buyer-type share table, a per-place buyer-kind read, and re-keying the county owner check to the 2021 listing across opening-public-owner.ts and opening-customers.ts (hashed-provenance validators and the opening hash); more than one bounded part for this session. Suggested first part: the per-state county share scaling authorityCoverage in opening-customers.ts (line ~1509) only. Continue on branch claude/pool-core-opening-public-buyers-sourced-reads.
