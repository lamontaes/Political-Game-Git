---
id: skills-lessons-auto-update
title: "Skills update themselves: a scheduled job turns every failure seen twice into a skill line, as a PR the CTO merges"
area: docs
kind: feature
priority: 1
size: M
status: done
claimed-by:
pr: #6291
blocked-on:
source: "owner, Oct 27, to the CTO"
lead: cto
milestone: play-first
claimed-at:
---

**What.** The owner, Oct 27: "there needs to be a skill or something where skills are being made or updated. When problems keep popping up, a skill is updated so it stops popping up... if something gets fixed at 3 a.m. and something gets updated at 4 a.m. and three errors keep happening at 5, 5:30 and 5:32, a skill would be automatically updated. Look how Anthropic and OpenAI use skills. They have thousands." This item is the standing job: every 4 hours a Sonnet session runs the `skill-lessons` skill, reads the window's merger send-backs, red runs, owner stops and reopened items, groups them by cause, and for each cause seen twice writes the line into the skill that should have prevented it (or a new skill), mirrored and tested, as one PR with a table of lessons. The CTO merges it on its pass. The job is a scheduled task on the CTO's account (created Oct 27); this item carries its definition and its first week's report.

**Rules.** Serves AGENTS.md "Keep it simple" (one job, one PR) and `.agents/rules/smart-and-look-first.md` (a lesson restates a ruling or standing rule as a check; it never makes policy, never touches AGENTS.md, OWNER-DECISIONS.md, the rules folder or LAW.md). Replace, never layer: a lesson that lands in the wrong skill is moved, not duplicated.

**Done when.** The scheduled task exists and has fired at least six times; at least three `skills: lessons` PRs are merged, each whose table names two occurrences per lesson by PR number or run id and the skill line added; `npm run test:skill-ops` passes on each; a one-page `docs/reports/skill-lessons-week-1.md` lists every lesson landed and, for each, whether the cause recurred after it landed (the measure of the job).

**Time box.** 1 hour to set up (done by the CTO on Oct 27); 45 minutes per firing; the week's report 1 hour.

**You will see.** The same mistake stops happening twice: a send-back reason from the night is a rule the next morning, and the skills folder grows from what went wrong.

**Screenshot.** Not a screen; the first merged lessons PR's table in this item's Notes.

**Files.** .agents/skills/skill-lessons/SKILL.md, .claude/skills/skill-lessons/SKILL.md, docs/release/changes/skills-lessons-*.md, docs/reports/skill-lessons-week-1.md

**Notes.** Owner, Oct 27 (OWNER-DECISIONS.md). Lead: cto.
