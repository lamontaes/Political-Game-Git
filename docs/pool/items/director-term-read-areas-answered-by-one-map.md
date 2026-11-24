---
id: director-term-read-areas-answered-by-one-map
title: "The term read's jobs, pay and prices have one map of the questions that answer them, so a hurt address and a campaign speak on them"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread "Give rivals more than one issue", Nov 14 (coordinator, from the speeches builder's finding on PR #9243)
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** A governor or mayor whose term left pay or prices worse never opens a hurt address on it, because no bill question was named as answering pay or prices, and a campaign has no way to ask which of its questions answer the town's own jobs, pay or prices record. After this, the term read keeps one map of the catalog topics whose questions answer each of its nine areas, and the speech outline and the campaigns read it. Seen: in the governor's address at home after a term where pay or prices slid furthest, and in the topic of a challenger's acts after a bad term for the town.

**Cause.** Found in code: `answersCondition` in src/director/speech-outline.ts read `answerTopics` of src/director/data/speech-outlines.json, which had rows for six areas (rent, crime, schools, health, roads, environment) and none for jobs, pay or prices, so a hurt address's answer for those fell to the macro measure's subjects and found no question (probe: prices and pay answered false at Bee Cave TX, Kingsbury NV and Medford MA, seed a7c13e). The campaign side reads no term read at all (src/core2/modules/campaigns.ts).

**Fix.** Move the six rows and the director's budget-line rows (`budgetLineTopics`) into `answeredBy` in src/core2/data/term-read/areas.json beside the area's measures, add jobs, pay and prices, add `topicsAnsweringArea`, `questionAnswersArea` and `areasAnswered` to src/core2/term-read.ts, and make `answersCondition` read them; delete `answerTopics` and `budgetLineTopics`. A budget line answers an area too (welfare and income security answer pay, regional development jobs), which is how a mayor, who holds three policy questions and the town's budget lines, answers pay. Campaigns read the same reader in a second pull request.

**Time box.** 3 hours for an Opus session.

**Rules.** One engine per mechanic: one map, read by speeches and campaigns, never a second copy. No dice. One rule, all 56 places: the rows name catalog topics, never a place. No hand-written player text.

**Done when.** A second session, in three drawn places (Bee Cave TX, Kingsbury NV and Medford MA, the draws 0 to 2 of seed a7c13e) with the town's prices and then its pay sliding, reads the governor's address on main and sees it open on prices and on pay, with the paragraph that states it asking on a question that answers it by record id, where before no hurt address opened on either.

**Waits on.** Nothing.

**Files.** src/core2/data/term-read/areas.json, src/core2/term-read.ts, src/director/speech-outline.ts, src/director/data/speech-outlines.json

**Notes.** A town has no stance question for its own wages, prices or taxes yet (city-level `law:minimum-wage` and the sales-tax rate carry no `question` in the bill catalog, and `PLATFORM_QUESTIONS` offers a town none of them), so a mayor answers jobs and prices only where a budget line or such a question exists; filed as `core-town-wage-and-price-questions`. Filed Nov 14 with the pull request that builds it. Resolves words-pay-and-prices-have-no-question-that-answers-them once both are on the train.
