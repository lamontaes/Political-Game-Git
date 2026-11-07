---
id: law-levels-federal-rule-reversal
title: "Federal work-rule enactments and repeals use sourced precedence"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: astra/federal-rule-reversal
pr: #7322
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T19:46:41.627Z
---

**What.** The opening Medicaid mandate is marked specially, but the same requirement passed by Congress does not retain that precedence. A state answer can therefore defeat a newly enacted federal requirement. Put the sourced federal requirement precedence in the shared question data and have the one law resolver apply it equally to opening and enacted rows, releasing lower-level laws when Congress repeals the requirement.

**Rules.** One engine per mechanic: resolveLawInForce remains the only precedence rule, with the question and level as data. No dice: federal precedence follows the statute and effective law, not a random choice.

**Done when.** A test using a generated world at a drawn place verifies federal enactment governs over the existing state answer and repeal restores that answer. A separate negative case proves a federal row without sourced preemption does not override lower levels. Cite statute and print replay and law record ids.

**Files.** data/research/powers-catalog/question-powers.json,src/core2/laws-in-force.ts,src/core2/modules/laws.ts,src/core2/federal-rule-reversal.test.ts

**Notes.** TODO
