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
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
---

**What.** A played-world measurement of bribes offered, taken, surfaced and reported was made in four played worlds, but the only real series it had (Justice Department Public Integrity Section officials charged with any public-corruption offense, data/research/corruption/doj-pin-2023-local-state-prosecutions.json) counts officials, not bribe incidents, and mixes bribery with extortion, fraud and other offenses, so it is only an exploratory proxy. Find a bribery-specific measure (for example federal sentencing counts for the bribery guideline, or state charges for bribery of public officials) per government or per state-year, with its source and spread.

**Cause.** Design: docs/research/core-parameter-sources-2026-10-12.md shows the research wanted (a sourced figure with year, unit and spread); the only series in data/research/corruption/doj-pin-2023-local-state-prosecutions.json counts officials charged with any corruption offense, not bribery incidents.

**Fix.** Find a bribery-specific count per state-year, record it in data/research/corruption/ with source, quote and spread, and make scripts/research/bribe-chain-years.ts print the played counts beside it.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Follow .agents/skills/researcher/SKILL.md.

**Done when.** A second session runs scripts/research/bribe-chain-years.ts in a drawn place (name the place and seed) and reads the played counts of bribes offered, taken, surfaced and reported printed beside the bribery-specific count for the same state-year, with the research note under data/research/corruption/ giving its source, quote and spread. The real count is reported next to the played one and is not a pass mark.

**Waits on.** Nothing.

**Files.** data/research/corruption, scripts/research/bribe-chain-years.ts

**Notes.** TODO
