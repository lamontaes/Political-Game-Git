---
id: core-every-life-simulated
title: "Every life is simulated: relatives and acquaintances who live elsewhere live their lives at low intensity, through the same engines, with dated records"
area: core
lead: lives
kind: bug
priority: 1
size: L
status: open
claimed-by:
pr:
after:
blocked-on: core-every-life-partners, core-every-life-partner-from-counts, core-every-life-work-dead-rows, core-every-life-simulated-part-1-births-for-couples-elsewhere, core-every-life-simulated-part-2-five-year-acceptance
source: owner, Nov 1 ("EVERY. LIFE. IS. SIMULATED. WHAT DO YOU NOT UNDERSTAND. THIS IS LOW INTENSITY STUFF")
claimed-at:
standard: 2
model: opus
effort: high
root: rc1-world-outside-town
---

**What.** The people the player knows who live elsewhere (most of the relatives at the start, the "husks") are kept minimal until met, and nothing happens to them, so a talk with one has nothing on record and opens empty: 12 of the 14 people the player knew in Lordship, Connecticut (`words-talk-husk-acquaintances-empty`). The owner rules that every life is simulated, at low intensity for people outside the played town. This item gives each of them a life at a coarse cadence: work and job changes, moves, marriage and partners, births, illness, aging and death. Each comes from the engines that already run those things for the town's people, never a second life engine, and each event writes the dated record those engines write, so the director, the journal and the conversation bank read it as news.

**Cause.** Design: owner ruling Nov 1, 2026 (docs/coordination/OWNER-DECISIONS.md, Nov 1 16:50: "EVERY. LIFE. IS. SIMULATED.") and the skill lives. Husks (relatives and acquaintances who live elsewhere) are reviewed by the moves, work and health engines, and not yet by partnerships and births.

**Fix.** Finish the parts: partnerships for people elsewhere, the partner taken from the counts, births for husk couples, jobs.elsewhere holding only the living, and the five-year acceptance run.

**Time box.** 2 hours for an Opus session, the closing check only; the build is in the parts, each with its own time box.

**Rules.** One engine per mechanic: a husk's job change, move, birth or death goes through the jobs, housing, people and health engines that already exist, read at a coarse cadence (monthly or by the event's own cause), never a new life simulator. No dice: events follow causes (their place's labor market, their age, health and household), with real rates checking totals only. Speed: low intensity holds the bar, so a country's year with husks simulated runs within 20% of the same year without, measured by the speed lead's method, and nothing scans every husk every day. Two-level population: a husk keeps the fields its life needs, and a full fill-in still happens only when the player meets or clicks them.

**Done when.** A second session, in a drawn place (place and seed named), runs five years of buildBenchWorld and sees every husk adult reviewed by moves, work, partnerships, births and health on their cadence, with the yearly share of husks with a life record printed beside those engines' real rates as figures to report (no quota: real rates check totals, they never set one). In three drawn places a talk with a relative opens on that news in the household-talk test (src/director/household-talk.test.ts), and `npm run speed:year` stays within 20% of its base on the same machine.

**Waits on.** Its parts: core-every-life-partners (in review), core-every-life-partner-from-counts, core-every-life-work-dead-rows, core-every-life-simulated-part-1-births-for-couples-elsewhere and core-every-life-simulated-part-2-five-year-acceptance.

**Files.** src/core2/modules/people.ts, src/core2/modules/life.ts, src/core2/modules/health.ts, src/core2/modules/jobs.ts, src/core2/modules/housing.ts, src/core2/opening-kin.ts, src/director/household-talk.test.ts

**Notes.** Filed by the CTO, Nov 1 16:50, on the owner's ruling (OWNER-DECISIONS, Nov 1 16:50). `words-talk-husk-acquaintances-empty` reads what this writes; Words words the news. Read: OWNER-DECISIONS (Oct 14 Q7, Oct 15 family talk, Oct 30 04:10, Nov 1), DECISION-REGISTER line 964 (relationships, absence), the `core-od-fill-in-outside-kin` item (done, kin kept minimal until met); searched the pool for husk, outside kin, low intensity.
Nov 1 (lives lead, lives/every-life-simulated): measured on main, Hamburg, New Jersey (3429220, drawPlace lives-a): 9 of the player's 13 relatives are husks, all at the state's record, each alone in a household, no job; one played year gave them no life record. Health already gives husks illness onsets and deaths (it indexes every living person by date). Unit 1 (moves): husks join the moves engine's monthly review. Units next: work from the place's counted workers' records; partnerships (lead: lives, CTO Nov 1; also `people-partnering-in-play`), with births for husk couples following through renewal's family.partnered reader.
Nov 2, 01:10 UTC (lives lead, the record for whoever continues): units by sub-item.

- Done: moves (`core-every-life-moves`, #7032), work (`core-every-life-work`, #7049), officials' false moves (`core-moves-state-officials-move-to-same-state`, #7055); health already gives husks illness and death.
- In review: partnerships for people elsewhere (`core-every-life-partners`, #7082, branch lives/partners, Checker 2).
- Next: `core-every-life-work-dead-rows`; `core-every-life-partner-from-counts`; town partners (`people-partnership-forms` and `people-partnership-ends`, branch lives/partners-town); orientation (`people-orientation-record`, after forms); counted partners (`people-partnership-counted` and its parts); births for couples elsewhere (renewal closes a husk couple as inactive today; no item yet); `world-community-calendar`.
- This item closes when the five-year run of its Done when passes: every husk adult reviewed by moves, work, partnerships and births, the yearly shares at those engines' rates, and the household-talk test opening on a relative's news in three drawn places (Words' side, after #7082).
- Method: the `lives` skill (#7121 brings it up to date).
  Nov 2, 01:45 UTC (lives lead, handoff): released as the parent; its units are listed in the Nov 2 01:10 note above and in the channel's ## Lives section. In review: core-every-life-partners (#7082, branch lives/partners, Checker 2). Next unit to take: core-every-life-work-dead-rows, then core-every-life-partner-from-counts, then people-partnership-forms. Branch lives/every-life-simulated is merged (#7032); a new unit takes a new branch.
