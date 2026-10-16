---
id: elections-campaign-stances-from-views
title: "A person's stance on each policy question comes from the views engine, not from their lean times an axis"
area: elections
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from elections-stopgap-campaigns-missing-engine; SG-GOV-views-stand-in"
---

**What.** The campaign engine gives each person a stance on a policy question as their left-right lean times the question's measured axis, ordered against the area's 2024 vote. The views engine now keeps stances by question (`stancesOf`) formed from each person's life, so the campaign reads that instead. Replace the lean-times-axis formula in the campaign views with the views engine's stance for the question, for full people and for counted groups alike, and delete the formula and the stopgap marker. The player would notice candidates and voters agreeing or clashing on the issues their lives touch.

**Rules.** One model, two tiers: a counted group's stance is read by the same function as a full person's, times its count. No dice. Replace, never layer: the lean-times-axis code is deleted in the same change. Estimate, never UNKNOWN: a question with no formed stance starts from the real average with a spread and a source. Speed: stances are read when a campaign asks, not scanned daily.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), a named voter's stance on a question the campaign raised is read from the views engine by record id, a door knock or speech moves their warmth by that stance, and SG-GOV-views-stand-in closes. Tests in src/core2/campaign-views.test.ts. The owner plays it: knocks a door and hears the voter's view on a question that touches their job.

**Files.** src/core2/campaign-views.ts, src/core2/modules/campaigns.ts, src/core2/modules/views.ts, src/core2/data/stopgaps.json

**Notes.** Split from elections-stopgap-campaigns-missing-engine when the ad half was built.
