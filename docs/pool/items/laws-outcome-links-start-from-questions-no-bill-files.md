---
id: laws-outcome-links-start-from-questions-no-bill-files
title: "Eleven built outcome-web links start from a policy question no bill files and dev mode cannot set, so they never fire"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 item 8d, Nov 17, 2026, found while wiring the Social Security age links (#9887)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Eighteen policy questions are the `from` of 22 links in data/research/outcome-web/links.json, but no bill in the catalog files them and dev mode's Set law and Introduce cannot set them, so no law row for them is ever written and the web reads each as not in force (`lawValue`, src/core2/modules/outcome-web.ts). Twelve of the links are built; #9887 moves one, retirement-age-to-poverty, to the full retirement age law the claim engine reads. The other eleven size an outcome the player sees and cannot fire in play: housing-first-to-homelessness, by-right-permitting-to-homelessness, housing-preemption-to-homelessness, flood-zone-limits-to-damage, federal-loan-cap-to-high-cost-loans, crisis-response-to-crime, licensing-reform-to-poverty, harm-reduction-to-overdose-deaths, library-funding-to-reading, fix-it-first-to-poor-roads and retirement-age-to-older-work. The rest are about-zero or unsized. Seen: dev mode's law list has none of the eighteen questions; the law table has no row for them.

**Cause.** Found in code: the questions are in data/research/powers-catalog/question-powers.json (with their levels) but not in src/core2/data/legislature/bill-catalog.json, `POLICY_QUESTIONS` (src/core2/policy-answers.ts) or the reach tables, which are what `lawSeriesCatalog` (src/bench/dev-mode.ts) offers; listed with a script over links.json against those four sets on main at b6ac596.

**Fix.** For each question, either point its links at the catalog key that means the same where one exists (`us-policy-positions:justice-public-safety.mandatory-minimum-sentences` against the catalog's `us-federal-positions:justice-rights.reduce-mandatory-minimums` is the one candidate; the full retirement age link was re-pointed this way in #9887), or add it to the bill catalog under its subject as a policy question at the levels question-powers.json gives, so a body can file it and dev mode can set it. Then add a guard that every link starting from a law names one the catalog files or dev mode sets, which fails on today's links.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** Wire to the world: a link that no law can turn on moves no money, people or places in any generated world. Every effect can be triggered from the game's own code in dev mode and traced (owner, Nov 14). Fix the cause, not the check: the link's research and size stay; what changes is that a law can exist for it.

**Done when.** A second session, in a drawn place, Town, State (seed printed), passes a state bill on `us-policy-positions:health-human-services.housing-first-homelessness` in dev mode, runs a month past its lag, and sees the web's homelessness factor from housing-first-to-homelessness in Trace; the new guard passes.

**Waits on.** Nothing.

**Files.** src/core2/data/legislature/bill-catalog.json, data/research/outcome-web/links.json, tests/guards/outcome-links-enactable.test.ts (new)
