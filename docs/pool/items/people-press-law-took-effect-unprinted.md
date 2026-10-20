---
id: people-press-law-took-effect-unprinted
title: "A town law that took effect is printed by no outlet in some towns, so no one can bring it up"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/pool-law-unprinted
pr: #4936
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T12:08:16.501Z
---

**What.** Golden-path step 10 needs the town's press to print a law taking effect and a reader to still hold the story. In the Oct 17 path-check sweeps (claude) a resident officeholder's bill took effect in many places (step 9) but step 10 was reached only in Deer Island, Oregon. Two causes, both found: (1) a local reporter ranks wire items by proximity, reader care, the people a story names and renown; a law taking effect names no one, so it scored at the floor (rank 13 of 16 in Kasaan, Alaska) behind meetings and executive actions, and each reporter files two stories a week; the desk now counts the followers a law reaches (the named followers the law-reach records name, every named follower where they hold none, plus the counted followers) as the people it involves. (2) A reader's memory of a story is forgotten after `newsMaxAgeDays` (30), so a check made 90 days after the law saw nothing; `path-check` now looks every week for 6 weeks, then at 60 and 90 days, and keeps the steps it saw.

**Rules.** No dice: a story's rank comes from who the law reaches and each reporter's own drives, never a roll. One model, two tiers: a counted follower is read by the same rule as a named one.

**Done when.** In the eight places that reached step 9 and not step 10 (seeds swcecb101c, sw86265759, sw888f7786, sw3ce50c81, sw4aa89205, swdddd3ccf, sw7f79358c, swa8b236bd) `path-check` reports step 10; `src/core2/press-law-reach.test.ts` draws a place and checks a law naming no one is ranked by the followers it reaches; it fails on main's desk.

**Files.** src/core2/press-desk.ts, src/bench/path-check.ts, src/core2/press-law-reach.test.ts

**Notes.** A law with no law-reach record counts as reaching every named follower (a law in force binds the town); where a law reaches only some people, the law-reach records decide. The opening's laws that take effect in the first weeks now also rank higher; not measured against the first-weeks story mix.
