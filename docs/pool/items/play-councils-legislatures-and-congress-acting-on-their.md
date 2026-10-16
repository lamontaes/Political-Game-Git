---
id: play-councils-legislatures-and-congress-acting-on-their
title: "Councils, legislatures and Congress acting on their own (world-legislating)."
area: play
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/play.md line 75 (unchecked checklist line)"
---

**What.** Checked against main on Oct 16: The legislating module is switched on in the bench (`openWorldLegislating` in src/bench/world.ts); no off switch remains. What is unverified is speed: there is no `speed:year` script, and the slowdown after sessions was never measured. Next: Measure and cut the post-session slowdown. The player would see it as a choice among people, never a form.

**Rules.** Speed: a town's game year runs in under two minutes and the module may not add more than 20% to its base, measured before and after on the same machine, one process at a time; also never scan the whole world or history every day; use indexes or act on the day something changed; An effect is a read, not a record: other engines read the laws it passes; Wire to the world: it moves laws and money in a generated world and covers every body; No dice: bodies act from members' reasons and the calendar, not a roll; Replace, never layer: the bench's off switch and its workaround are deleted when it is on; One rule, all 56 places: no place named.

**Done when.** A `speed:year` script exists, and in a drawn place (buildBenchWorld, seed named in the PR body) one year with the module runs within 20% of the same world without it, one process at a time on one machine. The owner plays it: Measure and cut the post-session slowdown.

**Files.** src/core2/modules/world-legislating.ts, src/bench/world.ts, src/bench/world-modules.test.ts, scripts/core2-year/

**Notes.** Checklist line from play.md; verify against main before starting.
