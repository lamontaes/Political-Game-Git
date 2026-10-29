---
id: core-serving-terms-read-once
title: "Which offices a person serves has one reader in the offices engine, not copies in justice, the scene picker and the person card"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/dup-serving-offices
pr: #6482
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:15:12.845Z
---

**What.** The offices engine kept a private servingTermsOf, justice-law.ts exported an identical public one, and the bench's scene picker (servingOfficeKinds, isOfficial, officeKinds) and person card (servingOffices) each queried the terms table for serving rows again. Five readers of one fact, each with its own guard or none (duplicates report rows M5 and C6).

**Rules.** One source per fact (owner, Oct 27): the offices engine owns its terms, so it exports the one reader and the justice engine and the screens call it; the copies are deleted with no alias.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, every officeholder's person card, 200 people's scenes and the whole durable log are identical on main and on this branch on day one and a year on by fingerprint, the justice tests pass, and grep finds one servingTermsOf in src.

**Files.** src/core2/modules/offices.ts, src/core2/justice-law.ts, src/core2/modules/justice.ts, src/bench/scene.ts, src/bench/card.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6482 merged (the done flip failed while branch protection refused the flip job's push).
