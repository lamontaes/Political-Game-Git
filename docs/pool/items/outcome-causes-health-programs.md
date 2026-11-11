---
id: outcome-causes-health-programs
title: "The coverage, earned-income-credit and blood-lead links run: health and programs engines record their causes and the web keeps the outcomes"
area: people
kind: wiring
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on: outcome-causes-health-programs-part-1-coverage-links, outcome-causes-health-programs-part-2-earned-income-credit-link
source: "split from core-outcome-causes-recorded, Oct 19"
claimed-at:
after:
standard: 2
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
lead: laws-effects
checked: fable 2026-11-10
---

**What.** Seven links wait on causes the health, programs and pregnancy engines do not record: coverage-to-catastrophic-bills, coverage-to-medical-debt, coverage-to-depression, marriage-equality-to-coverage, eitc-to-low-birthweight, lead-to-reading and abortion-denied-to-financial-distress. Each cause is a share or total over the place's people, read from rows the engines already write. A link runs only when its cause is readable and its outcome is one the web keeps, so each link needs the owning engine's record of the cause and a kept outcome with its base and source. It is split into three parts.

**Cause.** Found in code: src/core2/data/outcome-web/coverage.json lists all seven links under "waiting"; linkCoverage in src/core2/outcome-web-model.ts (line 456) wires a link only when its cause is an engine measure, a government measure in src/core2/gov-measures.ts or a law, and its outcome is in keptOutcomes in src/core2/data/outcome-web/outcome-web.json.

**Fix.** Build the three parts: the coverage links, the earned income credit link, and the lead and abortion links. Each regenerates coverage.json so the links move from waiting to wired.

**Time box.** 2 hours for one Sonnet session, the closing check after the three parts. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: an effect is a read, not a record, so the outcome is read by the engine that owns it through outcomeWebFactor or a kept measure that views and news read. No dice: the cause record moves the outcome by the link's researched size, never a roll. One rule, all 56 places: place facts live in data.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in a drawn place and a seed the builder did not choose (both named in the PR body) and sees each of the seven links move its outcome after its lag when its cause changes, named by the engine's record id, the link key and the web month record id. coverage.json shows all seven under wired.

**Waits on.** Its two parts: outcome-causes-health-programs-part-1-coverage-links and outcome-causes-health-programs-part-2-earned-income-credit-link. Part 3 (the lead and abortion links) was dropped in the depth sweep on Nov 10, 2026.

**Files.** src/core2/modules/outcome-web.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/data/outcome-web/coverage.json, src/core2/modules/health.ts

**Notes.** No engine pays an earned income credit yet (no module mentions it), so that link also needs the credit built in the government area first. Split from core-outcome-causes-recorded, which was really three bounded pieces (found building it: engine measures are read from world-metrics month fields, government measures from `gov-measures.ts`, and a wired link also needs a kept outcome, so no link is a one-line change). The links' sizes and anchors are in data/research/outcome-web/links.json.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A roll-up of three parts; the coverage links are kept in part 1 and the rest is dropped or borderline on its own part, and no player sees the roll-up.
