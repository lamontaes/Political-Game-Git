---
id: health-serious-illness-onsets-in-play
title: "No one in a played year falls seriously ill or goes to prison, so the news of it never reaches a family"
area: people
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: none
source: added with npm run pool -- add
---

**What.** No one in a played year falls seriously ill or goes to prison, so the news of it never reaches a family. Lane 3 counted a year of Cabo Rojo, Puerto Rico (replay f857db7436bf7449, every full person watched): the durable log held 5 life.death, 0 health.serious-illness and 0 justice.imprisoned, and the ledger labels held 3 person.moved-away and none for illness or prison. Six drawn small towns showed none either. The director's illness-news and prison-news talk, and the questions after them, never play.

**Cause.** Needs cause. Measured by Lane 3 (Nov 4): Cabo Rojo, Puerto Rico, replay f857db7436bf7449, one year with every full person watched; six drawn small towns (Lane 3's news-ask-answer test, seed 3099969225bcbf27, which is not on main). Not yet looked at: whether src/core2/modules/health.ts starts an illness at all for full people at these town sizes, or starts it and nothing writes the `health.serious-illness` event the director reads.

**Fix.** None until the cause is found.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: an illness begins from the health record's causes, never a monthly chance, and real rates check totals (one model, two tiers). One rule, all 56 places: the town is drawn and named. Ask why: an onset names the health record that caused it.

**Done when.** A second session, not the builder, runs a one-year `buildBenchWorld` in a drawn place (place and seed named, Cabo Rojo and f857db7436bf7449 as the repro). Full people's serious-illness onsets are counted and printed next to the expected count for the population with its source (a figure to report), at least one onset is named by record id with its cause, and at least one reaches a relative's ledger as feeling:event:health.serious-illness.

**Waits on.** Nothing.

**Files.** src/core2/modules/health.ts, src/core2/data/health.json

**Notes.** Filed by Lane 3, Nov 4, while building words-news-ask-gets-answer (branch lane3/questions-get-answers). Lane 2 owns health.ts; Lane 3 reads the record.
