---
id: people-fill-in-keeps-job-tenure
title: "A counted worker filled in as a full person keeps the tenure their records already give them"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #6024
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** When a counted worker is filled in (src/core2/state.ts, the fill-in's work commitments), their work commitment starts on the day of the fill-in, and tenureYears (src/core2/modules/jobs.ts) reads that start. Their tenure drops from what countedTenureYears gave them the day before to zero. Layoffs (tenure plus how they work) and the yearly raise's tenure part both read it, so a filled-in worker is laid off first and is raised on the tenure profile's steepest year. A filled-in person must match what the records already say (AGENTS.md, two-level population). Found Oct 25 by the traits lead's pay-growth helper.

**Rules.** One model, two tiers: the full person's tenure equals the counted tenure they had. Wire to the world: proven in a generated world by record id.

**Done when.** In one year of buildBenchWorld in a place drawn from all 56, seed named, a counted worker filled in mid-year keeps the tenure countedTenureYears gave them the day before (a test names the person and both values), and a test fails when the commitment's start is the fill-in date.

**Files.** src/core2/state.ts, src/core2/modules/jobs.ts

**Notes.** Filed by the traits lead from claude/traits-pay-growth.
