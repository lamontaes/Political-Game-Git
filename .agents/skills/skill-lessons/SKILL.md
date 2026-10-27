---
name: skill-lessons
description: Turns repeated failures in Our Civic Duty's crew into skill updates automatically. Reads the last hours of merger send-backs, red release runs, CI failures and owner stops, groups them by cause, and for any cause seen twice writes the line into the skill that should have prevented it (or a new skill), mirrored and tested, as one PR the CTO merges. Use on the scheduled skill-lessons job, in every CTO pass, and whenever the same error shows up twice in a day.
---

# Skill lessons

Owner, Oct 27: "when problems keep popping up, a skill is updated so it stops popping up... if something gets fixed at 3 a.m. and then something gets updated at 4 a.m. and then three errors keep happening at 5, 5:30 and 5:32, a skill would be automatically updated." Skills are the crew's memory. Anthropic and OpenAI run thousands; ours grow the same way, from what went wrong, not from what someone imagined. A lesson nobody wrote into a skill will be relearned by the next session at the same cost.

## The job (scheduled every 4 hours; also the CTO pass)

1. **Collect the last 4 hours of failures**, each with its cause in one line:
   - merger comments starting with `Merger` that contain "sent back" (`gh api repos/<repo>/issues/<n>/comments` over open and recently closed PRs; `gh api search/issues` is not available, so list PRs updated in the window and read their newest comments);
   - Release and PR workflow runs with `conclusion: failure` (`gh api repos/<repo>/actions/runs?branch=main`), the failing job's first `##[error]` and the `FAIL` line before it;
   - the owner's newest `docs/coordination/playtest/*.md` stops and the CTO section of the channel, for "again", "still", "keeps";
   - pool items set back to open with a Note in the window (`git log --since=4.hours -- docs/pool/items`).
2. **Group by cause, not symptom.** "ISO date on a player screen", "a test asserts a known defect", "two writers in one checkout", "the title rotation changed and the smoke check did not", "an owner question already ruled", "a stopgap without its code marker", "PROGRESS.md edited on a branch". Two or more in the window, or one that a skill already names and that happened anyway, is a lesson.
3. **For each lesson, find the skill** that should have stopped it: the role that made the mistake (`merger`, `pr-fixer`, `play-first`, `session-start`, `lead-session`, `words-engine`), or the standard it broke (`scene-standard`, `player-screen-text`, `screen-to-mock`, `scenes-from-life`), or a standing rule. If none fits, make a new skill with a one-paragraph trigger in its description. Write one or two sentences: the rule, the Oct date and the PR or run that taught it, in the skill's own voice. Never a paragraph of story; the skill is read at the start of every session.
4. **Mirror and test.** Copy `.agents/skills/<name>` to `.claude/skills/<name>` byte for byte; run `npm run test:skill-ops`; `npx prettier --write` the files; add `docs/release/changes/skills-lessons-<date>-<hour>.md` with `impact: none`.
5. **One PR**, title `skills: lessons <date> <HH:MM UTC>`, body line 1 `Pool item: skills-lessons-auto-update`, then the lessons as a table (cause, times seen, the PR or run, the skill and line changed), `Lead: cto`. The CTO merges it on its next pass; mergers never do (skills are the CTO's).
6. **Report** in the channel's CTO section is the CTO's; the job's output is the PR. A window with no repeated cause opens no PR and leaves no trace but its run.

## SMART shape

- Specific: the causes seen twice in the last 4 hours, each to one skill line.
- Measurable: the PR's table names each cause's two occurrences by PR number or run id and the skill line added; `test:skill-ops` passes; the mirror diff is empty.
- Attainable: no code changes; no new rules the owner has not ruled (a lesson restates a ruling or a standing rule as a check, it never makes policy).
- Realistic: Sonnet, no helpers, one pass.
- Time-bound: 45 minutes; a window that does not fit opens the PR with what is written and lists the rest.

## Never

- Change `AGENTS.md`, `OWNER-DECISIONS.md`, `.agents/rules/*.md` or `docs/play-first/LAW.md`: those are the owner's and the CTO's.
- Soften a rule, delete a lesson, or write a lesson from one occurrence (one is noise; two is a pattern; a third after the lesson landed means the lesson was written in the wrong skill, so move it).
- Narrate; the skill line is the output.
