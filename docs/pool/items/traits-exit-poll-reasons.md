---
id: traits-exit-poll-reasons
title: "Telling an exit pollster reads the voter's engagement and how much the race mattered, at a researched trait size"
area: people
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #6095
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Part of traits-wire-civic. A voter's answer to the exit pollster (voting.exit-poll in src/core2/modules/voting.ts) had a case of 0, so the sign of their temperament decided every answer: net odds of 35 between the thirds in Halfway, Missouri. Give the case the voter's own reasons, how closely they follow politics and how much the day's races mattered to them, set so the share who tell matches the exit-poll response rate, and weigh temperament at a researched size.

**Rules.** No dice: the answer follows the voter's recorded reasons and lean, never a roll. Research before building: the response rate and the trait size come from fetched pages, quoted. Ask why: each ballot's why keeps the parts.

**Done when.** In the named voters of two drawn race towns' played windows (src/core2/trait-test-kit.ts drawnRaceWorld), seeds named, the share who tell the pollster is between 35% and 60% and the crossed net odds between the thirds of lean are from 1.1 to 1.4, with the base, engagement and interest weights and traitWeightVotingExitPoll tagged ESTIMATED with their sources; src/core2/modules/voting.traits.test.ts checks that every voter's answer follows their kept reasons at the weight; and the voting.exit-poll gap row is removed. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/modules/voting.ts, src/core2/data/elections/parameters.json, src/core2/data/parameters.json, data/research/trait-effect-sizes.json, src/core2/modules/voting.traits.test.ts

**Notes.** Built Oct 25 by the traits lead on branch claude/traits-exit-poll, stacked on traits-civic-shared-rule. Fitted on Finklea, South Carolina (4525405), Silver City, Nevada (3266800) and Douglas, Nebraska (3113505): 46.5% tell pooled, crossed odds 1.18.

Sent back 2026-10-26 from PR #6095 (branch claude/traits-exit-poll): Current-main integration conflicts in trait-decision-gaps.json, trait-effect-sizes.json, trait-calibrate.ts, trait-wiring-matrix.ts, modules/press.ts, trait-pairs.ts add/add, and american-english.test.ts; merge aborted, preserve shared readers and positive case-plus-lean assertions while reconciling the combined civic stack; finish on that branch, merge main into it first.
