---
id: health-death-cause-reads-the-illness-the-person-had
title: "A person who dies ill dies of the illness on their record, not of an unnamed cause"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: world
model: opus
effort: medium
root: rc3-thin-life-record
source: Account lead S3, from the death-talk review of #9336, Nov 14, 2026
checked: s3 2026-11-14
---

**What.** About 95 percent of the deaths the health engine records carry the cause "other", while heart disease, cancer, COPD and diabetes exist in the same engine only as illnesses. A person with a recorded serious illness who dies does not die of it: the record says "other", and the talk and paper cannot say the true cause (a relative who knew of the illness says nothing of it unless the player was told). Seen: the talk at home after a relative's death, at Carlock IL (rulings3-g:1), where the dead relative had a recorded diabetes illness and the death record named no cause.

**Cause.** Found in code: src/core2/modules/health.ts (the death branch, `assignDeathCause` near line 1158) takes a cause from age-band shares (src/core2/death-cause.ts, data/health/death-causes.json, which names only overdose, firearm suicide, firearm homicide and motor vehicle, with every other death as "other"); it reads only the place, age, income fifth and the substance condition, never the person's own illness case (`found`, the illness the death follows). The counted tier (src/core2/births-counted.ts, `notifyCountedDeaths`) writes a death with no cause at all.

**Fix.** A death that follows a recorded serious illness takes the illness as its cause (read from the case the engine already holds: `found`'s condition), and the age-band shares assign a cause only to deaths with no illness case, so the totals by cause still check against the sourced shares (real shares calibrate, never decide one person's death). The counted tier carries a cause from the same rule. Words then read the cause (see words-death-how-has-no-answer-for-unworded-causes). Likely owner: the small-town deaths builder, who is in births-counted.ts now.

**Time box.** 4 hours, Opus medium.

**Rules.** No dice (the cause follows the illness, the shares check totals); one model, two tiers; replace never layer; no new stopgaps; a year no more than 20 percent slower than its base.

**Done when.** In three drawn places (fresh seed, each named), a relative who died after a recorded illness has that illness as the cause on the death record, by record id; and a year of deaths by cause in a drawn place is shown beside the sourced shares as a report. A second session replays one place on main.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/core2/death-cause.ts, src/core2/births-counted.ts, src/core2/data/health/death-causes.json

**Notes.** Filed by hand on the accuser branch (claude/words-s3-bribe-accuser-from-readers). Twin: words-death-how-has-no-answer-for-unworded-causes.
