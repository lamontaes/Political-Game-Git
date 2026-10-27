---
id: research-bribery-incidents-measure
title: "A real bribery measure to check played bribe counts against"
area: core
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** PR #6053 measured bribes offered, taken, surfaced and reported in four played worlds, but the only real series it had (Justice Department Public Integrity Section officials charged with any public-corruption offense, data/research/corruption/doj-pin-2023-local-state-prosecutions.json) counts officials, not bribe incidents, and mixes bribery with extortion, fraud and other offenses, so it is only an exploratory proxy. Find a bribery-specific measure (for example federal sentencing counts for the bribery guideline, or state charges for bribery of public officials) per government or per state-year, with its source and spread.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. Follow .agents/skills/researcher/SKILL.md.

**Done when.** A research note under data/research gives a bribery-specific rate with its source, quote and spread, and scripts/research/bribe-chain-years.ts prints played counts against it.

**Files.** data/research/corruption/,scripts/research/bribe-chain-years.ts

**Notes.** TODO
