---
id: outcome-causes-health-programs-part-1-coverage-links
title: "Coverage share moves catastrophic bills, medical debt, depression and coverage under marriage equality"
area: people
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: split from outcome-causes-health-programs in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-outcome-causes-health-programs-part-1-coverage-links
---

**What.** Four links wait on a cause the health engine does not record as a measure: coverage-to-catastrophic-bills, coverage-to-medical-debt, coverage-to-depression and marriage-equality-to-coverage. Each cause is a share over the place's people read from the coverage and health rows the engines already write. Record the cause as an engine measure and keep the outcome the web needs, with its base and source, so each link runs. Seen: the Metrics tab's medical-debt, catastrophic-bill and depression measures after a coverage law.

**Cause.** Found in code: src/core2/data/outcome-web/coverage.json lists these four links under "waiting" (waitingOn health.coverage, health.catastrophic-medical-bills, health.coverage-pct, health.depression and law.marriage-equality); linkCoverage in src/core2/outcome-web-model.ts (line 456) wires a link only when its cause is readable and its outcome is a kept outcome in src/core2/data/outcome-web/outcome-web.json.

**Fix.** For each link add the owning engine's cause measure (coverage share from the coverage module, a depression and catastrophic-bills measure from health, the marriage-equality law as a readable law) and a kept outcome with its base and source, then regenerate coverage.json with scripts/outcome-web/write-coverage.ts so the links move from waiting to wired.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: an effect is a read, not a record, so the outcome is read by the engine that owns it through outcomeWebFactor or a kept measure that views and news read. No dice: the cause record moves the outcome by the link's researched size, never a roll. One rule, all 56 places: place facts live in data. Estimate, never UNKNOWN: a kept outcome starts from a sourced or estimated national base with its spread.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in a drawn place and a seed the builder did not choose (both named in the PR body), changes the place's coverage share, and sees catastrophic bills, medical debt and depression move after the link's lag, each named by the engine's record id, the link key and the web month record id. src/core2/outcome-web.test.ts lists the four links as built and coverage.json shows them under wired.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/core2/modules/coverage.ts, src/core2/modules/outcome-web.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/data/outcome-web/coverage.json, src/core2/outcome-web.test.ts

**Notes.** Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:25 UTC) on branch claude/pool-outcome-causes-health-programs-part-1-coverage-links.

Released (2026-11-11): Held by my own next loop while walking the queue; not worked (see the item's own size and Fix: M-sized or needs Story/Words lines, not started this pass). Continue on branch claude/pool-outcome-causes-health-programs-part-1-coverage-links.

Nov 12 (Account lead T9): coverage-to-medical-debt is carried by the coverage engine's monthly bills (src/core2/medical-bills.ts; links.json carriedBy), so the web does not run it and it is off this item; three links remain (catastrophic bills, depression, marriage equality).
