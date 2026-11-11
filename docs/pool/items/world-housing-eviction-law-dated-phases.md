---
id: world-housing-eviction-law-dated-phases
title: "A place's eviction steps change on the day its new eviction law takes effect"
area: world
kind: feature
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The housing engine reads one undated row of eviction steps per place from src/core2/data/housing/housing.json, so a statute that changes the notice, cure, hearing or stay after the game opens on January 20, 2025 can never take effect. The research already records such changes as dated laterLaw rows in data/research/world/eviction-statute-reads-2026.json: Hawaii's notice goes from five business days to ten calendar days on February 5, 2026 and back on February 4, 2028, Texas requires a pay-or-vacate notice and a statutory trial window from January 1, 2026, and the District's notice drops from 30 to 10 days and its summons from 30 to 14 days on December 31, 2025. Give the eviction table dated phases the way src/core2/data/laws/starting-law.json rows carry effectiveDate and endDate, and have the steps read when a notice is served use the phase in force on that day.

**Cause.** Found in code: src/core2/data/housing/housing.json holds one undated eviction row per place (the "eviction" key) read by src/core2/modules/housing.ts (the `EVICTION` table, line 123); the dated laterLaw rows exist only in data/research/world/eviction-statute-reads-2026.json.

**Fix.** Give the eviction table dated phases read by one date rule in src/core2/modules/housing.ts, record the phase each case followed, and check the phases against the research file with scripts/research/housing-check.ts.

**Time box.** 6 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: phases are data rows for every place, read by one date rule, never a state named in logic. An effect is a read: an eviction case must record the phase it followed, and a law the player passes through the laws engine later should replace the place's phase the same way. Estimate, never UNKNOWN: a place with no later law keeps its single phase.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) and sees an eviction case's law record name the phase in force on its notice date by record id; a test in src/core2 serves notices before and after a dated phase in one drawn place and gets each phase's days; scripts/research/housing-check.ts checks the phases against the research file. On screen: nothing yet; it would show on Politics, Issues and Government, and nothing there reads it.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/housing.json, data/research/world/eviction-statute-reads-2026.json, scripts/research/housing-check.ts, src/core2/data/laws/starting-law.json

**Notes.** TODO

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have dated eviction steps by statute change; no player sees the notice or hearing days.
