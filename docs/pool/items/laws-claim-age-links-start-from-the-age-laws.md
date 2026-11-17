---
id: laws-claim-age-links-start-from-the-age-laws
title: "The full retirement age and earliest claim age reach their research links from the age laws the engines read"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr: #9887
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 items 8d and 8f, Nov 17, 2026 (grading the rows the Nov 14 table never ran)
model: opus
effort: low
root: rc8-law-judged-by-paperwork
---

**What.** The law table grades the Social Security earliest claim age and full retirement age partly because no outcome-web link starts from either law. The researched link `retirement-age-to-poverty` starts from a yes-or-no question, `us-federal-positions:social-insurance.raise-retirement-age`, that no bill files and dev mode cannot set, while the claim engine reads `social-security-full-retirement-age`. No link at all starts from the earliest claim age, which the jobs engine reads each day as the age retiring starts to pull on a worker. Seen: docs/reports/law-wiring-table.md, the two rows, when the table is regenerated.

**Cause.** Found in code: `webLinksOf` (scripts/law-wiring/catalog.ts) finds a law's links by `law:<the law's own key>`; `retirement-age-to-poverty` in data/research/outcome-web/links.json names the question, and no row names `law:social-security-earliest-claim-age`.

**Fix.** Point `retirement-age-to-poverty` at the full retirement age law, which `retirementClaimAgeMonths` reads through `socialSecurityAges`. Add `earliest-claim-age-to-older-work` (Staubli and Zweimüller 2013; Cribb, Emmerson and Tetlow 2016), carried by `retirementOnsetYears` in src/core2/modules/jobs.ts.

**Time box.** 1 hour for one Opus session at low effort.

**Rules.** An effect is a read, not a record: each link names the engine that reads the age law at the moment it decides, so the web does not move the measure twice.

**Done when.** A second session, in a drawn place, Town, State (seed printed), raises the earliest claim age to 64 in dev mode and sees in Trace that the jobs engine's retire choices for workers 62 and 63 read the onset as 64; `src/core2/claim-age-links.test.ts` passes; the regenerated law table reads both rows wired.

**Waits on.** Nothing.

**Files.** data/research/outcome-web/links.json, src/core2/data/outcome-web/coverage.json, src/core2/claim-age-links.test.ts (new)
