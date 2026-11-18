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
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** In the played-year test of campaign-platform-follows-agreement, emphasis by record does not rise with support. Every campaign act (a message, an event, a donor meeting, a speech promise) carries one question, the platform's lead, so a candidate's emphasis falls entirely on their top-scored question. Measured over 42 candidates and 1,480 pairs (run seed b6c9d59eda6a31f1), the pooled fit with each candidate offset reads -3% per 10 points of support at every slope from 0.015 to 0.062, against the research band of +16% to +86% (Druckman, Jacobs and Ostermeier 2004). Build the replacement SG-GOV-platform-emphasis-lead-only names: each act takes its topic in turn across the platform, the question furthest behind its score share of what the campaign has said so far, then hold the band check again.

**Cause.** Measured: the played-year test of campaign-platform-follows-agreement (src/core2/campaign-platform-played.test.ts), run seed b6c9d59eda6a31f1, over 42 candidates and 1,480 pairs: emphasis falls 3% per 10 points of support, where the research (Druckman, Jacobs and Ostermeier 2004) reports +16% to +86%. The stopgap SG-GOV-platform-emphasis-lead-only (src/core2/data/stopgaps/gov.json line 2021) names the cause: every act carries only the platform's lead question.

**Fix.** Each campaign act takes its topic in turn across the platform: the question furthest behind its score share of what the campaign has said so far (no roll). Then rerun the played test's emphasis fit.

**Time box.** 5 hours for an Opus session.

**Rules.** No dice: the topic is chosen by how far each question lags its score share, never by a roll. The research band is a figure to report and never a target, and no slope is tuned to land in it (owner, Nov 8). One model, two tiers: support is read as the ballot's readers read it, counted groups by the same rule times their count.

**Done when.** A second session, in a drawn place with the seed printed, plays a year in buildBenchWorld and sees a candidate's emphasis by record rise with support across the platform's questions, where it fell before, with the pooled fit per 10 points of support printed beside the research's +16% to +86% as a figure to report. SG-GOV-platform-emphasis-lead-only and SG-GOV-platform-slope-c1-out-of-band are resolved, and src/core2/campaign-platform-played.test.ts passes.

**Waits on.** Nothing.

**Files.** src/core2/campaign-views.ts, src/core2/modules/campaigns.ts, src/core2/campaign-platform-played.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** Built Nov 14 (thread "Give rivals more than one issue"), branch claude/project-thread-sfqbmk, on the train. `nextTopic` (src/core2/modules/campaigns.ts) takes each act's question as the platform question furthest behind its share (`platformShares`, src/core2/campaign-stances.ts: the platform rule's own score over the platform's sum, read once when the campaign opens) of what the campaign has said so far, in the whole and in the act's own kind, no roll; counts are the `emphasis` table, one row a filing, cleared by `closeRace`. SG-GOV-platform-emphasis-lead-only is resolved. The C1 band stays printed, not held (SG-GOV-platform-slope-c1-out-of-band is a separate row); `platformLead` stays for a mandate's "led with".
