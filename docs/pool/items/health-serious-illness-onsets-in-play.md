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
after: people-health-full-deaths-below-life-table
blocked-on:
lead: laws
model: opus
effort: high
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** No one in a played year falls seriously ill or goes to prison, so the news of it never reaches a family. Lane 3 counted a year of Cabo Rojo, Puerto Rico (replay f857db7436bf7449, every full person watched): the durable log held 5 life.death, 0 health.serious-illness and 0 justice.imprisoned, and the ledger labels held 3 person.moved-away and none for illness or prison. Six drawn small towns showed none either. The director's illness-news and prison-news talk, and the questions after them, never play. Seen: news of an illness or a prison term reaching a family, in talks and the Journal.

**Cause.** Measured: `node --import tsx` with a probe outside the repository that taps every event for one year of `buildBenchWorld` on main 061eda78. Jamaica, Vermont (5036100, seed cf-c-ill-1) had 898 full people and 7 `health.serious-illness` onsets in the year. Six were officials of other places (for example health.serious-illness:official:seat:US-ID:us-senate:0:2025-06-29), held as calendar rows, and none of those is kept in the durable log. One was a town resident, health.serious-illness:person_25d45781e02fe855:2025-11-11, heard by 5 people. Mulford, Colorado (0852820, seed cf-c-ill-2) had 841 full people and 0 resident onsets; all 8 were officials elsewhere. So Lane 3's count of zero read the log, which holds only resident onsets, and resident onsets are about one a year in a town of this size. Found in code: (1) every onset is the start of a fatal illness. `hearBookedDay` in src/core2/modules/health.ts (about line 1128) gives each onset a `deathDate` from `remainingDaysAfterOnset`, and data/research/health/chronic-condition-pack-2026.json holds no incidence or survival figures. So onsets can only be as many as the deaths, which already run below the life table for full people (people-health-full-deaths-below-life-table). A serious illness that someone lives through does not exist. (2) A counted person filled in while already ill (`carryCountedIllness`, about line 968) carries an onset id but emits no onset, so their family only ever hears of the death. (3) Prison: no ordinary person can be imprisoned. Crimes have no offender (stopgap SG-CORE-crime-offenders) and arrests are counted shares (SG-CORE-crime-arrests), so `justice.imprisoned` (src/core2/modules/justice.ts line 1281) comes only from corruption cases. Neither draw had any `justice.*` record. That half waits on justice-one-crime-system.

**Fix.** Add serious illnesses that people survive, through the health engine that already books fatal ones, for both tiers. (1) Research: source the yearly incidence by age of the serious illnesses the condition pack names (for example new cancer diagnoses, heart attacks and strokes) and the share who survive the first year. Add them to data/research/health/chronic-condition-pack-2026.json with citations, as ESTIMATED values with their spread. (2) In src/core2/modules/health.ts, book an onset from the same causes and condition weights the fatal cases read, with no roll. Give it a recovery date instead of a death date when the person's own case is not fatal, and write the same `health.serious-illness` event, so the director, the Journal and the five situation types that read it need no change. (3) A counted group's survived illnesses are tallies times its weight, as its fatal ones are. (4) Real incidence checks the totals; it never picks the person. Report the year's onsets beside the expected count. Do not touch the prison half; it is checked under justice-one-crime-system.

**Time box.** 8 hours for one Opus session, about two of them research. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: an illness begins from the health record's causes, never a monthly chance, and real rates check totals (one model, two tiers). One rule, all 56 places: the town is drawn and named. Ask why: an onset names the health record that caused it.

**Done when.** A second session, not the builder, runs a one-year `buildBenchWorld` in two drawn places (places and seeds named), Jamaica, Vermont (seed cf-c-ill-1) among them. Full people's serious-illness onsets are printed next to the expected count for the population with its source, and are above zero in each. At least one survived onset is named by record id with its cause and recovery date. At least one onset reaches a relative's ledger as feeling:event:health.serious-illness.

**Waits on.** people-health-full-deaths-below-life-table, which refits the fatal onsets to the life table first; justice-one-crime-system for the prison half.

**Files.** src/core2/modules/health.ts, src/core2/data/health.json, data/research/health/chronic-condition-pack-2026.json, src/core2/death-cause.ts

**Notes.** Filed by Lane 3, Nov 4, while building words-news-ask-gets-answer (branch lane3/questions-get-answers). Lane 2 owns health.ts; Lane 3 reads the record.

Nov 11 (cause finder for Fable B): counted onsets by tapping every event in two drawn one-year worlds, not by reading the log. Illness news is rare because the only serious illness the game has is the one that kills, and full people already die below the table. Prison news cannot happen until crimes have offenders. Proposed: build illness that people survive here, after the mortality refit, and leave prison to the crime-system items.
