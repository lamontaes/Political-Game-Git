# Overnight Ultra Code — Progress & Durable State

**Run:** Opus 4.8 + Ultra Code, overnight full-project audit (2026-09-05).
**Branch:** `claude/overnight-narrative-audit-harness` (isolated worktree off accepted `main`).
**Base:** `main` = `54ec313953007c7755a8d95b15456a22e996fa90` (merge of #88 on #77/#87).
**Rules in force:** additive only · NO merges · NO deletions · #91 is read/audit context only.

This file is my own working memory so the run survives context compaction. It is also a deliverable.

## Ground truth (refetched live at run start)

- `main` = `54ec313` — not checked out in any other worktree (safe to branch from).
- **#91** OPEN, not draft, MERGEABLE, head `2e3dc0b`, +3960/-677, 43 files. CI `validate` job = **pass** (run 33949448271). NOTE: `npm run validate` does NOT include Playwright e2e, so the passing check is not proof the e2e suite passed. Human play = "core scene-shell pass / directional win" but semantic/UX repair required before merge.
- Open PRs: #91 (presentation/New Game/formative/Start-Anywhere), #90 (draft, stacked on #89), #89 (draft, garment-morphology — the worktree this session started in), #85 (campaign/first-election), #84 (causal-trace), #83 (declarative-content), #79 (legislative-bargaining).
- 91I intake locked decisions consumed: Option A write authority; #91 read-only; produce "stable of stuff"; both prose deliverables (machine + printable); real + future-probe transcripts; opening epistemic exception; age-dependent catch-up; distinct visual Create Character; historical start then divergence; not-a-clicking-simulator; forever-unfurling tutorial.

## Key architectural findings (grounding)

- Narrative realization lives in `src/presentation/life-story.ts` (projectStoryMoment / chooseStoryOption / traceStorySelection), `life-narration.ts` (connective + steady-state + thread recaps), `life-diagnostics.ts` (dev report). Content banks: `src/simulation/episode-bank.ts` (EPISODE_FAMILIES), `adult-situations.ts`, `formative-play.ts`/`formative-context.ts`, `adult-life.ts`, `conversation-subjects.ts`.
- **Canon↔realization boundary is real and enforced:** connective sentences carry `sources` with record ids; `life-opacity.test.ts` bans dev vocabulary and forecast wording from every player surface. Corpus lint confirms 0 unbacked-connective, 0 unintroduced-person.
- New Game matrix inputs (on main): places = kentucky, nebraska, alaska, lexington-fayette (4; #91 adds nationwide). gender = female/male/nonbinary/unstated. questionnaire = skipped/short/deep. depth = play-formative-years/summarize-earlier-life. household = lives-alone/shares-a-home. startAge 5–70 (**birth/age-0 NOT supported** — MINIMUM_START_AGE=5). legislative-office needs age≥21 + place capability (lexington has none).

## Deliverables completed so far

1. **Deterministic playthrough harness** — `src/presentation/playthrough-transcript.ts` (pure; runPlaythrough / transcriptToMarkdown / transcriptToInventory / narrativeLint / choosers). Test: `playthrough-transcript.test.ts` (14 assertions pass). Extended `life-opacity.test.ts` import-ban to cover it.
2. **Matrix corpus generator** — `scripts/narrative-corpus.ts` + `npm run corpus:narrative`. Output in `docs/overnight-audit/corpus/`:
   - `transcripts.md` (27 lives, 260 beats, readable)
   - `prose-inventory.json` (443 distinct strings, 2023 instances, durable ids S-/C-/N-/T-####)
   - `lint-summary.md` (418 findings)
3. Verified: typecheck clean, eslint clean, prettier clean, harness tests green.

## Headline narrative findings (from the corpus)

- **93% of lint findings are machine-cadence + repetition** (220 + 91 + 76 = 387 / 418), localized to `life-narration.ts` steady-state lines (`School carried on…`, `The house went on being…`, `Kentucky went on as it does…`) and the tiny elapsed-phrase vocabulary (`A month later.` ×97, `A couple of weeks on.` ×42).
- **Age mismatch:** episode families (e.g. "someone-is-not-all-right", "the corridor") fire identically at age 5 and age 10 — content is not scaled to young ages.
- **Gender-neutral name corpus** produces player-visible dissonance: "Ibrahim Rocha, your older sister … she asks you." (design-intentional; owner decision needed).
- **Formative bank is vague** ("the thing that was planned", "the thing you signed up for") while **episode families are concrete and good** (the little-brother thread and corridor thread show real cross-beat continuity + visible consequence — positive house-style evidence).
- What works (clean): consequence visibility, people-presence/introductions, canon↔realization boundary, no dev/forecast leakage, no adult vocab to under-13s.

## TODO (remaining sections)

- [ ] Owner printable prose-review packet (HTML from prose-inventory.json) — durable IDs, GOOD/AWKWARD/BAD/WRONG-CONTEXT/REPETITIVE marks.
- [ ] Narrative style/quality authority doc (project-specific, derived from corpus).
- [ ] Operating-mode audit (how Claude has been used) + current best-practice research (first-party vs community) + safe improvements.
- [ ] Future-system / backlog reconciliation map (consume subsystem-map workflow + Drive idea inbox / future-systems / roadmap).
- [ ] Graphics/menu readiness map (consume ui-graphics subsystem map + #91 diff).
- [ ] "Stable of stuff" owner action board (READY NOW / AFTER MERGE / SMALL BUG / RESEARCH / HUMAN-PLAY GATE / BLOCKED).
- [ ] Owner Morning Brief + completion report; write completion artifact to Drive.
- [ ] Static extraction of full authored banks (not just runtime-hit strings) for 100% prose coverage.
