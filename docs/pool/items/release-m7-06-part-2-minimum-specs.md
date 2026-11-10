---
id: release-m7-06-part-2-minimum-specs
title: "M7-06 part 2: minimum specs measured on the year speed run and the desktop package"
area: release
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: none
milestone: M7
source: split from release-m7-06-steam in the pool redo, Nov 10, 2026
---

**What.** Measure the machine the game needs: run npm run speed:year and the desktop package on the smallest machine available and record time, memory and disk, so the store page can state minimum specs.

**Cause.** Design: docs/roadmap/later-specs-draft.md section M7-06 (approved by the owner Oct 12) and docs/packages/M7-early-access.md.

**Fix.** Run npm run speed:year one process at a time on the desktop package's target machines, record time and memory per year, and write the minimum specs as measured figures with the machine named.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Speed: a country's year runs in under two minutes on npm run speed:year, one process at a time. One run, one number: no repeat medians unless a result is disputed.

**Done when.** A second session reruns npm run speed:year on a machine of the stated minimum class, in a drawn place and seed, and finds the year time and memory within what the store page states. Report the real figure next to it.

**Waits on.** Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** docs/packages/M7-early-access.md, docs/roadmap/later-specs-draft.md, desktop/README.md
