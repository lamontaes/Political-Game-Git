---
id: core-country-tier-town-joins-its-state-part-4-the-town-counts-inside-its-state
title: "The town joins its state, part 4: the town's people, jobs and dollars are part of its state's sums, counted once"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: high
root: design-country-tier
source: split from core-country-tier-town-joins-its-state by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
---

**What.** The country tier opens each state from its published totals and steps it by the month. The played town and its county are simulated in full beside it. The state's totals already include the town's people, so they are held twice, and nothing that happens in the town moves its state's figures.

**Cause.** Found in code: nothing in src/core2/country-model.ts or src/core2/modules/macro.ts reads the town's households or businesses when a state is stepped (the only read of people is the bank board's members, macro.ts line 488), and the outlook's own comment says the town's own people are not in it (macro.ts line 852, above `countryOpened`).

**Fix.** Each month, before a state steps, take the played town and its county out of the state's cells by their own counts (people by age band, workers, jobs by sector, cash), step the rest as today, and publish the state's figures as the rest plus the town's own records. Keep the town's part as one bounded row per state per month. A small town is a tiny share of its state, so the test scales the town up with the bench's population scale to make the share visible.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One model, two tiers: the state's cells and the town's records are read by the same rules. Speed: the town's part is summed on the month's first day from indexes the residents engine already keeps, never by walking all history. Replace, never layer.

**Done when.** A second session, on main in a drawn place it names with its seed, opens dev mode's Trace on the state's record (`country-state:` and the state's postal code): it shows the town and county's part and the rest, and they add to the state's total for people and jobs. A test in two twin worlds closes the town's largest employer in one and reads the state's jobs lower by about that employer's jobs a month later.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/modules/macro.ts, src/core2/modules/residents.ts, src/bench/metrics.ts
