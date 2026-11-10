---
id: core-every-life-simulated-part-1-births-for-couples-elsewhere
title: "A couple living elsewhere has children through the same births engine"
area: core
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
after: core-every-life-partners, core-every-life-partner-from-counts
blocked-on:
lead: lives
source: split from core-every-life-simulated in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: medium
root: rc1-world-outside-town
---

**What.** Today renewal closes a husk couple as inactive, so a couple among the player's relatives who live elsewhere never has a child. Under the owner's ruling that every life is simulated at low intensity, a husk couple should have births through the same renewal engine the town's couples use, at a coarse cadence, with a dated record each time. The child joins the counts of the place where the couple lives, and the player's family tree shows the birth as news.

**Cause.** Found in code: src/core2/modules/partnerships.ts schedules and records the unions of people elsewhere, and renewal's `family.partnered` reader closes a husk couple as inactive (the lives lead's Nov 2 note in core-every-life-simulated). Design: owner ruling Nov 1, 2026 (docs/coordination/OWNER-DECISIONS.md, Nov 1 16:50).

**Fix.** Let renewal's family.partnered reader treat a husk couple as active at a coarse cadence, so a birth is written by the births engine for them with the same causes as a town couple. The child is added to the counted people of the couple's place, not as a new full person.

**Time box.** 5 hours for an Opus session.

**Rules.** One engine per mechanic: a husk's job change, move, birth or death goes through the jobs, housing, people and health engines that already exist, read at a coarse cadence, never a new life simulator. No dice: events follow causes (their place's labor market, their age, health and household), and real rates check totals only. Speed: low intensity holds the bar, so a country's year with husks simulated runs within 20% of the same year without, and nothing scans every husk every day. One model, two tiers: a husk keeps the fields its life needs, and a full fill-in still happens only when the player meets or clicks them.

**Done when.** A second session, in a drawn place with a seed it names, runs five years of buildBenchWorld and sees at least one husk couple among the player's relatives have a child, by birth record id, written by the births engine, with the child counted in the couple's place and the total population consistent. src/core2/partnerships.test.ts or a new test beside it fails when the husk couple is closed as inactive again.

**Waits on.** core-every-life-partners merged and core-every-life-partner-from-counts done.

**Files.** src/core2/modules/partnerships.ts, src/core2/modules/people.ts, src/core2/partnerships.test.ts
