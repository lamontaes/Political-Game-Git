---
id: campaign-platform-emphasis-band-needs-more-acts
title: "A candidate's emphasis rises with support only once a campaign speaks often enough to share its platform"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: campaign-platform-emphasis-c1
source: account lead thread "Give rivals more than one issue", Nov 14 (coordinator ruling after PR #9155)
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** After PR #9155 spreads a campaign's acts over its platform by score share, the pooled emphasis on support in a played year is still outside the research's band, so a candidate's emphasis does not yet rise with support as real campaigns' do. The player sees it as rivals who say one thing in their one or two acts a year, so the town hears little of the rest of their platform. Seen: in what a rival's ads, mailers, door visits and speeches are about.

**Cause.** Measured: campaign-platform-played.test.ts on head 60176378 of PR #9155, run seed 9e7eec0bdf060ca8, three drawn places, 80 candidates, 2,479 pairs, 380 statements by record: pooled emphasis -2% per 10 points of support (before #9155: -3%), against the research band +16% to +86% (Druckman, Jacobs and Ostermeier 2004). Within each candidate's own questions the fit is +786%, so the rule works where a candidate speaks often. Reading, not yet measured per candidate: most world candidates act only once or twice in a year (year 1 at Ridgetop TN, run seed rival-issues-1: 24 candidates, one door night each), and the first act of each kind is always the top-scored question, so with so few acts the shares are not shared.

**Fix.** Raise how often a campaign speaks by the causes that already exist in the world, with no roll: how many events and speeches a campaign holds (the campaign-events work), what the week's stories give it to answer, and the voters' views once Build voters' views from their lives lands. Then remeasure the pooled total with the same test.

**Time box.** 4 hours for an Opus session.

**Rules.** No dice: more acts come from money, time and causes, never a chance per day. Real rates check totals and never pick an outcome. The research band is a figure to report and is never tuned to; the test prints it and does not assert it.

**Done when.** A second session, in drawn places with the run seed printed, plays a year in buildBenchWorld and sees how many acts a candidate takes per year before and after, and the pooled fit per 10 points of support printed beside +16% to +86% as a figure to report, with candidates who act more than the platform's question count named by record id.

**Waits on.** campaign-topic-tilts-to-the-audience and campaign-topic-tilts-to-the-news.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-platform-played.test.ts

**Notes.** Filed on PR #9155's branch Nov 14. The test only prints the band and asserts nothing about it; it passes.
