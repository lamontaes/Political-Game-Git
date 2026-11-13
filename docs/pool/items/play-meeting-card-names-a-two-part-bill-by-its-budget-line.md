---
id: play-meeting-card-names-a-two-part-bill-by-its-budget-line
title: "A council bill with a budget line and a policy change shows as 'Budget Ordinance' until the vote, then as the policy repeal"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: rc10-screens-keep-own-facts
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** At the council's 6 PM meeting the card reads 'Budget Ordinance / Ordinance 2025-4 · Kelsey Garza' with Read, Speak, Yes, No, Abstain and Decide for me. The player presses Yes. The same card then reads 'Inclusionary Housing Repeal Ordinance / Ordinance 2025-4 · Vetoed / 4 yes, 1 no'. So the player voted to repeal the town's affordable-housing rule from a card that called it a budget. It happened at four meetings (2025-4 on Apr 1, 2025-7 on Jun 3, 2025-8 on Jul 1, 2025-11 on Oct 7) and once as 'Single-Family Zoning Restoration Ordinance' (2025-10, Sep 2). Seen: the meeting panel's item card before and after the press, and Politics, Bills, where both names are listed.

**Cause.** Found in code: billNameOf in src/english/bill-names.ts (line 109) names a bill 'Budget Ordinance' only while every section is a budget line, and billItem in src/bench/office.ts (line 88) shows that name on the card. The roll call's records say each of these bills carried a budget line and a policy section (for 2025-4, budget-line:police and us-policy-positions:housing-land-use.inclusionary-requirement). So the bill the card showed had only its budget line, and the policy section was in it by the roll. Which step adds the section between the card and the roll is not yet traced. Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); bill:office:gus2025:190194:council:2025-03-31:person_25a4a36657457ffe:27 (legislative-vote 2025-04-01, vetoed by person_83b19c27a9429dc2).

**Fix.** Trace where the policy section joins the bill (an amendment at take-up, or a draft that the agenda copies before it is complete). Then make the card show the bill as it will be voted, from the same bill record the roll reads. If the section is an amendment, it is shown and voted as an amendment first. Add a test where a two-part bill is on the agenda and the card's title equals the title the roll records.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Ask why: the card's name must come from the same bill record the roll reads. The simulation is the one layer that knows: the card, the roll and the Bills list read the same bill. Nothing is cast for the player on a bill they could not read.

**Done when.** A second session plays a seated council member on main in a drawn place, named with its seed, through three meetings, and every item's name on the card before the press is the name it carries after the vote and on the Bills tab.

**Waits on.** Nothing.

**Files.** src/english/bill-names.ts, src/bench/office.ts, src/core2/modules/office-day.ts, src/core2/modules/world-legislating.ts
