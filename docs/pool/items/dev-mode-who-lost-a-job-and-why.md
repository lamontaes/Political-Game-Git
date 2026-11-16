---
id: dev-mode-who-lost-a-job-and-why
title: "Dev mode cannot show who lost a job and why, beyond one named person"
area: play
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
source: Laws thread's dev-mode gap list from the three industry-law traces and the Account lead's industry report (/mnt/project-files/laws/reports/dev-mode-gaps-from-industry-traces.md); filed on the lead's ruling, Nov 16, 2026, under the owner's rule of Nov 16 that whatever a session traces by script dev mode should show
model: sonnet
effort: medium
root: rc2-done-from-records
---

**What.** Dev mode can lay off one named person (`forceLayoff`) and show it, but not the counted workers a business let go, nor everyone a closing put out of work, nor the cause. The tracers read the jobs engine's changes table by script to find who lost work at Center, North Dakota and Thief River Falls, Minnesota. A law that costs jobs cannot be followed to the people it cost. Seen: dev mode in the running game, which has no list of job losses.

**Cause.** Found in code: `forceLayoff` in src/bench/dev-mode.ts (line 1261) handles one full person; the jobs engine's changes table records counted and named job losses with no dev mode reader. Measured: Center, North Dakota (3813180), seed ilt-3813180 (farms-mines-energy.md finding 12) and the factories-freight.md closing traces.

**Fix.** A dev mode view of job losses in a period, read from the jobs engine's changes table: who (named people and counted groups with their counts), which employer, and the cause on the record (a closing, a staff cut, a law's cost). It writes nothing.

**Time box.** 4 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, advances past a business's staff cut or closing and opens the job-loss view: it lists the named and counted workers who lost work with the employer and cause, by record id, and the counts match the employer's staff change.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-api.ts, src/bench/data/controls.json
