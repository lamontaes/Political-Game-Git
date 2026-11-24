---
id: laws-national-answer-to-state-question-unloaded
title: "The assistance work requirement, answered once for the nation, is never loaded as law: no place has the federal law in force"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/national-answer-state-question
pr: #6326
blocked-on:
source: laws-and-effects lead, Oct 27 (laws-in-force-every-question)
claimed-at: 2026-10-27T13:34:14.300Z
---

**What.** `us-policy-positions:health-human-services.work-requirement-for-assistance` is answered once, `"US": yes` (Public Law 119-21; `data/research/laws/starting-law-2026/health-human-services.json`, "The federal law answers yes for every place"). `openLaws` (`src/core2/modules/laws.ts`) loads a federal answer only for keys starting `us-federal-positions:` and looks up every other question by the state's key, so this answer is skipped in every place. The reader `lawHere` returns 58 of 59 questions in every drawn place (Carol Stream, Illinois; Marshall, Alaska; Del Monte Forest, California; Spring Valley Colony, South Dakota), and the benefit's time limit (`assistanceTimeLimit`, `src/core2/law-reach/group-b.ts`) never applies, since it reads the question's row.

**Rules.** Wire to the world: the federal law in force is a law row at the federal level, read by the benefit at the moment it pays. One rule, all 56 places: a question the research answers for the nation applies in every place, territories included where the law reaches them. Replace, never layer.

**Done when.** `openLaws` loads a nation's answer to a question the state does not answer as a federal row; in a played year (buildBenchWorld) in two places drawn from all 56 on seeds the builder did not choose, `lawHere` returns 59 of 59 questions, and the PR body names, by record id, a resident whose assistance the time limit changed beside the twin world without the row (`scripts/law-wiring/check.ts`), with the law matrix row regenerated.

**Time box.** 2 hours, the laws-and-effects lead or one Sonnet helper.

**Files.** src/core2/modules/laws.ts, src/core2/law-reach/group-b.ts, docs/reports/law-wiring-matrix.json

**Notes.** Filed by the laws-and-effects lead, Oct 27, while building the one reader of laws in force. Left out of that PR because loading the row turns on the time limit in every world, which needs its own twin-world proof.
