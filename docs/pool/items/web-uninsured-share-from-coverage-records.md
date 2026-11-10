---
id: web-uninsured-share-from-coverage-records
title: "A place's uninsured share is read from the coverage records the world keeps, Medicaid included"
area: people
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "stand-in triage of the web register, Nov 10 (docs/stopgaps/triage-2026-11-10/web.md)"
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: laws-effects
---

**What.** The Medicaid expansion and the work requirement change who is covered, but the place's uninsured share, which the schooling link reads, ignores that coverage and moves only with unemployment and marriage equality (SG-WEB-uninsured-share-misses-medicaid-coverage).

**Cause.** Found in code: src/core2/medical-bills.ts line 366 (the marker comment) and `EMPLOYER_PLAN_LEAVES_OUT`: the coverage engine (src/core2/modules/coverage.ts, `health.uninsured-pct` read near line 265) builds employer plans only, and nothing sums the residents' own coverage records (employer plans, Medicare, the law reach's Medicaid coverage, full and counted) into the place's share.

**Fix.** Compute the place's uninsured share each month from the coverage records the world keeps (counts by coverage kind over the residents, full and counted), keep it as the measure the web reads for `health.uninsured-pct`, and let the graduation link read it. Cheap: a count by place built when a coverage record changes, never a scan of everyone daily.

**Time box.** 6 hours.

**Rules.** One model, two tiers. Wire to the world: the share is a read of the same records the bills read, no second record. No dice.

**Done when.** A second session plays a drawn place and seed it chose (named) in two twin worlds, the Medicaid expansion enacted in one, and sees the place's uninsured share lower in the expansion world, by the coverage record ids it summed, and the graduation link's input moving with it.

**Waits on.** Nothing.

**Files.** src/core2/medical-bills.ts, src/core2/modules/coverage.ts, src/core2/modules/outcome-web.ts, src/core2/data/stopgaps/web.json
