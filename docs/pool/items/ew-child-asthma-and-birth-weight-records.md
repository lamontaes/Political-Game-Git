---
id: ew-child-asthma-and-birth-weight-records
title: "A child can have asthma and a newborn a low birth weight, decided from the health engine's own records times the web's factor"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage of the ew register, Nov 10, 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A gas hookup ban is meant to lower child asthma and the water-violation link to lower low birth weight, but no child holds an asthma condition and no newborn a birth weight, so the web moves a number nobody lives. Add both records to the health engine and read the web's factor where each is decided.

**Cause.** Found in code: src/core2/health-web.ts line 76 marks SG-EW-HEALTH-condition-record; src/core2/condition-pack.ts holds adult chronic conditions only, and src/core2/modules/health.ts has no asthma or birth weight.

**Fix.** Add a childhood asthma condition to the condition pack (rate by age and place from CDC's national health interview tables) and a birth weight to the birth record, each decided by the person's own risks (housing, air, coverage, mother's health) times webFactorFor, through the monthly look in modules/health.ts (refreshWebFactors) and the birth writer. Counted children read the same rule times their count. Medicare out-of-pocket drug cost stays a marked stand-in (kept in ew.json, text narrowed to that one link). Rewrite the stand-in's text in src/core2/data/stopgaps/ew.json and SG-EW-HEALTH-person-level's birth-weight clause to match.

**Time box.** 8 hours for an Opus session.

**Rules.** No dice: the condition follows records, never a roll. One model, two tiers: counted children read the same rule. Speed: monthly and by counts, never a daily scan. One rule, all 56 places.

**Done when.** A second session runs a one-year played world in a drawn place and a seed the builder did not choose (both named in the PR body), enacts the gas hookup ban, and sees the place's child asthma count fall by the link's size after its lag, naming the child's condition record id and the web month record id; speed:year is no more than 20% slower than its base.

**Waits on.** Nothing.

**Files.** src/core2/condition-pack.ts, src/core2/modules/health.ts, src/core2/health-web.ts, src/core2/births-counted.ts, src/core2/data/stopgaps/ew.json
