---
id: elections-campaign-stances-from-views
title: "A person's stance on each policy question comes from the views engine, not from their lean times an axis"
area: elections
kind: stopgap
priority: 2
size: M
status: done
claimed-by: claude/meetings-read-views
pr: #4790
blocked-on:
source: "split from elections-stopgap-campaigns-missing-engine; SG-GOV-views-stand-in"
claimed-at: 2026-10-16T18:20:42.964Z
---

**What.** The campaign engine gives each person a stance on a policy question as their left-right lean times the question's measured axis, ordered against the area's 2024 vote. The views engine now keeps stances by question (`stancesOf`) formed from each person's life, so the campaign reads that instead. Replace the lean-times-axis formula in the campaign views with the views engine's stance for the question, for full people and for counted groups alike, and delete the formula and the stopgap marker. The player would notice candidates and voters agreeing or clashing on the issues their lives touch.

**Rules.** One model, two tiers: a counted group's stance is read by the same function as a full person's, times its count. No dice. Replace, never layer: the lean-times-axis code is deleted in the same change. Estimate, never UNKNOWN: a question with no formed stance starts from the real average with a spread and a source. Speed: stances are read when a campaign asks, not scanned daily.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), a named voter's stance on a question the campaign raised is read from the views engine by record id, a door knock or speech moves their warmth by that stance, and SG-GOV-views-stand-in closes. Tests in src/core2/campaign-views.test.ts. The owner plays it: knocks a door and hears the voter's view on a question that touches their job.

**Files.** src/core2/campaign-views.ts, src/core2/modules/campaigns.ts, src/core2/modules/views.ts, src/core2/data/stopgaps.json

**Notes.** Split from elections-stopgap-campaigns-missing-engine when the ad half was built.

Looked at 2026-10-16, not built. Checked against main: the views engine is not a replacement for the lean-times-axis formula; it is built on it. `viewOn` in `src/core2/modules/views.ts` (about line 425) returns `personStance(lean, question)` plus `stanceViewWeight` times what the person has heard (`stanceOn`), so every stance the views engine keeps already contains lean times the question's axis as its baseline. `personStance` is also read directly by `world-legislating.ts`, `staff.ts`, `executive.ts`, `ballot-measures.ts` and `meetings.ts`, and the stopgap marker (SG-GOV-views-stand-in) sits on the town's starting lean in `campaigns.ts` `openCampaigns`, which comes from the district's 2024 vote. Deleting the formula therefore needs a decision first: what is a person's baseline stance on a question before they have heard anything, if not their lean times the axis? The candidates are a stance formed from their job, income, age and household (the CES cell the lean comes from, but per question), or the heard-only stance starting at zero. Either one moves every race and every vote that reads `personStance`, so it needs the owner or the People session to name the baseline, plus a before-and-after of the 56-place elections check. Split suggestion: (1) name the baseline (owner decision); (2) change `viewOn`'s baseline and delete `personStance`'s other readers one engine at a time.

Partly built Oct 16 (claude/meetings-read-views): the town hall (host's answers, who asks what, how evenly the town splits on a bill) now reads `viewOn` instead of `personStance`. Still reading `personStance` directly: `world-legislating.ts`, `staff.ts`, `executive.ts`, `ballot-measures.ts`, `parties.ts`, `legislature.ts` (the budget-line share and the opening views) and public comment's remarks in `meetings.ts`. Each is one engine's change; the baseline question (what is a stance before anything is heard) is unchanged and still the owner's or People's call.
