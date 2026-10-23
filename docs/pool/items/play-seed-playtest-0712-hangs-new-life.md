---
id: play-seed-playtest-0712-hangs-new-life
title: "Seed playtest-0712 hangs New life."
area: play
kind: feature
priority: 2
status: done
claimed-by:
pr: #4430
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/play.md line 87 (unchecked checklist line)"
---

**What.** Seed `playtest-0712` hangs New life. On this evening's head it fails in 67 s with a two-level collapse error instead (see Needs, CORE and WORLD).

**Rules.** AGENTS.md rules; an effect is a read; nothing waits on another session.

**Done when.** Built and read by another engine in a one-year played-world run, by record id; or verified done on main and marked done.

**Files.** see the status file

**Notes.** Checklist line from play.md; verify against main before starting.

Verified Oct 15 by a Claude session on main at 054c429ecd: the seed `playtest-0712` builds through every New life stage (people, past, economy, core, government, opening) in 6.9 seconds, in Cold Bay, Alaska, with 1,573 people and no error. Neither the hang nor the two-level collapse error reproduces, so the line is done. The check built the world only; it did not play a year.
