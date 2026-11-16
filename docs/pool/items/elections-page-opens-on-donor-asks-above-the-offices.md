---
id: elections-page-opens-on-donor-asks-above-the-offices
title: "By the second year the Elections page opens on a list of donor asks above the offices"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: low
root: none
source: Account lead played walk, Nov 16, 2026 (run-for-office-played.md, Millville PA and McMinnville TN on Train 6d12556a)
---

**What.** The Elections page's left list puts every person asking the player for money first and the offices the player can run for below them, and the page opens on the first ask. By June 2026 a new player at McMinnville, Tennessee had 27 asks of one or two dollars above Offices you can run for, so the offices are a scroll away and the page opens on a stranger's request for a dollar. The owner's complaint on Nov 16 was that there is no way to run for anything. Seen: the Elections page at McMinnville, Tennessee on June 23, 2026.

**Cause.** Found in code: the Elections page in `src/bench/play.mjs` lists the `campaignAsks` rows before the own-offices group in its left list and selects the first row on open; the ask count is not limited and has no place of its own.

**Fix.** Order the list in `src/bench/play.mjs` so Offices you can run for comes first and the asks follow under their own heading, and open the page on the first office when there is one; the asks keep the one engine that makes them.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Player-screen text (`player-screen-text`): the first thing a screen shows is what the player came for. This is a game, not a spreadsheet: a list of dollar asks never buries the way to run.

**Done when.** A second session plays a drawn place, McMinnville TN (place key 4745100) in June 2026, on main by presses only and sees Offices you can run for above the asks on the Elections page, the page open on an office, and the asks still reachable below.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs

**Notes.** Account lead, Nov 16. The walk and its screenshots are in /mnt/project-files/account-lead/reports/run-for-office-played.md.
