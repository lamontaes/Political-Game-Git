---
id: research-outcome-link-age-verification
title: "Research: size the outcome link of social media age checks"
area: laws
lead: laws
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws lead, Oct 26
claimed-at:
---

**What.** `age-verification-for-social-media` has an unresearched outcome link (SG-LAW-outcome-link-unresearched). Research contracts exist in `data/research/outcome-web/social-media-age-verification-contracts.json` (platform compliance cost, and what the checks change for young users), but each has `size: null`. Size the links from sources actually fetched and quoted: the compliance cost per covered platform or per completed verification, and the change in young users' time or accounts, with the lag and an ESTIMATED range.

**Rules.** Research before building: research calibrates the simulation and never decides one actor's outcome. A link about zero is recorded as about zero with its source.

**Done when.** The contracts' links are in `data/research/outcome-web/links.json` with sourced or estimated sizes, lags and ranges, quoted from fetched pages, and the law's gap row is gone from `src/core2/data/laws/outcome-research-gaps.json`, with the test src/core2/outcome-web-ranges.test.ts passing (every running link carries a range that brackets its size, with a source). **On screen.** Nothing yet.

**Files.** data/research/outcome-web/links.json, data/research/outcome-web/social-media-age-verification-contracts.json, src/core2/data/laws/outcome-research-gaps.json

**Notes.** Laws lead, Oct 26. Part of `laws-nine-links-rights-env`.
