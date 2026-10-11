2026-10-11 — R18: data/research/elections/roadmap-r18-administration-2024.json + 0 request answers; coverage 56 EAVS jurisdictions, plus 51-place CPS voting survey; gaps current voting statutes, primary/local/off-cycle turnout and counting duration; terms questions none; model GPT-6 (Codex), effort not exposed, 58 seconds.

2026-10-11 — R17: data/research/campaigns/roadmap-r17-polls.json + 1 request answers; coverage U.S. national Pew survey practice; not all56 race-specific error; gaps mode/race-level sample frequency and internal-poll house effects; terms questions AAPOR report commercial reuse not established; no coefficients adopted; model GPT-6 (Codex), effort not exposed, 38 seconds.

2026-10-11 — R16: data/research/campaigns/roadmap-r16-effects-and-observed-margins.json + 6 request answers; coverage federal vote-share aggregates, 2024 House and 2020–2024 Senate; local canvassing experiment archive; gaps licensed effect sizes, contact productivity, local distributions and newcomer penalties; terms questions Cambridge article reuse not established; noncommercial studies excluded; model GPT-6 (Codex), effort not exposed, 80 seconds.

2026-10-11 — R15: data/research/elections/roadmap-r15-candidate-pools.json + 0 request answers; coverage U.S. Congress aggregate membership 116th–119th; territories only where CRS includes delegates; gaps state/local candidacy, contest/open/retirement counts and population comparisons; terms questions none; model GPT-6 (Codex), effort not exposed, 38 seconds.

2026-10-11 — R14: data/research/campaigns/roadmap-r14-finance.json + 4 request answers; coverage federal committees nationwide; MN/NE statute observations only; gaps other 54 campaign-finance regimes, cost/category distributions; terms questions USPS commercial reuse of site content unclear; no postal price adopted; model GPT-6 (Codex), effort not exposed, start time not captured; completion timestamp in data.

2026-10-11 — R13: data/research/elections/roadmap-r13-calendars-2026.json + 6 request answers; coverage 56 jurisdictions for 2026 congressional dates; federal qualifications in 50 states; municipal statutory examples ME/AZ and FL incompatibility only; gaps 2028 primaries, complete state-office rules and five-kind local samples remain unverified; terms questions candidate-guide web prose not licensed; GA annotated supplement excluded; model GPT-6 (Codex), effort not exposed, start time not captured; completion timestamp in data.

2026-10-11 — SETUP BLOCKED: destination audit; 0 research files written; 0 places researched; 23/28 topics have missing required folders under Rule 3; no source-terms questions; model GPT-6 (Codex), effort not exposed by runtime, setup about 10 minutes; no topic completed.

# CODEX-RESEARCH-2 handoff

The setup blocker below is historical: resolved by #3971, merged 2026-10-11 before R13. Startup bench is now explicitly skipped for research.

Base: `main` at `19767f3c0b1f043297c9301d5f30a89982a70f6d`. Branch: `pool/research-roadmap-2`.

## Contract

Research only for Priorities 2, 3, 3b and 4 (R13–R40). Add derived source-backed tables only at the roadmap destinations; answer each matching request in place; prepend a topic line to this log and the draft PR, then commit and push after every topic. Record terms, retrieval date, place coverage, estimates, model, effort and elapsed time. Do not change `src/`, use excluded sources, collect real people’s names, or enter other sessions’ owned folders. Validate request records, formatting, file size and provenance.

## Destination prerequisite

[Roadmap Rule 3](ROADMAP-RESEARCH.md) says: “the folder each topic names below, new files only in folders that already exist.” The fresh fetched main has the following missing required destinations. Existing similarly named directories are not the prescribed destinations. Creating these folders or silently redirecting findings would depart from the instruction to follow the rules exactly.

| Topic | Missing required destination |
| --- | --- |
| R14 | `data/research/campaigns/` |
| R16 | `data/research/campaigns/` |
| R17 | `data/research/campaigns/` |
| R19 | `data/research/parties/` |
| R20 | `data/research/news/` |
| R21 | `data/research/legislatures/` |
| R22 | `data/research/legislatures/` |
| R23 | `data/research/public-costs/` |
| R24 | `data/research/implementation/` |
| R25 | `data/research/executive/` |
| R26 | `data/research/executive/` |
| R27 | `data/research/interest-groups/` |
| R28 | `data/research/constituent-cases/` |
| R29 | `data/research/corruption/` |
| R30 | `data/research/direct-democracy/` |
| R38 | `data/research/crime/` |
| R39 | `data/research/constitutions/` |
| R31 | `data/research/speech-sources/` |
| R32 | `data/research/talk/` |
| R34 | `data/research/offices/` |
| R35 | `data/research/succession/` |
| R36 | `docs/research/release/` |
| R37 | `data/research/licenses/` |

Existing destinations cover R13, R15, R18, R33 and R40. Those topics remain pending, not completed or answered. This audit is not a missing factual source and supplies no research estimates. No request records were changed.

## Execution evidence

- Clean checkout; fetched main and created the requested branch without making another repository copy.
- `npm run agent:preflight` passed; registered the existing workspace using `OCD_STORAGE_STATE_DIR=/workspace/.ocd-dev` and `OCD_MANAGED_ROOT=/workspace` because the default `/home/agent` directory is absent. No storage limits were changed.
- `OCD_STORAGE_STATE_DIR=/workspace/.ocd-dev npm run storage -- run test -- npm run test:run-a` failed before running tests: `vitest: not found`. Dependencies are not installed. This is an environment failure, not evidence of a game defect.
- No game code, factual findings, source licenses or completed-topic claims were added.

Resume from R13 after the destination prerequisite is resolved, then continue every assigned topic. The 209-request mapping is an index, not evidence that requests are answered.
