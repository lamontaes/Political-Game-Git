---
id: people-opening-pregnancy-first-year-calibration
title: "Opening pregnancies match the place's live-birth pregnancy share without a surveyed rate deciding anyone"
area: people
kind: stopgap
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: opus
effort: medium
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** The renewal module reconstructs the pregnancies already under way at the opening from each couple's current money, housing, health and temperament, run through both partners' chooser at past review dates, because the opening population has no dated history before day one. On a given day about 3.9 percent of women 15 to 44 nationally carry a pregnancy that will end in a live birth, 2.2 to 5.7 percent across the 56 places. Give the reconstruction a dated pre-opening history so the town's opening pregnancies fall near the place's figure and deliveries are not bunched. Closes SG-M1-opening-pregnancies.

**Cause.** Found in code: src/core2/modules/renewal.ts initialize (line 616) reconstructs opening pregnancies from each couple's present state at past review dates; stopgap SG-M1-opening-pregnancies is in src/core2/data/stopgaps/m1.json line 15; the place's share is in data/research/core/opening-pregnancy-2024.json.

**Fix.** Give the reconstruction a dated pre-opening history (or a reconstruction the CTO accepts) so opening pregnancies come from each couple's own plan, and check the town's opening pregnancies and first-year births against the place's figure by tier.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: who is pregnant at the opening comes from each couple's own chooser plan, history and conditions, never a draw against the 3.9 percent share. Research before building: the share is a figure the year run reports the town against and never a chance one woman follows.

**Done when.** A second session runs scripts/research/core-year.ts over a one-year played world (buildBenchWorld, a drawn place and seed named in the PR) and sees the town's opening pregnancies named by three pregnancy record ids, with the share of full-person women 15 to 44 reported beside the place's figure from data/research/core/opening-pregnancy-2024.json, and deliveries in the first nine months not bunched on one date. SG-M1-opening-pregnancies is resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/renewal.ts, src/core2/renewal.test.ts, data/research/core/opening-pregnancy-2024.json, scripts/research/core-year.ts, src/core2/data/stopgaps/m1.json

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have matched opening pregnancies to a live-birth share; the item says nothing on screen reads it.
