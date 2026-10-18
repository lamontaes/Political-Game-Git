---
id: world-worker-unpaid-four-months
title: "A worker earns $2,092 over 120 days and is paid nothing: their employer pays no wages (La Liga, Puerto Rico, seed 4b22c467924caecf)"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/worker-unpaid-four-months
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T00:04:58.775Z
---

**What.** A worker earns about $2,092 over 120 days and is paid nothing, because the employer holds no cash and no pay link. A check now lists, for any drawn place, every employer whose wage flows paid nothing at their last payday. In six drawn towns the unpaid employers were the town's government departments, the state offices, the post office and the public school district. The opening links only recorded county government accounts to a pay authority, so every other public employer has none and no cash.

**Rules.** The fixes already have their own items and pull requests: world-public-employer-staff-never-paid (#4984), world-public-school-staff-never-paid and world-private-zero-cash-employers-never-pay. This item adds only the check. Run it after each of those lands; an employer that still shows paid nothing is a new defect.

**Done when.** `node --import tsx scripts/core2-year/wages-unpaid-check.ts <seed>` prints no public or private employer paid nothing at its last payday in a drawn place.

**Files.** scripts/core2-year/wages-unpaid-check.ts

**Notes.** Evidence: Coldwater, Michigan, seed w2: 1 of 40 organizations has a pay authority; the public school district asked 303,637 per payday for 108 counted jobs and paid nothing. La Liga, Puerto Rico, seed 4b22c467924caecf: person_688586e39370083b, employer organization_62f157e3f7d6d4ca.
