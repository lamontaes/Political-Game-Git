---
id: core-every-life-simulated-part-2-five-year-acceptance
title: "Five-year acceptance of every husk adult reviewed by the engines, and a talk that opens on news"
area: core
kind: feature
priority: 1
size: S
status: dropped
claimed-by:
pr:
after: core-every-life-simulated-part-1-births-for-couples-elsewhere, core-every-life-partners, core-every-life-partner-from-counts, core-every-life-work-dead-rows
blocked-on:
lead: lives
source: split from core-every-life-simulated in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: medium
root: rc1-world-outside-town
checked: fable 2026-11-10
---

**What.** The parent's finish line needs one run that shows the whole of it together. Over five years of the played world, every husk adult should be reviewed by the moves, work, partnerships, births and health engines on their cadence. The household talk with a relative should open on that relative's news. This part runs that check in three drawn places and files whatever is missing as items.

**Cause.** Design: owner ruling Nov 1, 2026 (docs/coordination/OWNER-DECISIONS.md, Nov 1 16:50) and the skill lives, which says how a unit is proved (the real-rate check, the played-world record, the speed bar).

**Fix.** Run the five-year acceptance in three drawn places with a script that counts, per husk adult and per engine, the reviews and the dated records written, and runs the household-talk test. File an item for any engine that did not review them.

**Time box.** 4 hours for a Sonnet session.

**Rules.** One engine per mechanic: a husk's job change, move, birth or death goes through the jobs, housing, people and health engines that already exist, read at a coarse cadence, never a new life simulator. No dice: events follow causes (their place's labor market, their age, health and household), and real rates check totals only. Speed: low intensity holds the bar, so a country's year with husks simulated runs within 20% of the same year without, and nothing scans every husk every day. One model, two tiers: a husk keeps the fields its life needs, and a full fill-in still happens only when the player meets or clicks them.

**Done when.** A second session, in three drawn places (places and seeds named), runs five years of buildBenchWorld and sees every husk adult reviewed by each of the five engines on their cadence, by record ids, and sees the household talk open on a relative's news in src/director/household-talk.test.ts. The yearly share of husks with a life record is printed beside those engines' real rates as figures to report, and `npm run speed:year` stays within 20% of base on the same machine.

**Waits on.** core-every-life-simulated-part-1-births-for-couples-elsewhere, core-every-life-partner-from-counts and core-every-life-work-dead-rows merged (core-every-life-partners is done).

**Files.** src/director/household-talk.test.ts, src/core2/modules/people.ts, src/core2/modules/jobs.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It is only the parent's own acceptance run repeated in three places; the parent keeps its Done when and the talk that opens on news.
