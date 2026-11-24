---
id: gov-state-vacancy-appointments-player
title: "A governor fills a vacant state office by appointment, asking the person first"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: S6 (brief J, asking someone to serve), Nov 14 2026
standard: 2
model: opus
effort: medium
root: none
---

**What.** When a state office falls vacant and the state's law has the governor fill it, a player who is governor has nothing to fill today. The vacancy should open a pick the player makes by asking, with confirmation where the law requires it. The world's governors pick by the same ranking. Seen: the governor's desk and the ask-to-serve scene.

**Cause.** Found in code: `succession.ts` (src/core2/modules/succession.ts) handles only the vice presidency; a state office that falls vacant (lieutenant governor and others the state's law has the governor fill) has no appointment row the player holds (brief J report, Nov 14).

**Fix.** A research row per state for which vacancies the governor fills and whether the senate confirms; the vacancy opens a pick the player makes by asking (serve-sought scene), the world's governor picks by the same ranking.

**Time box.** 6 hours for one opus session.

**Rules.** No dice: an answer comes from the person's record. One rule, all 56 places.

**Done when.** A second session, in a drawn place with a seed it did not choose, plays it in the running game: In a drawn state, a vacancy the state's law has the governor fill opens for the player as governor; they ask, a yes seats the person, and a confirming body votes where the row says.

**Waits on.** nothing.

**Files.** src/core2/modules/succession.ts, src/core2/modules/executive.ts
