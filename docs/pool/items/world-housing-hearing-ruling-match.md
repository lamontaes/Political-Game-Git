---
id: world-housing-hearing-ruling-match
title: "The eviction hearing follows the Oct 14 ruling (completes after the state's notice period, no court scene), so the no-judge stopgap is resolved by the ruling"
area: world
kind: stopgap
priority: 2
size: S
status: done
claimed-by: claude/hearing-ruling
pr: #5215
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:29:31.396Z
---

**What.** The eviction hearing step in the housing engine carried a registered stopgap, SG-WORLD-housing-hearing-without-judge, for ending in judgment with no judge. The owner ruled on Oct 14 that evictions complete after the state's notice period from the law in force, the household moves as the housing engine moves leavers, and there is no court scene until courts come. The hearing is therefore a dated step of the statute that follows its conditions, which is what the ruling asks for, so the row is resolved by the ruling and the courts port stays separate work.

**Rules.** Look before you ask: before closing or registering a stopgap, read the register; the ruling is in docs/coordination/OWNER-DECISIONS.md and DECISION-REGISTER.md, and a stopgap that duplicates a ruling is a defect. Courts come after early access (AGENTS.md), so no judge, counsel scene or court screen is built here.

**Done when.** The row is resolved in stopgaps.json citing the ruling, the marker is gone from housing.ts, and `src/core2/housing.test.ts` still shows a played eviction in a test place going from notice to filing to removal by case record id.

**Files.** src/core2/modules/housing.ts, src/core2/data/stopgaps.json

**Notes.** Oct 19 (claude/hearing-ruling). The counsel payment and payment-plan steps stay as they are; they are not a court scene. Sent-back PR #4146 also deleted them; that is a separate design question, not part of this ruling.
