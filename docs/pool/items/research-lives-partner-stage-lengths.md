---
id: research-lives-partner-stage-lengths
title: Source the months a couple spends dating, living together and engaged
area: core
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
branch:
pr:
after:
blocked-on:
lead: lives
model: sonnet
effort: low
root: design-life-record
milestone: M7
source: stand-in triage Nov 10; stopgap SG-LIVES-partner-stage-lengths
---

**What.** A couple in the played town moves from dating to living together to engaged to married on set stage lengths (partnerDatingMonths, partnerLivingTogetherMonths, partnerEngagedMonths) that were tuned by a builder to about half of first unions beginning with living together. Find published NSFG or ACS paces for these transitions by age and replace the tuned numbers with sourced ones, so the stand-in becomes a sourced estimate.

**Cause.** Found in code: src/core2/data/parameters.json, partnerDatingMonths (line 8087) cites itself as an owner-unreviewed stopgap length; src/core2/modules/partnerships.ts line 802 records SG-LIVES-partner-stage-lengths.

**Fix.** Fetch and quote the pages (NSFG transition to cohabitation and to marriage by age, duration of cohabitation before marriage), set each stage-length parameter as SOURCED or ESTIMATED with citation and spread, and note how it checks totals only. Change no code; clear or narrow the register row.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Research before building: data checks the simulation and never decides one couple's outcome. No dice: lengths slide with the pair's traits as they do now.

**Done when.** A second session, in a drawn place and seed it did not choose, runs a played year of buildBenchWorld, and sees couples reach each stage at the sourced lengths shown in the parameter table; the parameter rows carry SOURCED or ESTIMATED tags with fetched quotes, and the register row says what remains.

**Waits on.** Nothing.

**Files.** src/core2/data/parameters.json, src/core2/modules/partnerships.ts, src/core2/data/stopgaps/lives.json
