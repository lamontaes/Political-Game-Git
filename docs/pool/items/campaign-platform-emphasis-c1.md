---
id: campaign-platform-emphasis-c1
title: "A campaign spreads what it says over its platform, so its emphasis rises with support as the research measures"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: campaign-platform-follows-agreement
source: governing lead, Nov 2 (the C1 band of campaign-platform-follows-agreement, carried from its played-year test)
lead: governing
---

**What.** In the played-year test of campaign-platform-follows-agreement, emphasis by record does not rise with support. Every campaign act (a message, an event, a donor meeting, a speech promise) carries one question, the platform's lead, so a candidate's emphasis falls entirely on their top-scored question. Measured over 42 candidates and 1,480 pairs (run seed b6c9d59eda6a31f1), the pooled fit with each candidate offset reads -3% per 10 points of support at every slope from 0.015 to 0.062, against the research band of +16% to +86% (Druckman, Jacobs and Ostermeier 2004). Build the replacement SG-GOV-platform-emphasis-lead-only names: each act takes its topic in turn across the platform, the question furthest behind its score share of what the campaign has said so far, then hold the band check again.

**Rules.** No dice: the topic is chosen by how far each question lags its score share, never by a roll. The band is not widened, and the slope stays inside the research's spread. One model, two tiers: support is read as the ballot's readers read it, counted groups by the same rule times their count.

**Done when.** In a buildBenchWorld played year in a drawn place with the seed printed, src/core2/campaign-platform-played.test.ts holds the C1 band again: emphasis by record per 10 points of support, pooled with each candidate's offset, inside +16% to +86%; and SG-GOV-platform-emphasis-lead-only and SG-GOV-platform-slope-c1-out-of-band are resolved.

**Files.** src/core2/campaign-views.ts, src/core2/modules/campaigns.ts, src/core2/campaign-platform-played.test.ts, src/core2/data/stopgaps.json

**Notes.** TODO
