---
id: play-stop-25-door-count-stops-growing
title: "Knock on doors stops adding to the campaign's door count after September 2025"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/play-stop-25-door-count
pr: #6065
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T23:50:23.358Z
---

**What.** On the v0.22.10 release I pressed Knock on doors every week from February 2025 to October 2026. Each time the status said "KNOCK ON DOORS · 36 DOORS · 6 REACHED", but Politics → Campaigns stayed at "1080 doors" and "Doors 172 · +105 · −67" from September 2, 2025 until election day, 14 months later. Late in the campaign Knock on doors and Ask for an interview were grayed with no reason. I expected the count to grow each week or the screen to say why my knocking no longer counted.

**Rules.** Serves LAW.md §4, Scenes and conversations; LAW.md §11, The world on screen makes sense. Wire to the world: each canvass reaches named voters and the campaign record counts them. Ask why: a grayed action and a stalled count each say their reason.

**Done when.** The owner does the same steps on the next build and is not stopped: campaigning weekly for a year after filing, the door count and reached count grow with each Knock on doors, and a grayed campaign action shows why. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Each week you knock on doors the campaign's door count grows, and a grayed campaign act says why it is grayed.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/core2/modules/campaigns.ts, src/bench/campaign.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:12, 16:28; screenshots 61, 68. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

Sent back 2026-10-25 from PR #6065 (branch claude/play-stop-25-door-count): primary Done-when requires reached count to grow with each knock, but supplied evidence admits zero-reach weeks and months-long stalls; follow-up does not fulfill that row; finish on that branch, merge main into it first.

Oct 25, after the send-back (speed lead, same branch, #6065): the reached count now grows with every Knock on doors. A home opens in the share of knocks its readiness says (doorAnswerScale), and each evening opens as many doors as the knocked homes' shares add up to, at the homes owed an opening most; each home's carry is on its door row and the evening's remainder on the campaign row. On the play screen, Dix, Nebraska (3113190, drawn, seed 11e516e8716e29dc3a9b44b0b6ab2fffb635b12b60ec8860b2481baa6a3fa07f): 52 weeks, 6 to 16 people reached every week, 508 in all. Anson, Texas with the playtest's seed: 3 to 26 every week, 545 in all. The walk order is unchanged (SG-GOV-campaign-walk-order).

Sent back 2026-10-25 from PR #6065 (branch claude/play-stop-25-door-count): corrective reached-count rule passes own integrated gates, 6 tests and 97.0-to-100.3s speed; affected browser buttons pass, inherited HUD overlap confirmed on clean base; held for declared owner full-window screenshot approval and automatic-review-blocked plain integration push, no new code defect alleged; finish on that branch, merge main into it first.
