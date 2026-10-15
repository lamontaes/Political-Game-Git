---
id: play-seed-playtest-0712-hangs-new-life
title: "Seed playtest-0712 hangs New life."
area: play
kind: feature
priority: 2
status: in-pr
claimed-by:
pr: #4430
blocked-on:
milestone:
source: "docs/coordination/play.md line 87 (unchecked checklist line)"
---

**What.** Seed `playtest-0712` hangs New life. On this evening's head it fails in 67 s with a two-level collapse error instead (see Needs, CORE and WORLD).

**Rules.** AGENTS.md rules; an effect is a read; nothing waits on another session.

**Done when.** Built and read by another engine in a one-year played-world run, by record id; or verified done on main and marked done.

**Files.** see the status file

**Notes.** Checklist line from play.md; verify against main before starting.
