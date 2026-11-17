---
id: laws-social-security-reaches-poverty-and-its-research
title: "Social Security claimed in play counts where poverty is counted, and the line and two claim ages reach their research links"
area: laws
kind: bug
priority: 1
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
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** A named person who claims Social Security in play is paid by the payer's monthly obligation, and the poverty count never reads it: it counts only the award contracts the opening wrote. So a raise in the federal Social Security line, or a later full retirement age, moves those retirees' awards but not where poverty is counted. The law table grades four Social Security rows partly because no outcome-web link starts from them: the spending line, the earliest claim age, the full retirement age and the delayed credit age. Two researched links exist, but they start from a yes-or-no question (`us-federal-positions:social-insurance.raise-retirement-age`) that no bill files and dev mode cannot set. Seen: Metrics, the town's poverty share; docs/reports/law-wiring-table.md, the four rows.

**Cause.** Found in code: `householdPoverty` (src/core2/world-poverty.ts) adds `core.finance.contracts` awards for named households and nothing from `retirementClaims` (src/core2/modules/retirement-claims.ts), whose named claims are obligations; `webLinksOf` (scripts/law-wiring/catalog.ts) finds links by `law:<the law's own key>`, and `retirement-age-to-poverty` names the question instead of `social-security-full-retirement-age`, the series the claim engine reads.

**Fix.** The poverty count adds each named in-play claim's open obligation, at its amount today. Add `social-security-line-to-poverty` (Engelhardt and Gruber 2004; the Census list of incomes), carried by the poverty engine; point `retirement-age-to-poverty` at the full retirement age law, which the claim engine reads; add `earliest-claim-age-to-older-work` (Staubli and Zweimüller 2013; Cribb, Emmerson and Tetlow 2016), carried by the jobs engine's retirement onset. The delayed credit age stays without a link: no source sizes a later cutoff, and the Nov 10 ruling stops research that only adds precision.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** An effect is a read: the poverty engine reads the award the payer owes today. One model, two tiers: named and counted awards follow the line by one rule.

**Done when.** A second session, in a drawn place, Town, State (seed printed), passes a Congress bill raising the Social Security line by a fifth in dev mode, runs past the next monthly close, and reads on the bill card the named and counted retirees reached; `src/core2/social-security-line-poverty.test.ts` passes in that drawn place.

**Waits on.** Nothing.

**Files.** src/core2/world-poverty.ts, data/research/outcome-web/links.json, src/core2/data/outcome-web/coverage.json, src/core2/social-security-line-poverty.test.ts (new)
