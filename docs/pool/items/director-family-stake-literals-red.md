---
id: director-family-stake-literals-red
title: "The director's no-literals guard is red on main: family-stake.ts holds numbers in code"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/director-family-stake-literals
pr: #6273
blocked-on:
lead: director
source: added with npm run pool -- add
claimed-at: 2026-10-27T09:50:02.186Z
---

**What.** src/director/director.test.ts ('registers every stopgap it marks and keeps numbers in data') fails on clean main since commit 1b64fb04d3. src/director/family-stake.ts, the relative-with-a-stake scene after a filing, holds sixteen numeric literals (86_400_000 ms a day, 365 days a year, 30 days a month, zeros and ones). Every PR that runs the director tests inherits the red. Move the date arithmetic to the kernel's date helpers and the month span into scene-talk-rules.json, and use the shared constants for zero and one.

**Time box.** 1 hour, Opus (director lead).

**Rules.** Every number lives in a parameter table (AGENTS.md, Placeholders). Red main comes first (owner, Oct 15). Replace, never layer.

**Done when.** src/director/director.test.ts passes on the PR head with family-stake.ts unchanged in behavior; src/director/family-stake-scene.test.ts and src/director/purpose-scenes.test.ts pass, run as one test file at a time.

**Files.** src/director/family-stake.ts, src/director/data/scene-talk-rules.json

**Notes.** TODO
