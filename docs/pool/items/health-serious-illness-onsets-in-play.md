---
id: health-serious-illness-onsets-in-play
title: "No one in a played year falls seriously ill or goes to prison, so the news of it never reaches a family"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Lane 3 counted a year of Cabo Rojo, Puerto Rico (replay f857db7436bf7449, every full person watched): durable log 5 life.death, 0 health.serious-illness, 0 justice.imprisoned; ledger labels 3 person.moved-away and none for illness or prison. Six drawn small towns showed none either (news-ask-answer.test.ts, seed 3099969225bcbf27). The director's illness-news and prison-news talk, and the questions after them, never play.

**Rules.** Sliding scales and causes: an illness begins from the health record's causes at real rates, never a monthly chance; real rates check totals (one model, two tiers). One rule, all 56 places.

**Done when.** In a one-year run of a drawn place (buildBenchWorld, every module), full people's serious-illness onsets occur near the sourced rate for its population (number printed against the expected with its source), and at least one reaches a relative's ledger as feeling:event:health.serious-illness, named by record id.

**Files.** src/core2/modules/health.ts, src/core2/data/health.json

**Notes.** Filed by Lane 3, Nov 4, while building words-news-ask-gets-answer (branch lane3/questions-get-answers). Lane 2 owns health.ts; Lane 3 reads the record.
